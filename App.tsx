
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SURAHS_REGISTRY } from './constants';
import { Surah, Question } from './types';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import LandingPage from './components/LandingPage';

interface SurahProgress {
  activeIndex: number;
  correctIds: string[];
}

interface MultiSurahState {
  currentSurahId: number;
  progress: Record<number, SurahProgress>;
}

const getInitialProgress = () => {
    const initialProgress: Record<number, SurahProgress> = {};
    SURAHS_REGISTRY.forEach(s => {
      initialProgress[s.id] = { activeIndex: 0, correctIds: [] };
    });
    
    return {
      currentSurahId: SURAHS_REGISTRY[0].id,
      progress: initialProgress
    };
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [state, setState] = useState<MultiSurahState>(getInitialProgress);

  // Load user data when user is available
  useEffect(() => {
    const loadUserData = async () => {
      if (!user?.email) {
        setHasLoadedInitialData(false);
        return;
      }
      
      const userKey = `quran_furqan_progress_${user.email}`;
      
      // Fetch from Supabase on refresh/login
      setIsDataLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_progress')
          .select('progress_data')
          .eq('email', user.email)
          .single();

        if (data?.progress_data) {
          setState(data.progress_data);
          localStorage.setItem(userKey, JSON.stringify(data.progress_data));
        } else {
          // If not in Supabase, check local storage as backup
          const saved = localStorage.getItem(userKey);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              setState(parsed);
            } catch (e) {
              setState(getInitialProgress());
            }
          } else {
            setState(getInitialProgress());
          }
        }
      } catch (err) {
        console.error("Error fetching from Supabase", err);
        const saved = localStorage.getItem(userKey);
        if (saved) {
          try {
            setState(JSON.parse(saved));
          } catch (e) {
            setState(getInitialProgress());
          }
        }
      } finally {
        setIsDataLoading(false);
        setHasLoadedInitialData(true);
      }
    };

    loadUserData();
  }, [user?.email]);

  // Check for first-time instructions
  useEffect(() => {
    if (user?.email) {
      const instructionsKey = `quran_furqan_instructions_viewed_${user.email}`;
      const viewed = localStorage.getItem(instructionsKey);
      if (!viewed) {
        setIsInstructionsOpen(true);
      }
    }
  }, [user]);

  const markInstructionsViewed = () => {
    if (user?.email) {
      const instructionsKey = `quran_furqan_instructions_viewed_${user.email}`;
      localStorage.setItem(instructionsKey, 'true');
      setIsInstructionsOpen(false);
    }
  };

  // Persist user data to local storage
  useEffect(() => {
    if (user?.email) {
      const userKey = `quran_furqan_progress_${user.email}`;
      localStorage.setItem(userKey, JSON.stringify(state));
    }
  }, [state, user]);

  // Sync to Supabase every 1 minute
  useEffect(() => {
    if (!user?.email || !hasLoadedInitialData) return;

    const syncToSupabase = async () => {
      // Fetch the latest state from local storage to ensure we're syncing what the user has locally
      const userKey = `quran_furqan_progress_${user.email}`;
      const saved = localStorage.getItem(userKey);
      if (!saved) return;

      try {
        const { error } = await supabase
          .from('user_progress')
          .upsert({ 
            email: user.email, 
            progress_data: JSON.parse(saved),
            last_synced: new Date().toISOString()
          }, { onConflict: 'email' });
        
        if (error) console.error('Supabase Sync Error:', error.message);
        else console.log('Progress synced to cloud');
      } catch (err) {
        console.error('Failed to sync with Supabase:', err);
      }
    };

    const interval = setInterval(syncToSupabase, 60000); // 60,000ms = 1 minute
    
    return () => clearInterval(interval);
  }, [user?.email, hasLoadedInitialData]);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) console.error('Error signing in:', error.message);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const [currentSurahData, setCurrentSurahData] = useState<Surah | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReviewShareModalOpen, setIsReviewShareModalOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'success'>('idle');
  const [isGeneratingReviewImage, setIsGeneratingReviewImage] = useState(false);
  const [isActionDisabled, setIsActionDisabled] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const reviewShareCardRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const questionRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Handle clicking outside of dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Fetch Chapter Data Dynamically
  useEffect(() => {
    const fetchChapter = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`./data/chapter${state.currentSurahId}.json`);
        if (!response.ok) throw new Error('Failed to load chapter');
        const data = await response.json();
        setCurrentSurahData(data);
      } catch (err) {
        console.error("Error loading chapter data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChapter();
  }, [state.currentSurahId]);

  const currentProgress = state.progress[state.currentSurahId] || { activeIndex: 0, correctIds: [] };

  const globalProgress = useMemo(() => {
    let totalQuestions = 0;
    let answeredQuestions = 0;
    SURAHS_REGISTRY.forEach(s => {
      totalQuestions += s.totalQuestions;
      const prog = state.progress[s.id];
      if (prog) {
        answeredQuestions += Math.min(prog.activeIndex, s.totalQuestions);
      }
    });
    return totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
  }, [state.progress]);

  const stats = useMemo(() => {
    if (!currentSurahData) return { total: 0, correctCount: 0, notSureCount: 0, progress: 0, isCompleted: false };
    const total = currentSurahData.questions.length;
    const correctCount = currentSurahData.questions.filter(q => currentProgress.correctIds.includes(q.id)).length;
    const answeredCount = currentProgress.activeIndex;
    const isCompleted = currentProgress.activeIndex >= total;
    const notSureCount = Math.max(0, (isCompleted ? total : answeredCount) - correctCount);
    const progressPerc = Math.round((currentProgress.activeIndex / total) * 100);
    return { total, correctCount, notSureCount, progress: Math.min(progressPerc, 100), isCompleted };
  }, [currentSurahData, currentProgress]);

  const getSurahProgressPercent = (surahId: number) => {
    const registryItem = SURAHS_REGISTRY.find(s => s.id === surahId);
    const prog = state.progress[surahId];
    if (!registryItem || !prog) return 0;
    return Math.round((Math.min(prog.activeIndex, registryItem.totalQuestions) / registryItem.totalQuestions) * 100);
  };

  const selectSurah = (id: number) => {
    setState(prev => ({ ...prev, currentSurahId: id }));
    setSelectedQuestionIndex(null);
    setIsDropdownOpen(false);
  };

  const navigateSurah = (direction: 'next' | 'prev') => {
    const currentIndex = SURAHS_REGISTRY.findIndex(s => s.id === state.currentSurahId);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0) nextIndex = SURAHS_REGISTRY.length - 1;
    if (nextIndex >= SURAHS_REGISTRY.length) nextIndex = 0;
    selectSurah(SURAHS_REGISTRY[nextIndex].id);
  };

  const navigateReview = (direction: 'next' | 'prev') => {
    if (!currentSurahData) return;
    const total = currentSurahData.questions.length;
    let nextIdx = direction === 'next' ? reviewIdx + 1 : reviewIdx - 1;
    if (nextIdx < 0) nextIdx = total - 1;
    if (nextIdx >= total) nextIdx = 0;
    setReviewIdx(nextIdx);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isReviewOpen) {
        if (e.key === 'ArrowRight') navigateReview('next');
        if (e.key === 'ArrowLeft') navigateReview('prev');
        if (e.key === 'Escape') setIsReviewOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReviewOpen, reviewIdx, currentSurahData]);

  const handleResponse = (isCorrect: boolean) => {
    if (!currentSurahData || isActionDisabled) return;

    setIsActionDisabled(true);
    setTimeout(() => setIsActionDisabled(false), 1000);

    const targetIdx = selectedQuestionIndex !== null ? selectedQuestionIndex : currentProgress.activeIndex;
    const question = currentSurahData.questions[targetIdx];
    
    if (!question) return;

    setState(prev => {
      const surahId = prev.currentSurahId;
      const oldProg = prev.progress[surahId];
      let newCorrectIds = [...oldProg.correctIds];

      if (isCorrect) {
        if (!newCorrectIds.includes(question.id)) newCorrectIds.push(question.id);
      } else {
        newCorrectIds = newCorrectIds.filter(id => id !== question.id);
      }

      const isAnsweringCurrent = selectedQuestionIndex === null || selectedQuestionIndex === oldProg.activeIndex;
      const nextIndex = isAnsweringCurrent 
        ? Math.min(oldProg.activeIndex + 1, currentSurahData.questions.length)
        : oldProg.activeIndex;

      // Show completion popup if just finished
      if (nextIndex === currentSurahData.questions.length && oldProg.activeIndex < currentSurahData.questions.length) {
        setShowCompletionPopup(true);
      }

      return {
        ...prev,
        progress: {
          ...prev.progress,
          [surahId]: { activeIndex: nextIndex, correctIds: newCorrectIds }
        }
      };
    });

    if (selectedQuestionIndex !== null) setSelectedQuestionIndex(null);
  };

  const handleShare = async () => {
    if (!shareCardRef.current) return;
    setIsGeneratingImage(true);
    setShareStatus('idle');
    try {
      // @ts-ignore
      const { toPng } = await import('html-to-image');
      
      // Ensure fonts and images are loaded
      await document.fonts.ready;
      
      // Wait a bit for potential layout shifts
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dataUrl = await toPng(shareCardRef.current, { 
        quality: 1, 
        pixelRatio: 3,
        backgroundColor: '#0a0a0a',
        cacheBust: true,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
      });

      const link = document.createElement('a');
      link.download = `quranfurqan-progress.png`;
      link.href = dataUrl;
      link.click();
      
      setShareStatus('success');
      setTimeout(() => setShareStatus('idle'), 3000);
    } catch (err) {
      console.error('Failed to generate image:', err);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleReviewShare = async () => {
    if (!reviewShareCardRef.current) return;
    setIsGeneratingReviewImage(true);
    try {
      // @ts-ignore
      const { toPng } = await import('html-to-image');
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dataUrl = await toPng(reviewShareCardRef.current, { 
        quality: 1, 
        pixelRatio: 3,
        backgroundColor: '#0a0a0a',
        cacheBust: true,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
      });

      const link = document.createElement('a');
      link.download = `quranfurqan-review-ch${currentRegistryItem.id}-q${reviewIdx + 1}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate review image:', err);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsGeneratingReviewImage(false);
      setTimeout(() => setIsReviewShareModalOpen(false), 500);
    }
  };

  useEffect(() => {
    if (!isLoading && selectedQuestionIndex === null) {
      if (stats.isCompleted) {
        mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const target = currentProgress.activeIndex;
        questionRefs.current[target]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentProgress.activeIndex, selectedQuestionIndex, stats.isCompleted, isLoading, state.currentSurahId]);

  const currentRegistryItem = useMemo(() => 
    SURAHS_REGISTRY.find(s => s.id === state.currentSurahId) || SURAHS_REGISTRY[0],
    [state.currentSurahId]
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0a0a] text-zinc-300 relative overflow-hidden selection:bg-emerald-500/20 font-sans tracking-tight">
      
      {isAuthLoading || isDataLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <p className="text-[10px] font-premium font-bold uppercase tracking-[0.3em] text-zinc-500">
            {isAuthLoading ? 'Checking Authentication...' : 'Syncing Your Progress...'}
          </p>
        </div>
      ) : !user ? (
        <LandingPage onSignIn={handleGoogleSignIn} />
      ) : (
        <>
          {/* Top User Info Strip */}
          <div className="w-full bg-[#0d0d0d] border-b border-white/[0.05] px-4 md:px-6 py-3 md:py-4 flex justify-center items-center z-[60]">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 w-full relative">
              <div className="flex items-center gap-4">
                {user.user_metadata?.avatar_url && !profileImageError ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt="Profile" 
                    className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-white/10" 
                    onError={() => setProfileImageError(true)}
                  />
                ) : (
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <span className="text-xs md:text-sm font-bold text-zinc-400">{(user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()}</span>
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-sm md:text-base font-premium font-semibold text-white leading-tight tracking-tight">
                    {user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] md:text-[11px] font-premium font-medium text-emerald-400/80 uppercase tracking-[0.15em] md:tracking-[0.2em] mt-1">
                    {globalProgress}% Completed
                  </span>
                </div>
              </div>
              
              <div className="hidden md:block w-px h-8 bg-white/10" />
              
              <div className="flex items-center gap-2 md:gap-3">
                <button 
                  onClick={() => setIsShareModalOpen(true)}
                  className="px-4 md:px-5 py-2 md:py-2.5 bg-white/5 border border-white/10 text-zinc-300 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-full transition-all flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span className="text-[10px] md:text-xs font-premium font-bold uppercase tracking-[0.1em] md:tracking-[0.2em]">Share</span>
                </button>

                <button onClick={handleSignOut} className="px-4 md:px-5 py-2 md:py-2.5 bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 rounded-full transition-all flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  <span className="text-[10px] md:text-xs font-premium font-bold uppercase tracking-[0.1em] md:tracking-[0.2em]">Logout</span>
                </button>
              </div>

              {/* Help Button - Top Right */}
              <button 
                onClick={() => {
                  setCurrentSlide(0);
                  setIsInstructionsOpen(true);
                }}
                className="absolute right-0 top-0 text-zinc-500 hover:text-emerald-400 transition-all text-[10px] font-premium font-bold uppercase tracking-[0.2em]"
              >
                Help
              </button>
            </div>
      </div>

      {/* Header */}
      <header className="glass-panel sticky top-0 z-50 px-4 md:px-8 py-4 md:py-5 flex items-center justify-between">
        <button onClick={() => navigateSurah('prev')} className="p-2 md:p-2.5 text-zinc-500 hover:text-white transition-all duration-300 hover:bg-white/5 rounded-full">
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
        </button>

        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex flex-col items-center text-center group">
            <div className="flex items-center gap-2 md:gap-3">
              <span className="text-2xl md:text-3xl font-arabic text-white leading-none">{currentRegistryItem.arabicName}</span>
              <span className="text-lg md:text-xl font-premium font-medium text-white tracking-tight">{currentRegistryItem.englishName}</span>
              <svg className={`w-3.5 h-3.5 md:w-4 md:h-4 text-zinc-500 transition-transform duration-500 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" /></svg>
            </div>
            <span className="text-[10px] md:text-[11px] text-zinc-400 font-premium font-semibold uppercase tracking-[0.2em] md:tracking-[0.25em] mt-1.5 md:mt-2">{currentRegistryItem.id}. {currentRegistryItem.translation}</span>
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-6 w-80 bg-[#0d0d0d] border border-white/[0.08] rounded-[24px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.7)] animate-in fade-in slide-in-from-top-4 duration-300 z-[100]">
              <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
              {SURAHS_REGISTRY.map(s => {
                const p = getSurahProgressPercent(s.id);
                return (
                    <button key={s.id} onClick={() => selectSurah(s.id)} className={`w-full px-6 py-5 flex items-center justify-between hover:bg-white/[0.05] transition-all border-b border-white/[0.03] last:border-0 ${s.id === state.currentSurahId ? 'bg-white/[0.03]' : ''}`}>
                    <div className="text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold tracking-tighter ${s.id === state.currentSurahId ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>{p}%</span>
                          <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-[0.2em]">{s.totalQuestions} Questions</span>
                        </div>
                        <p className={`text-base font-premium font-semibold ${s.id === state.currentSurahId ? 'text-white' : 'text-zinc-200'}`}>{s.englishName}</p>
                        <p className={`text-[11px] font-premium uppercase tracking-wider mt-0.5 ${s.id === state.currentSurahId ? 'text-zinc-400' : 'text-zinc-500'}`}>{s.translation}</p>
                      </div>
                      <span className={`text-2xl font-arabic transition-colors ${s.id === state.currentSurahId ? 'text-white' : 'text-zinc-500'}`}>{s.arabicName}</span>
                  </button>
                );
              })}
              </div>
            </div>
          )}
        </div>

        <button onClick={() => navigateSurah('next')} className="p-2.5 text-zinc-500 hover:text-white transition-all duration-300 hover:bg-white/5 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
        </button>
      </header>

      {/* Stats Dashboard */}
      <div className="bg-[#080808]/80 backdrop-blur-md border-b border-white/[0.08] py-3 md:py-4 px-4 md:px-6 flex flex-wrap items-center justify-center gap-6 md:gap-16 text-[9px] md:text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-zinc-400 z-40 relative">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-zinc-500">Total</span>
          <span className="text-white text-xs md:text-sm font-bold tracking-tight">{stats.total}</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-emerald-500/70">Correct</span>
          <span className="text-emerald-400 text-xs md:text-sm font-bold tracking-tight">{stats.correctCount}</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-amber-500/70">Not Sure</span>
          <span className="text-amber-400 text-xs md:text-sm font-bold tracking-tight">{stats.notSureCount}</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-blue-500/70">Progress</span>
          <span className="text-blue-400 text-xs md:text-sm font-bold tracking-tight">{stats.progress}%</span>
        </div>
      </div>

      {/* Top Fade Gradient Overlay */}
      <div className="fixed top-[136px] left-0 right-0 h-32 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent pointer-events-none z-30" />

      {/* Main Flow */}
      <main 
        ref={mainRef} 
        onClick={() => setSelectedQuestionIndex(null)}
        className="flex-1 overflow-y-auto no-scrollbar px-6 md:px-32 lg:px-[25%] py-8 select-none"
      >
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center animate-pulse gap-6">
            <div className="w-10 h-10 rounded-full border border-emerald-500/20 border-t-emerald-500/80 animate-spin" />
            <p className="text-[10px] font-premium font-medium uppercase tracking-[0.3em] text-zinc-600">Syncing Verse Insights...</p>
          </div>
        ) : currentSurahData && (
          <>
            {stats.isCompleted && (
              <div className="flex justify-center mb-10 animate-in fade-in slide-in-from-top-4 duration-1000">
                <div className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-full flex items-center gap-3">
                  <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-zinc-400">Tip: Double click any question to review answer</p>
                </div>
              </div>
            )}

            <div className="relative text-[1.25rem] md:text-[1.4rem] font-light text-justify leading-[1.8] tracking-tight">
              {currentSurahData.questions.map((q, idx) => {
              const isCorrect = currentProgress.correctIds.includes(q.id);
              const isPast = idx < currentProgress.activeIndex;
              const isActive = idx === currentProgress.activeIndex;
              const isSelected = selectedQuestionIndex === idx;
              const isFuture = idx > currentProgress.activeIndex;

              let colorClass = "text-zinc-400/70";
              if (isPast) {
                colorClass = isCorrect ? "text-emerald-500/80" : "text-amber-500/80";
              } else if (isActive) {
                colorClass = "text-white";
              } else {
                colorClass = "text-zinc-400/45";
              }

              return (
                <React.Fragment key={q.id}>
                  <span className="inline-flex items-center justify-center align-middle mx-2">
                    <span className={`
                      w-8 h-8 rounded-full border flex items-center justify-center text-[13px] font-premium font-bold transition-all duration-700 select-none
                      ${isActive ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 
                        isPast ? (isCorrect ? 'border-emerald-500/40 text-emerald-500/60 bg-emerald-500/5' : 'border-amber-500/40 text-amber-500/60 bg-amber-500/5') : 
                        'border-white/20 text-zinc-400 bg-white/[0.05]'}
                    `}>
                      {idx + 1}
                    </span>
                  </span>

                  <span
                    ref={(el) => { questionRefs.current[idx] = el; }}
                    onClick={(e) => {
                      if (isFuture) return;
                      e.stopPropagation();
                      setSelectedQuestionIndex(idx);
                    }}
                    onDoubleClick={() => {
                      if (stats.isCompleted) {
                        setReviewIdx(idx);
                        setIsReviewOpen(true);
                      }
                    }}
                    className={`
                      question-span transition-all duration-700 px-2 py-1.5 rounded-xl inline decoration-emerald-500/20 underline-offset-8
                      ${!isFuture ? 'cursor-pointer' : 'cursor-default'}
                      ${colorClass}
                      ${isActive ? 'bg-white/10 border border-white/20 shadow-[0_0_25px_rgba(255,255,255,0.05)]' : ''}
                      ${isSelected && !isActive ? 'bg-white/5 border border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : ''}
                    `}
                  >
                    {q.text}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        </>
      )}
        <div className="h-64" />
      </main>

      {/* Bottom Fade Gradient Overlay */}
      <div className="fixed bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent pointer-events-none z-30" />

      {/* Floating Controls */}
      <div className="fixed bottom-10 md:bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-4 md:gap-8 z-40 w-full max-w-[90%] md:max-w-none justify-center">
        {!stats.isCompleted || selectedQuestionIndex !== null ? (
          <>
            <button
              onClick={() => handleResponse(false)}
              disabled={isActionDisabled}
              className={`flex-1 font-bold md:flex-none px-6 md:px-12 py-4 md:py-5 bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-full text-zinc-300 text-[9px] md:text-[10px] font-premium font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30 transition-all duration-500 active:scale-[0.98] shadow-2xl md:min-w-[160px] ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Not Sure
            </button>

            <button
              onClick={() => handleResponse(true)}
              disabled={isActionDisabled}
              className={`flex-1 md:flex-none px-6 md:px-12 py-4 md:py-5 bg-white text-black rounded-full text-[9px] md:text-[10px] font-premium font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] hover:bg-emerald-50 transition-all duration-500 active:scale-[0.98] shadow-[0_20px_40px_rgba(255,255,255,0.1)] md:min-w-[160px] ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              I know this
            </button>
          </>
        ) : (
          <button
            onClick={() => navigateSurah('next')}
            className="w-full md:w-auto px-10 md:px-16 py-4 md:py-5 bg-white text-black rounded-full text-[9px] md:text-[10px] font-premium font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] hover:bg-emerald-50 transition-all duration-500 active:scale-[0.98] shadow-[0_20px_40px_rgba(255,255,255,0.1)] md:min-w-[280px] flex items-center justify-center gap-3 md:gap-4"
          >
            Next Chapter
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        )}
      </div>

      {/* Review Modal */}
      {isReviewOpen && currentSurahData && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsReviewOpen(false)} />
          <div className="relative w-full max-w-2xl bg-[#0d0d0d] border border-white/[0.1] rounded-[40px] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="p-6 md:p-12 flex flex-col h-[650px] max-h-[90vh]">
              {/* Review Header with Chapter Info */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-6 md:gap-0 mb-8 md:mb-10 flex-shrink-0">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-premium font-bold uppercase tracking-[0.3em] text-emerald-400">Review Answers</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-zinc-500">Chapter {currentRegistryItem.id}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl md:text-3xl font-arabic text-white leading-none">{currentRegistryItem.arabicName}</span>
                    <span className="text-lg md:text-xl font-premium font-medium text-white tracking-tight">{currentRegistryItem.englishName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => setIsReviewShareModalOpen(true)}
                    className="flex-1 md:flex-none px-4 md:px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2.5 group"
                  >
                    <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span className="text-[10px] font-premium font-bold uppercase tracking-[0.2em]">Share Answer</span>
                  </button>
                  <button onClick={() => setIsReviewOpen(false)} className="p-3 text-zinc-500 hover:text-white transition-colors rounded-2xl hover:bg-white/5">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar mb-8 md:mb-10">
                <div className="space-y-6 md:space-y-8">
                  <div className="p-6 md:p-8 bg-white/[0.03] border border-white/[0.05] rounded-[24px] md:rounded-[32px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <p className="text-xs md:text-sm font-premium font-bold uppercase tracking-[0.2em] text-white">Question {reviewIdx + 1} of {currentSurahData.questions.length}</p>
                      </div>
                      
                      {/* User Status Badge */}
                      <div className={`px-3 py-1 rounded-full border text-[9px] font-premium font-bold uppercase tracking-wider ${
                        currentProgress.correctIds.includes(currentSurahData.questions[reviewIdx].id)
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}>
                        {currentProgress.correctIds.includes(currentSurahData.questions[reviewIdx].id)
                          ? 'You knew this answer'
                          : 'You were not sure about this'}
                      </div>
                    </div>
                    <p className="text-base md:text-lg text-zinc-400 font-light leading-relaxed italic">
                      "{currentSurahData.questions[reviewIdx].text}"
                    </p>
                  </div>

                  <div className="space-y-4 px-2 md:px-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-px bg-emerald-500/30" />
                      <p className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-emerald-500">Answer</p>
                    </div>
                    <p className="text-lg md:text-xl text-white font-light leading-relaxed">
                      {currentSurahData.questions[reviewIdx].answer}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 md:pt-8 border-t border-white/[0.05] flex-shrink-0">
                <button 
                  onClick={() => navigateReview('prev')}
                  className="p-3 md:p-4 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex flex-col items-center">
                   <p className="text-[9px] md:text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-zinc-600">Navigate</p>
                </div>
                <button 
                  onClick={() => navigateReview('next')}
                  className="p-3 md:p-4 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chapter Completion Popup */}
      {showCompletionPopup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowCompletionPopup(false)} />
          <div className="relative w-full max-w-sm bg-[#0d0d0d] border border-emerald-500/20 rounded-[40px] p-10 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-8 mx-auto ring-1 ring-emerald-500/20">
              <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-2xl font-premium font-semibold text-white mb-4 tracking-tight">BarakAllah!</h3>
            <p className="text-zinc-500 text-sm leading-relaxed mb-8">
              You've completed this chapter. You can now double-click any question to review its detailed answer.
            </p>
            <button 
              onClick={() => setShowCompletionPopup(false)}
              className="w-full py-4 bg-white text-black rounded-2xl text-xs font-premium font-bold uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      <div className="fixed -bottom-64 -left-64 w-[800px] h-[800px] bg-emerald-500/[0.03] rounded-full blur-[160px] -z-10 pointer-events-none"></div>
      <div className="fixed -top-64 -right-64 w-[800px] h-[800px] bg-white/[0.02] rounded-full blur-[160px] -z-10 pointer-events-none"></div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsShareModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-[#0d0d0d] border border-white/[0.1] rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="p-8">
              <h3 className="text-xl font-premium font-semibold text-white mb-2 tracking-tight">Share Progress</h3>
              <p className="text-sm text-zinc-500 mb-8 font-light">Generate a beautiful card to share with friends.</p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleShare()}
                  disabled={isGeneratingImage || shareStatus === 'success'}
                  className={`w-full py-4 rounded-2xl text-xs font-premium font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-50 ${
                    shareStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-white text-black hover:bg-zinc-200'
                  }`}
                >
                  {isGeneratingImage ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : shareStatus === 'success' ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      Downloaded!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Image
                    </>
                  )}
                </button>
                
                <button 
                  onClick={() => setIsShareModalOpen(false)}
                  className="w-full py-4 text-zinc-600 text-[10px] font-premium font-bold uppercase tracking-[0.2em] hover:text-zinc-400 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Answer Share Modal */}
      {isReviewShareModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsReviewShareModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-[#0d0d0d] border border-white/[0.1] rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="p-8">
              <h3 className="text-xl font-premium font-semibold text-white mb-2 tracking-tight">Share Answer</h3>
              <p className="text-sm text-zinc-500 mb-8 font-light">Generate a beautiful card for this specific insight.</p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleReviewShare()}
                  disabled={isGeneratingReviewImage}
                  className={`w-full py-4 rounded-2xl text-xs font-premium font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-50 bg-white text-black hover:bg-zinc-200`}
                >
                  {isGeneratingReviewImage ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Answer Image
                    </>
                  )}
                </button>
                
                <button 
                  onClick={() => setIsReviewShareModalOpen(false)}
                  className="w-full py-4 text-zinc-600 text-[10px] font-premium font-bold uppercase tracking-[0.2em] hover:text-zinc-400 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Instructions Modal */}
      {isInstructionsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
          <div className="relative w-full max-w-lg bg-[#0d0d0d] border border-white/[0.08] rounded-[40px] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-500 flex flex-col min-h-[500px]">
            {/* Slide Progress Dots */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${i === currentSlide ? 'bg-emerald-400 w-6' : 'bg-white/10'}`} />
              ))}
            </div>

            <div className="flex-1 p-10 pt-20 flex flex-col items-center text-center">
              {currentSlide === 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-8 mx-auto ring-1 ring-emerald-500/20">
                    <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.584.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-premium font-light text-white mb-4 tracking-tight">Welcome to QuranFurqan</h2>
                  <p className="text-zinc-500 leading-relaxed font-light mb-6">
                    Assess and deepen your understanding of the Quran through structured quiz questions designed for meaningful reflection.
                  </p>
                  <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 inline-block">
                    <p className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-emerald-400">Deep Assessment, Not Just Reading</p>
                  </div>
                </div>
              )}

              {currentSlide === 1 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mb-8 mx-auto ring-1 ring-amber-500/20">
                    <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-premium font-light text-white mb-4 tracking-tight">How it Works</h2>
                  <p className="text-zinc-500 leading-relaxed font-light mb-8">
                    You're displayed a set of questions for each chapter. Use the buttons below based on your understanding:
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">I Know This</p>
                      <p className="text-xs text-zinc-400 font-light">Confirm your mastery of this question's concept.</p>
                    </div>
                    <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                      <p className="text-[10px] font-bold text-amber-400 uppercase mb-1">Not Sure</p>
                      <p className="text-xs text-zinc-400 font-light">Indicate you need more study on this point.</p>
                    </div>
                  </div>
                </div>
              )}

              {currentSlide === 2 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mb-8 mx-auto ring-1 ring-blue-500/20">
                    <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-premium font-light text-white mb-4 tracking-tight">Update Previous Questions</h2>
                  <p className="text-zinc-500 leading-relaxed font-light mb-8">
                    Click on any previous question to select it, then update its status using the buttons at the bottom.
                  </p>
                  <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 inline-block">
                    <p className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-blue-400">Modify Your Progress Anytime</p>
                  </div>
                </div>
              )}

              {currentSlide === 3 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full">
                  <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-8 mx-auto ring-1 ring-indigo-500/20">
                    <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-premium font-light text-white mb-4 tracking-tight">Chapter Insights</h2>
                  <div className="space-y-4 text-left">
                    <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/[0.03]">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5" />
                      <p className="text-xs text-zinc-400 font-light leading-relaxed">
                        <span className="text-white font-medium uppercase text-[10px] block mb-0.5">Chapter Stats</span> 
                        The dashboard tracks Total Questions, Correct, and Not Sure specifically for the current chapter.
                      </p>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/[0.03]">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5" />
                      <p className="text-xs text-zinc-400 font-light leading-relaxed">
                        <span className="text-white font-medium uppercase text-[10px] block mb-0.5">Overall Progress</span> 
                        The percentage under your name reflects your Overall Quran Progress across all chapters combined.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {currentSlide === 4 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center mb-8 mx-auto ring-1 ring-purple-500/20">
                    <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-premium font-light text-white mb-4 tracking-tight">Review Knowledge</h2>
                  <p className="text-zinc-500 leading-relaxed font-light mb-8">
                    Once a chapter is 100% complete, you can double-click any question to review its detailed answer and gain deeper insights.
                  </p>
                  <div className="p-4 bg-purple-500/5 rounded-2xl border border-purple-500/10 inline-block">
                    <p className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-purple-400">Deepen Your Study Post-Quiz</p>
                  </div>
                </div>
              )}

              {currentSlide === 5 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-8 mx-auto ring-1 ring-emerald-500/20">
                    <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-premium font-light text-white mb-4 tracking-tight">Share Your Journey</h2>
                  <p className="text-zinc-500 leading-relaxed font-light mb-8">
                    Inspire others by sharing your progress. Click the Share button to generate a beautiful card of your achievements.
                  </p>
                  <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 inline-block">
                    <p className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-emerald-400">Invite Others to Reflection</p>
                  </div>
                </div>
              )}

              {currentSlide === 6 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-8 mx-auto ring-1 ring-emerald-500/20">
                    <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-premium font-light text-white mb-4 tracking-tight">Seek True Knowledge</h2>
                  <p className="text-zinc-500 leading-relaxed font-light mb-8">
                    Your progress is preserved in the cloud. Continue your journey of self-assessment and reflection every day.
                  </p>
                  <div className="px-8 py-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[24px]">
                    <p className="text-lg font-arabic text-emerald-400 mb-3 leading-loose">وَقُل رَّبِّ زِدْنِي عِلْمًا</p>
                    <p className="text-[11px] font-premium text-zinc-400 font-medium uppercase tracking-[0.1em]">"And say: My Lord, increase me in knowledge."</p>
                    <p className="text-[9px] text-zinc-500 mt-2 tracking-widest">[Surah Taha 20:114]</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Buttons */}
            <div className="p-10 flex gap-4">
              {currentSlide > 0 ? (
                <button 
                  onClick={() => setCurrentSlide(prev => prev - 1)}
                  className="flex-1 py-4 border border-white/10 rounded-2xl text-xs font-premium font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                >
                  Back
                </button>
              ) : null}
              
              {currentSlide < 6 ? (
                <button 
                  onClick={() => setCurrentSlide(prev => prev + 1)}
                  className="flex-[2] py-4 bg-white text-black rounded-2xl text-xs font-premium font-bold uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all shadow-xl"
                >
                  Next Step
                </button>
              ) : (
                <button 
                  onClick={markInstructionsViewed}
                  className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl text-xs font-premium font-bold uppercase tracking-[0.2em] hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20"
                >
                  Start Assessment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden Share Card for Image Generation */}
      <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none">
        <div 
          ref={shareCardRef}
          className="w-[540px] p-12 bg-[#0a0a0a] text-zinc-300 font-sans relative overflow-hidden flex flex-col items-center"
        >
          {/* Background Decor */}
          <div className="absolute top-[-50px] right-[-50px] w-[300px] h-[300px] bg-emerald-500/[0.06] rounded-full blur-[80px] -z-10" />
          <div className="absolute bottom-[-50px] left-[-50px] w-[300px] h-[300px] bg-white/[0.01] rounded-full blur-[80px] -z-10" />
          
          {/* Branding Header */}
          <div className="w-full flex justify-between items-center mb-10 pb-6 border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.976 8.976 0 00-1.318.236 1 1 0 01-1.091-.637 2.993 2.993 0 00-.816-1.112c-.4-.307-.862-.533-1.352-.667z" />
            </svg>
          </div>
              <span className="text-2xl font-premium font-bold text-white tracking-tight">QuranFurqan</span>
            </div>
            <p className="text-[10px] font-premium font-bold uppercase tracking-[0.3em] text-zinc-500">Progress Card</p>
          </div>

          {/* User Profile Card */}
          {user && (
            <div className="w-full flex items-center gap-5 mb-10 bg-white/[0.02] border border-white/[0.05] p-6 rounded-[24px]">
              {user.user_metadata?.avatar_url && !profileImageError ? (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="Profile" 
                  crossOrigin="anonymous"
                  className="w-12 h-12 rounded-full border border-white/10 shadow-lg" 
                  onError={() => setProfileImageError(true)}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-emerald-400">{(user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()}</span>
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-lg font-premium font-semibold text-white tracking-tight leading-tight">
                  {user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]}
                </span>
              </div>
            </div>
          )}
          
          {/* Current Chapter Section */}
          <div className="w-full mb-10 text-center">
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-emerald-400">Chapter {currentRegistryItem.id}</p>
             </div>
             <div className="flex flex-col items-center gap-1">
               <h1 className="text-4xl font-premium font-light text-white tracking-tighter">{currentRegistryItem.englishName}</h1>
               <span className="text-3xl font-arabic text-emerald-400/90">{currentRegistryItem.arabicName}</span>
             </div>
          </div>
          
                    {/* Main Stats Grid */}
                    <div className="w-full grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[24px] flex flex-col gap-6">
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-premium font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">Correct</span>
                            <span className="text-4xl font-premium font-bold text-emerald-400">{stats.correctCount}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-premium font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">Not Sure</span>
                            <span className="text-4xl font-premium font-bold text-amber-400">{stats.notSureCount}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[24px] flex flex-col justify-between">
                        <div className="flex flex-col">
                          <p className="text-[10px] font-premium font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">Total Questions</p>
                          <p className="text-4xl font-premium font-bold text-white leading-none">{stats.total}</p>
                        </div>
                      </div>
                    </div>
          
          {/* Total Journey Progress */}
          <div className="w-full bg-white/[0.03] border border-white/[0.08] p-8 rounded-[32px] mb-12 relative overflow-hidden">
             <div className="flex justify-between items-end mb-5">
                <p className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-zinc-400">Overall Quran Progress</p>
                <p className="text-2xl font-premium font-bold text-emerald-400">{globalProgress}%</p>
             </div>
             <div className="w-full h-2.5 bg-white/[0.05] rounded-full overflow-hidden border border-white/[0.05] p-0.5">
                <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${globalProgress}%` }} />
             </div>
          </div>
          
          {/* Minimal Call to Action */}
          <div className="w-full pt-8 border-t border-white/[0.05] text-center">
            <p className="text-[10px] font-premium font-bold uppercase tracking-[0.4em] text-zinc-400 mb-3">Begin your assessment at</p>
            <p className="text-2xl font-premium font-semibold text-white tracking-tight">https://quranfurqan.web.app</p>
          </div>
        </div>
      </div>

      {/* Hidden Review Share Card for Image Generation */}
      <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none">
        <div 
          ref={reviewShareCardRef}
          className="w-[540px] p-12 bg-[#0a0a0a] text-zinc-300 font-sans relative overflow-hidden flex flex-col items-center"
        >
          {/* Background Decor */}
          <div className="absolute top-[-50px] right-[-50px] w-[300px] h-[300px] bg-emerald-500/[0.06] rounded-full blur-[80px] -z-10" />
          <div className="absolute bottom-[-50px] left-[-50px] w-[300px] h-[300px] bg-white/[0.01] rounded-full blur-[80px] -z-10" />
          
          {/* Branding Header */}
          <div className="w-full flex justify-between items-center mb-10 pb-6 border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.976 8.976 0 00-1.318.236 1 1 0 01-1.091-.637 2.993 2.993 0 00-.816-1.112c-.4-.307-.862-.533-1.352-.667z" />
                </svg>
              </div>
              <span className="text-2xl font-premium font-bold text-white tracking-tight">QuranFurqan</span>
            </div>
            <p className="text-[10px] font-premium font-bold uppercase tracking-[0.3em] text-zinc-500">Answer Insight</p>
          </div>

          {/* Chapter Info */}
          <div className="w-full mb-12 flex flex-col items-center">
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
                <p className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-emerald-400">Chapter {currentRegistryItem.id}</p>
             </div>
             <div className="flex flex-col items-center gap-2 text-center">
               <h1 className="text-4xl font-premium font-light text-white tracking-tighter">{currentRegistryItem.englishName}</h1>
               <span className="text-3xl font-arabic text-emerald-400/90">{currentRegistryItem.arabicName}</span>
             </div>
          </div>
          
          {/* Question & Answer Content */}
          <div className="w-full space-y-10 mb-14">
            <div className="p-10 bg-white/[0.02] border border-white/[0.05] rounded-[40px] text-center">
              <p className="text-2xl font-premium font-light text-zinc-400 leading-relaxed italic">
                "{currentSurahData?.questions[reviewIdx]?.text}"
              </p>
            </div>
            
            <div className="px-6 space-y-5 text-center">
              <div className="flex items-center justify-center gap-4">
                <div className="w-10 h-px bg-emerald-500/30" />
                <p className="text-[11px] font-premium font-bold uppercase tracking-[0.3em] text-emerald-400">The Answer</p>
                <div className="w-10 h-px bg-emerald-500/30" />
              </div>
              <p className="text-3xl font-premium font-bold text-white leading-snug tracking-tight">
                {currentSurahData?.questions[reviewIdx]?.answer}
              </p>
            </div>
          </div>
          
          {/* Minimal Call to Action */}
          <div className="w-full pt-8 border-t border-white/[0.05] text-center">
            <p className="text-[10px] font-premium font-bold uppercase tracking-[0.4em] text-zinc-400 mb-3">Join the assessment at</p>
            <p className="text-2xl font-premium font-semibold text-white tracking-tight">https://quranfurqan.web.app</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
