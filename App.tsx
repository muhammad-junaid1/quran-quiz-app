
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SURAHS_REGISTRY } from './constants';
import { Surah, Question } from './types';

interface SurahProgress {
  activeIndex: number;
  correctIds: string[];
}

interface MultiSurahState {
  currentSurahId: number;
  progress: Record<number, SurahProgress>;
}

const STORAGE_KEY = 'quran_insight_multi_state';

const App: React.FC = () => {
  const [state, setState] = useState<MultiSurahState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    
    const initialProgress: Record<number, SurahProgress> = {};
    SURAHS_REGISTRY.forEach(s => {
      initialProgress[s.id] = { activeIndex: 0, correctIds: [] };
    });
    
    return {
      currentSurahId: SURAHS_REGISTRY[0].id,
      progress: initialProgress
    };
  });

  const [currentSurahData, setCurrentSurahData] = useState<Surah | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'success'>('idle');
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
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

  // Persist state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

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
    if (!currentSurahData) return { total: 0, correctCount: 0, wrongCount: 0, progress: 0, isCompleted: false };
    const total = currentSurahData.questions.length;
    const correctCount = currentSurahData.questions.filter(q => currentProgress.correctIds.includes(q.id)).length;
    const answeredCount = currentProgress.activeIndex;
    const isCompleted = currentProgress.activeIndex >= total;
    const wrongCount = Math.max(0, (isCompleted ? total : answeredCount) - correctCount);
    const progressPerc = Math.round((currentProgress.activeIndex / total) * 100);
    return { total, correctCount, wrongCount, progress: Math.min(progressPerc, 100), isCompleted };
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

  const handleResponse = (isCorrect: boolean) => {
    if (!currentSurahData) return;
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
      
      // Ensure fonts are loaded before capture
      await document.fonts.ready;
      
      const dataUrl = await toPng(shareCardRef.current, { 
        quality: 1, 
        pixelRatio: 3,
        backgroundColor: '#0a0a0a'
      });
      const link = document.createElement('a');
      link.download = `quran-journey-${currentRegistryItem.englishName.toLowerCase()}.png`;
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

  useEffect(() => {
    if (!isLoading && selectedQuestionIndex === null && !stats.isCompleted) {
      const target = currentProgress.activeIndex;
      questionRefs.current[target]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentProgress.activeIndex, selectedQuestionIndex, stats.isCompleted, isLoading]);

  const currentRegistryItem = useMemo(() => 
    SURAHS_REGISTRY.find(s => s.id === state.currentSurahId) || SURAHS_REGISTRY[0],
    [state.currentSurahId]
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0a0a] text-zinc-300 relative overflow-hidden selection:bg-emerald-500/20 font-sans tracking-tight">
      
      {/* Top Progress Info Strip */}
      <div className="w-full bg-[#0d0d0d] border-b border-white/[0.03] px-6 py-2.5 flex justify-center items-center gap-2 z-[60]">
        <svg className="w-3.5 h-3.5 text-emerald-400/80" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.976 8.976 0 00-1.318.236 1 1 0 01-1.091-.637 2.993 2.993 0 00-.816-1.112c-.4-.307-.862-.533-1.352-.667z" />
        </svg>
        <span className="text-[10px] font-premium font-semibold uppercase tracking-[0.3em] text-zinc-400">
          Quran: <span className="text-emerald-400 ml-1">{globalProgress}% Completed</span>
        </span>
        
        <button 
          onClick={() => setIsShareModalOpen(true)}
          className="ml-4 px-3 py-1 bg-white/[0.05] border border-white/[0.1] rounded-full flex items-center gap-1.5 hover:bg-white/[0.1] transition-all group"
        >
          <svg className="w-3 h-3 text-zinc-400 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span className="text-[9px] font-premium font-bold uppercase tracking-wider text-zinc-500 group-hover:text-zinc-300">Share</span>
        </button>
      </div>

      {/* Header */}
      <header className="glass-panel sticky top-0 z-50 px-8 py-5 flex items-center justify-between">
        <button onClick={() => navigateSurah('prev')} className="p-2.5 text-zinc-500 hover:text-white transition-all duration-300 hover:bg-white/5 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
        </button>

        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex flex-col items-center text-center group">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-arabic text-white leading-none">{currentRegistryItem.arabicName}</span>
              <span className="text-xl font-premium font-medium text-white tracking-tight">{currentRegistryItem.englishName}</span>
              <svg className={`w-4 h-4 text-zinc-500 transition-transform duration-500 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" /></svg>
            </div>
            <span className="text-[11px] text-zinc-400 font-premium font-semibold uppercase tracking-[0.25em] mt-2">{currentRegistryItem.id}. {currentRegistryItem.translation}</span>
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-6 w-80 bg-[#0d0d0d] border border-white/[0.08] rounded-[24px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.7)] animate-in fade-in slide-in-from-top-4 duration-300 z-[100]">
              <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
                {SURAHS_REGISTRY.map(s => {
                  const p = getSurahProgressPercent(s.id);
                  return (
                    <button key={s.id} onClick={() => selectSurah(s.id)} className={`w-full px-6 py-5 flex items-center justify-between hover:bg-white/[0.05] transition-all border-b border-white/[0.03] last:border-0 ${s.id === state.currentSurahId ? 'bg-white/[0.03]' : ''}`}>
                      <div className="text-left">
                        <div className="flex items-center gap-2.5">
                          <p className={`text-base font-premium font-semibold ${s.id === state.currentSurahId ? 'text-white' : 'text-zinc-200'}`}>{s.englishName}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold tracking-tighter ${s.id === state.currentSurahId ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>{p}%</span>
                        </div>
                        <p className={`text-[11px] font-premium uppercase tracking-wider mt-1 ${s.id === state.currentSurahId ? 'text-zinc-400' : 'text-zinc-500'}`}>{s.translation}</p>
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
      <div className="bg-[#080808]/80 backdrop-blur-md border-b border-white/[0.08] py-4 px-6 flex items-center justify-center gap-16 text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-zinc-400 z-40 relative">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-zinc-500">Chapter Total</span>
          <span className="text-white text-sm font-bold tracking-tight">{stats.total}</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-emerald-500/70">Correct</span>
          <span className="text-emerald-400 text-sm font-bold tracking-tight">{stats.correctCount}</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-rose-500/70">Wrong</span>
          <span className="text-rose-400 text-sm font-bold tracking-tight">{stats.wrongCount}</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-blue-500/70">Surah Progress</span>
          <span className="text-blue-400 text-sm font-bold tracking-tight">{stats.progress}%</span>
        </div>
      </div>

      {/* Top Fade Gradient Overlay */}
      <div className="fixed top-[136px] left-0 right-0 h-32 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent pointer-events-none z-30" />

      {/* Main Flow */}
      <main ref={mainRef} className="flex-1 overflow-y-auto no-scrollbar px-8 py-8 md:px-32 lg:px-[25%]">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center animate-pulse gap-6">
            <div className="w-10 h-10 rounded-full border border-emerald-500/20 border-t-emerald-500/80 animate-spin" />
            <p className="text-[10px] font-premium font-medium uppercase tracking-[0.3em] text-zinc-600">Syncing Verse Insights...</p>
          </div>
        ) : currentSurahData && (
          <div className="relative text-[1.25rem] md:text-[1.4rem] font-light text-justify leading-[2.2] tracking-tight">
            {currentSurahData.questions.map((q, idx) => {
              const isCorrect = currentProgress.correctIds.includes(q.id);
              const isPast = idx < currentProgress.activeIndex;
              const isActive = idx === currentProgress.activeIndex;
              const isSelected = selectedQuestionIndex === idx;
              const isFuture = idx > currentProgress.activeIndex;

              let colorClass = "text-zinc-400/70";
              if (isPast) {
                colorClass = isCorrect ? "text-emerald-500/80" : "text-rose-500/80";
              } else if (isActive) {
                colorClass = "text-white font-medium";
              } else {
                colorClass = "text-zinc-400/45";
              }

              return (
                <React.Fragment key={q.id}>
                  <span className="inline-flex items-center justify-center align-middle mx-2">
                    <span className={`
                      w-8 h-8 rounded-full border flex items-center justify-center text-[13px] font-premium font-bold transition-all duration-700 select-none
                      ${isActive ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 
                        isPast ? (isCorrect ? 'border-emerald-500/40 text-emerald-500/60 bg-emerald-500/5' : 'border-rose-500/40 text-rose-500/60 bg-rose-500/5') : 
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
                    className={`
                      question-span transition-all duration-700 px-2 py-1.5 rounded-xl inline decoration-emerald-500/20 underline-offset-8
                      ${!isFuture ? 'cursor-pointer' : 'cursor-default'}
                      ${colorClass}
                      ${isActive ? 'bg-white/10 border border-white/20 backdrop-blur-sm shadow-[0_0_25px_rgba(255,255,255,0.05)]' : ''}
                      ${isSelected && !isActive ? 'bg-white/[0.04] ring-1 ring-white/[0.08]' : ''}
                    `}
                  >
                    {q.text}
                  </span>
                </React.Fragment>
              );
            })}
            
            {stats.isCompleted && (
              <div className="mt-32 flex flex-col items-center animate-in fade-in zoom-in duration-1000">
                 <div className="w-24 h-24 bg-emerald-500/5 rounded-full flex items-center justify-center mb-8 ring-1 ring-emerald-500/20">
                   <svg className="w-10 h-10 text-emerald-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 13l4 4L19 7" />
                   </svg>
                 </div>
                 <h3 className="text-3xl font-premium font-light text-white mb-3 tracking-tight">Chapter Completed</h3>
                 <p className="text-zinc-500 text-center max-w-sm italic font-light text-base leading-relaxed">May these reflections deepen your understanding and connection.</p>
              </div>
            )}
          </div>
        )}
        <div className="h-64" />
      </main>

      {/* Bottom Fade Gradient Overlay */}
      <div className="fixed bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent pointer-events-none z-30" />

      {/* Floating Controls */}
      <div className="fixed bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-8 z-40">
        {!stats.isCompleted || selectedQuestionIndex !== null ? (
          <>
            <button
              onClick={() => handleResponse(false)}
              className="px-12 py-5 bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-full text-zinc-300 text-[10px] font-premium font-bold uppercase tracking-[0.3em] hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition-all duration-500 active:scale-[0.98] shadow-2xl min-w-[160px]"
            >
              Not Sure
            </button>

            <button
              onClick={() => handleResponse(true)}
              className="px-12 py-5 bg-white text-black rounded-full text-[10px] font-premium font-bold uppercase tracking-[0.3em] hover:bg-emerald-50 transition-all duration-500 active:scale-[0.98] shadow-[0_20px_40px_rgba(255,255,255,0.1)] min-w-[160px]"
            >
              I know this
            </button>
          </>
        ) : (
          <button
            onClick={() => navigateSurah('next')}
            className="px-16 py-5 bg-white text-black rounded-[22px] text-[10px] font-premium font-bold uppercase tracking-[0.3em] hover:bg-emerald-50 transition-all duration-500 active:scale-[0.98] shadow-[0_20px_40px_rgba(255,255,255,0.1)] min-w-[280px] flex items-center justify-center gap-4"
          >
            Continue Journey
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        )}
      </div>

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

      {/* Hidden Share Card for Image Generation */}
      <div className="fixed -left-[9999px] top-0">
        <div 
          ref={shareCardRef}
          className="w-[600px] p-12 bg-[#0a0a0a] text-zinc-300 font-sans relative overflow-hidden flex flex-col items-center"
        >
          {/* Background Decor */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] -z-10" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/[0.03] rounded-full blur-[100px] -z-10" />
          
          {/* Header */}
          <div className="w-full flex justify-between items-start mb-16">
            <div>
              <p className="text-[10px] font-premium font-bold uppercase tracking-[0.3em] text-zinc-500 mb-2">Quranic Insights</p>
              <h1 className="text-3xl font-premium font-semibold text-white tracking-tight">{currentRegistryItem.englishName}</h1>
            </div>
            <span className="text-4xl font-arabic text-white">{currentRegistryItem.arabicName}</span>
          </div>
          
          {/* Stats Grid */}
          <div className="w-full grid grid-cols-2 gap-6 mb-16">
            <div className="bg-white/[0.03] border border-white/[0.05] p-6 rounded-[24px]">
              <p className="text-[9px] font-premium font-bold uppercase tracking-[0.2em] text-emerald-500/70 mb-2">Chapter Correct</p>
              <p className="text-4xl font-premium font-bold text-emerald-400">{stats.correctCount} <span className="text-lg text-zinc-600 font-light">/ {stats.total}</span></p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.05] p-6 rounded-[24px]">
              <p className="text-[9px] font-premium font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">Chapter Progress</p>
              <p className="text-4xl font-premium font-bold text-white">{stats.progress}%</p>
            </div>
          </div>
          
          {/* Global Journey */}
          <div className="w-full bg-white/[0.03] border border-white/[0.05] p-8 rounded-[32px] mb-12 flex flex-col items-center gap-4">
             <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.976 8.976 0 00-1.318.236 1 1 0 01-1.091-.637 2.993 2.993 0 00-.816-1.112c-.4-.307-.862-.533-1.352-.667z" /></svg>
                <p className="text-[10px] font-premium font-bold uppercase tracking-[0.3em] text-zinc-400">Total Journey: {globalProgress}%</p>
             </div>
             <div className="w-full h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${globalProgress}%` }} />
             </div>
          </div>
          
          <p className="text-[9px] font-premium font-bold uppercase tracking-[0.4em] text-zinc-600">quranic-insight-hub.pages.dev</p>
        </div>
      </div>
    </div>
  );
};

export default App;
