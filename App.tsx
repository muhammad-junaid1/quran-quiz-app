
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SURAHS_REGISTRY } from './constants';
import { Surah, Question } from './types';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import LandingPage from './components/LandingPage';

interface SurahProgress {
  activeIndex: number;
  answeredIds: string[];
  notSureIds: string[];
}

interface MultiSurahState {
  currentSurahId: number;
  progress: Record<number, SurahProgress>;
}

const getInitialProgress = () => {
    const initialProgress: Record<number, SurahProgress> = {};
    SURAHS_REGISTRY.forEach(s => {
      initialProgress[s.id] = { activeIndex: 0, answeredIds: [], notSureIds: [] };
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
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [state, setState] = useState<MultiSurahState>(getInitialProgress);
  // Store chapters overview progress percentages: { "1": 45, "2": 100, ... }
  const [chaptersOverview, setChaptersOverview] = useState<Record<string, number>>({});

  // Function to calculate and save chapter progress percentage to overview
  const saveChapterProgressPercentage = async (chapterId: number, progress: SurahProgress, totalQuestions?: number) => {
    if (!user?.email) return;
    
    // Use provided totalQuestions or get from registry
    const registryItem = SURAHS_REGISTRY.find(s => s.id === chapterId);
    const total = totalQuestions || registryItem?.totalQuestions || 0;
    if (total === 0) return;
    
    const progressPercentage = Math.min(100, Math.round((progress.activeIndex / total) * 100));
    
    // Update local state immediately (no refetch) and get updated overview
    let updatedOverview: Record<string, number> = {};
    setChaptersOverview(prev => {
      updatedOverview = {
        ...prev,
        [chapterId.toString()]: progressPercentage
      };
      return updatedOverview;
    });
    
    // Update database with the updated overview
    try {
      const { error } = await supabase
        .from('user_chapters_overview')
        .upsert({
          email: user.email,
          chapters_progress: updatedOverview
        }, { onConflict: 'email' });

      if (error) {
        console.error('Error saving chapter progress percentage:', error);
      }
    } catch (err) {
      console.error('Failed to save chapter progress percentage:', err);
    }
  };

  // Load chapters overview on page load
  useEffect(() => {
    const loadChaptersOverview = async () => {
      if (!user?.email) {
        return;
      }
      
      setIsOverviewLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_chapters_overview')
          .select('chapters_progress')
          .eq('email', user.email)
          .single();

        if (data && !error && data.chapters_progress) {
          setChaptersOverview(data.chapters_progress);
        } else {
          // Initialize with empty object if no overview exists
          setChaptersOverview({});
        }
      } catch (err) {
        console.error("Error fetching chapters overview:", err);
        setChaptersOverview({});
      } finally {
        setIsOverviewLoading(false);
      }
    };

    loadChaptersOverview();
  }, [user?.email]);

  // Load user data when user is available - fetch progress for active chapter
  useEffect(() => {
    const loadUserData = async () => {
      if (!user?.email) {
        setHasLoadedInitialData(false);
        return;
      }
      
      setIsDataLoading(true);
      try {
        // Initialize with default progress
        const initialState = getInitialProgress();
        setState(initialState);
        
        // Fetch progress for the active chapter
        const activeChapterId = initialState.currentSurahId;
        const { data, error } = await supabase
          .from('user_chapter_progress')
          .select('chapter_id, answered_question_ids, not_sure_question_ids, active_index')
          .eq('email', user.email)
          .eq('chapter_id', activeChapterId)
          .single();

        if (data && !error) {
          const chapterProgress = {
            activeIndex: data.active_index || 0,
            answeredIds: data.answered_question_ids || [],
            notSureIds: data.not_sure_question_ids || []
          };
          
          // Update progress for the active chapter
          setState(prev => ({
            ...prev,
            progress: {
              ...prev.progress,
              [activeChapterId]: chapterProgress
            }
          }));
        }
      } catch (err) {
        console.error("Error fetching from Supabase", err);
        // Keep initial state on error
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

  // Load progress when chapter changes
  useEffect(() => {
    const loadChapterProgress = async () => {
      if (!user?.email || !hasLoadedInitialData) return;
      
      setIsDataLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_chapter_progress')
          .select('chapter_id, answered_question_ids, not_sure_question_ids, active_index')
          .eq('email', user.email)
          .eq('chapter_id', state.currentSurahId)
          .single();

        if (data && !error) {
          setState(prev => ({
            ...prev,
            progress: {
              ...prev.progress,
              [state.currentSurahId]: {
                activeIndex: data.active_index || 0,
                answeredIds: data.answered_question_ids || [],
                notSureIds: data.not_sure_question_ids || []
              }
            }
          }));
        } else {
          // Initialize with default if no progress exists
          setState(prev => ({
            ...prev,
            progress: {
              ...prev.progress,
              [state.currentSurahId]: {
                activeIndex: 0,
                answeredIds: [],
                notSureIds: []
              }
            }
          }));
        }
      } catch (err) {
        console.error("Error fetching chapter progress:", err);
        // Initialize with default on error
        setState(prev => ({
          ...prev,
          progress: {
            ...prev.progress,
            [state.currentSurahId]: {
              activeIndex: 0,
              answeredIds: [],
              notSureIds: []
            }
          }
        }));
      } finally {
        setIsDataLoading(false);
      }
    };

    loadChapterProgress();
  }, [state.currentSurahId, user?.email, hasLoadedInitialData]);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
      // After first check, subsequent auth changes should trigger showApp
      setTimeout(() => {
        isFirstAuthCheck.current = false;
      }, 500);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session) {
        // Only auto-open if it's a fresh login (not the initial load check)
        if (!isFirstAuthCheck.current) {
          setShowApp(true);
        }
      } else {
        setShowApp(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    
    // In production, explicitly use the web.app URL with a trailing slash 
    // to match Supabase's expected redirect format and avoid localhost fallback
    const redirectUrl = window.location.origin.includes('localhost') 
      ? window.location.origin 
      : 'https://quranfurqan.web.app/';

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });
    if (error) {
      console.error('Error signing in:', error.message);
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setShowApp(false);
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
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportStatus, setReportStatus] = useState<'idle' | 'success'>('idle');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [streak, setStreak] = useState(0);
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);

  const celebrationSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize sound
  useEffect(() => {
    celebrationSoundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3'); // A nice "tada/success" sound
  }, []);

  const generateExcelReport = async () => {
    if (!user?.email || !currentSurahData) return;
    
    setIsGeneratingReport(true);
    try {
      // Ensure we have the user answers
      const { data, error } = await supabase
        .from('user_answers')
        .select('question_id, answer_text')
        .eq('email', user.email)
        .eq('surah_id', state.currentSurahId);

      if (error) throw error;

      const userAnswersMap: Record<string, string> = {};
      data?.forEach(row => {
        userAnswersMap[row.question_id] = row.answer_text;
      });

      const currentProgress = state.progress[state.currentSurahId] || { activeIndex: 0, answeredIds: [], notSureIds: [] };
      const activeIdx = currentProgress.activeIndex;
      const totalQuestions = currentSurahData.questions.length;
      const remainingCount = totalQuestions - activeIdx;

      // Header info
      const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0];
      const userEmail = user.email;
      const chapterName = `${currentRegistryItem.englishName} (${currentRegistryItem.arabicName})`;
      
      // Build CSV content
      let csvContent = "";
      csvContent += `This report is generated by QuranFurqan. Visit the web app and begin your Quran assessment at https://quranfurqan.web.app\n\n`;
      csvContent += `User Information\n\n`;
      csvContent += `Name,${userName}\n`;
      csvContent += `Email,${userEmail}\n`;
      csvContent += `Date Generated,${new Date().toLocaleString()}\n\n`;
      
      csvContent += "Chapter Information\n\n";
      csvContent += `Chapter,${chapterName}\n`;
      csvContent += `Total Questions,${totalQuestions}\n`;
      csvContent += `Answered Count,${stats.answeredCount}\n`;
      csvContent += `Not Sure Count,${stats.notSureCount}\n\n`;
      
      csvContent += "Question Number,Question Text,Your Answer,Original Answer\n";
      
      const processedCount = Math.min(activeIdx + 1, totalQuestions);
      currentSurahData.questions.slice(0, processedCount).forEach((q, index) => {
        const userAns = userAnswersMap[q.id] || (currentProgress.notSureIds.includes(q.id) ? "Marked as Not Sure" : "");
        // Escape quotes for CSV
        const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;
        
        csvContent += `${index + 1},${escapeCsv(q.text)},${escapeCsv(userAns)},${escapeCsv(q.answer)}\n`;
      });

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `QuranFurqan_Report_Chapter_${state.currentSurahId}_${userName.replace(/[^a-z0-9]/gi, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setReportStatus('success');
      setTimeout(() => setReportStatus('idle'), 3000);
    } catch (err) {
      console.error("Error generating report:", err);
      alert("Failed to generate report. Please try again.");
    } finally {
      setIsGeneratingReport(false);
    }
  };
  const [isActionDisabled, setIsActionDisabled] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);
  const [showApp, setShowApp] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New states for Writing Answers
  const [isAnswerPopupOpen, setIsAnswerPopupOpen] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  const [isFetchingAnswer, setIsFetchingAnswer] = useState(false);
  const [answeringQuestionIdx, setAnsweringQuestionIdx] = useState<number | null>(null);
  const [existingUserAnswer, setExistingUserAnswer] = useState<string | null>(null);
  const [lastUpdatedDate, setLastUpdatedDate] = useState<string | null>(null);
  const [reviewUserAnswers, setReviewUserAnswers] = useState<Record<string, string>>({});
  const [isFetchingReviewAnswers, setIsFetchingReviewAnswers] = useState(false);

  // Confirmation for deleting answer
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingAnswer, setIsDeletingAnswer] = useState(false);
  const [pendingNotSureIdx, setPendingNotSureIdx] = useState<number | null>(null);

  const isFirstAuthCheck = useRef(true);
  
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
        setSearchQuery('');
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
      setStreak(0); // Reset streak when changing chapters
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

  const currentProgress = state.progress[state.currentSurahId] || { activeIndex: 0, answeredIds: [], notSureIds: [] };

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

  const completedChaptersCount = useMemo(() => {
    return SURAHS_REGISTRY.filter(s => {
      const prog = state.progress[s.id];
      if (!prog) return false;
      return prog.activeIndex >= s.totalQuestions && s.totalQuestions > 0;
    }).length;
  }, [state.progress]);

  const stats = useMemo(() => {
    if (!currentSurahData) return { total: 0, answeredCount: 0, notSureCount: 0, progress: 0, isCompleted: false };
    const total = currentSurahData.questions.length;
    
    // notSureCount is the number of questions in notSureIds
    const notSureCount = currentProgress.notSureIds.length;
    // answeredCount is the number of questions in answeredIds
    const answeredCount = currentProgress.answeredIds.length;
    
    const isCompleted = currentProgress.activeIndex >= total;
    const progressPerc = Math.round((currentProgress.activeIndex / total) * 100);
    return { total, answeredCount, notSureCount, progress: Math.min(progressPerc, 100), isCompleted };
  }, [currentSurahData, currentProgress]);

  const isSelectedAnswered = useMemo(() => {
    if (selectedQuestionIndex === null || !currentSurahData) return false;
    const q = currentSurahData.questions[selectedQuestionIndex];
    if (!q) return false;
    return currentProgress.answeredIds.includes(q.id) && selectedQuestionIndex < currentProgress.activeIndex;
  }, [selectedQuestionIndex, currentSurahData, currentProgress]);

  const getSurahProgressPercent = (surahId: number) => {
    // Use chapters overview if available, otherwise calculate from state
    const overviewPercent = chaptersOverview[surahId.toString()];
    if (overviewPercent !== undefined) {
      return overviewPercent;
    }
    
    // Fallback to calculating from state
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

  const handleResponse = async (isCorrect: boolean, targetIndexOverride: number | null = null) => {
    if (!currentSurahData || isActionDisabled) return;

    const targetIdx = targetIndexOverride !== null ? targetIndexOverride : (selectedQuestionIndex !== null ? selectedQuestionIndex : currentProgress.activeIndex);
    const question = currentSurahData.questions[targetIdx];
    
    if (!question) return;

    // Logic for "Not Sure" on a previously answered question
    if (!isCorrect && user?.email) {
      const isAlreadyAnswered = currentProgress.answeredIds.includes(question.id) && targetIdx < currentProgress.activeIndex;
      
      if (isAlreadyAnswered) {
        setPendingNotSureIdx(targetIdx);
        setIsDeleteConfirmOpen(true);
        return;
      }
    }

    await executeResponse(isCorrect, targetIdx);
  };

  const executeResponse = async (isCorrect: boolean, targetIdx: number) => {
    const question = currentSurahData?.questions[targetIdx];
    if (!question || !user?.email) return;

    setIsActionDisabled(true);
    setTimeout(() => setIsActionDisabled(false), 1000);

    // Calculate updated progress before setState
    const surahId = state.currentSurahId;
    const oldProg = state.progress[surahId];
    let newAnsweredIds = [...oldProg.answeredIds];
    let newNotSureIds = [...oldProg.notSureIds];

    if (isCorrect) {
      // Add to answeredIds if not already there, remove from notSureIds
      if (!newAnsweredIds.includes(question.id)) {
        newAnsweredIds.push(question.id);
      }
      newNotSureIds = newNotSureIds.filter(id => id !== question.id);
    } else {
      // Add to notSureIds if not already there, remove from answeredIds
      if (!newNotSureIds.includes(question.id)) {
        newNotSureIds.push(question.id);
      }
      newAnsweredIds = newAnsweredIds.filter(id => id !== question.id);
    }

    const isAnsweringCurrent = targetIdx === oldProg.activeIndex;
    
    const nextIndex = isAnsweringCurrent 
      ? Math.min(oldProg.activeIndex + 1, currentSurahData!.questions.length)
      : oldProg.activeIndex;

    if (nextIndex === currentSurahData!.questions.length && oldProg.activeIndex < currentSurahData!.questions.length) {
      setShowCompletionPopup(true);
    }

    // Handle Streak Logic
    if (isCorrect) {
      const isAlreadyAnswered = oldProg.answeredIds.includes(question.id) && targetIdx < oldProg.activeIndex;
      
      if (!isAlreadyAnswered) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        
        if (newStreak % 3 === 0 && newStreak > 0) {
          setShowStreakCelebration(true);
          if (celebrationSoundRef.current) {
            celebrationSoundRef.current.currentTime = 0;
            celebrationSoundRef.current.play().catch(e => console.log("Audio play blocked", e));
          }
          setTimeout(() => {
            setShowStreakCelebration(false);
          }, 3000);
        }
      }
    } else {
      setStreak(0); // Reset streak on "Not Sure"
    }

    const updatedProgress: SurahProgress = { 
      activeIndex: nextIndex, 
      answeredIds: newAnsweredIds, 
      notSureIds: newNotSureIds 
    };

    // Update state
    setState(prev => ({
      ...prev,
      progress: {
        ...prev.progress,
        [surahId]: updatedProgress
      }
    }));

    // Save progress to Supabase immediately
    try {
      const { error } = await supabase
        .from('user_chapter_progress')
        .upsert({
          email: user.email,
          chapter_id: surahId,
          answered_question_ids: updatedProgress.answeredIds,
          not_sure_question_ids: updatedProgress.notSureIds,
          active_index: updatedProgress.activeIndex
        }, { onConflict: 'email,chapter_id' });

      if (error) {
        console.error('Error saving progress to Supabase:', error);
      } else {
        console.log('Progress saved successfully:', {
          chapter_id: surahId,
          answeredIds: updatedProgress.answeredIds.length,
          notSureIds: updatedProgress.notSureIds.length,
          activeIndex: updatedProgress.activeIndex
        });
        
        // Update chapter progress percentage in overview
        const total = currentSurahData?.questions.length;
        if (total) {
          await saveChapterProgressPercentage(surahId, updatedProgress, total);
        }
      }
    } catch (err) {
      console.error('Failed to save progress:', err);
    }

    if (selectedQuestionIndex !== null) setSelectedQuestionIndex(null);
  };

  const confirmNotSureDelete = async () => {
    if (pendingNotSureIdx === null || !user?.email || !currentSurahData) return;
    
    const question = currentSurahData.questions[pendingNotSureIdx];
    
    try {
      setIsDeletingAnswer(true);
      setIsActionDisabled(true);
      const { error } = await supabase
        .from('user_answers')
        .delete()
        .eq('email', user.email)
        .eq('surah_id', state.currentSurahId)
        .eq('question_id', question.id);

      if (error) throw error;

      await executeResponse(false, pendingNotSureIdx);
    } catch (err) {
      console.error("Error deleting answer:", err);
      alert("Failed to delete saved answer. Please try again.");
    } finally {
      setIsDeletingAnswer(false);
      setIsActionDisabled(false);
      setIsDeleteConfirmOpen(false);
      setPendingNotSureIdx(null);
    }
  };

  const openAnswerPopup = async (idx: number) => {
    if (!currentSurahData || !user?.email) return;
    
    const question = currentSurahData.questions[idx];
    setAnsweringQuestionIdx(idx);
    setAnswerText('');
    setExistingUserAnswer(null);
    setLastUpdatedDate(null);
    setIsAnswerPopupOpen(true);
    setIsFetchingAnswer(true);

    try {
      const { data, error } = await supabase
        .from('user_answers')
        .select('answer_text, updated_at')
        .eq('email', user.email)
        .eq('surah_id', state.currentSurahId)
        .eq('question_id', question.id)
        .single();

      if (data) {
        setAnswerText(data.answer_text);
        setExistingUserAnswer(data.answer_text);
        setLastUpdatedDate(data.updated_at);
      }
    } catch (err) {
      console.error("Error fetching answer:", err);
    } finally {
      setIsFetchingAnswer(false);
    }
  };

  const submitAnswer = async () => {
    if (!currentSurahData || answeringQuestionIdx === null || !user?.email || !answerText.trim()) return;

    setIsSavingAnswer(true);
    const question = currentSurahData.questions[answeringQuestionIdx];

    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('user_answers')
        .upsert({
          email: user.email,
          surah_id: state.currentSurahId,
          question_id: question.id,
          question_text: question.text,
          answer_text: answerText.trim(),
          official_answer: question.answer,
          updated_at: now
        }, { onConflict: 'email,surah_id,question_id' });

      if (error) throw error;

      // Successfully saved, now update local state to mark as answered
      await handleResponse(true, answeringQuestionIdx);
      setLastUpdatedDate(now);
      setIsAnswerPopupOpen(false);
      setAnsweringQuestionIdx(null);
      setAnswerText('');
    } catch (err) {
      console.error("Error saving answer:", err);
      alert("Failed to save answer. Please try again.");
    } finally {
      setIsSavingAnswer(false);
    }
  };

  const fetchAllUserAnswers = async () => {
    if (!user?.email || !state.currentSurahId) return;
    setIsFetchingReviewAnswers(true);
    try {
      const { data, error } = await supabase
        .from('user_answers')
        .select('question_id, answer_text')
        .eq('email', user.email)
        .eq('surah_id', state.currentSurahId);
      
      if (data) {
        const mapping: Record<string, string> = {};
        data.forEach(row => {
          mapping[row.question_id] = row.answer_text;
        });
        setReviewUserAnswers(mapping);
      }
    } catch (err) {
      console.error("Error fetching review answers:", err);
    } finally {
      setIsFetchingReviewAnswers(false);
    }
  };

  useEffect(() => {
    if (isReviewOpen) {
      fetchAllUserAnswers();
    }
  }, [isReviewOpen, state.currentSurahId]);

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
        pixelRatio: 5,
        backgroundColor: '#0a0a0a',
        cacheBust: true,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
        filter: (node) => {
          // Exclude any unwanted elements for cleaner rendering
          return true;
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
        pixelRatio: 5,
        backgroundColor: '#0a0a0a',
        cacheBust: true,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
        filter: (node) => {
          // Exclude any unwanted elements for cleaner rendering
          return true;
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
    <div className="h-screen w-screen flex flex-col bg-[#0a0a0a] text-zinc-300 relative overflow-hidden selection:bg-indigo-500/20 font-sans tracking-tight">
      
      {isAuthLoading || (user && !hasLoadedInitialData) ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <p className="text-[10px] font-premium font-bold uppercase tracking-[0.3em] text-zinc-500">
            {isAuthLoading ? 'Loading App...' : 'Syncing Your Progress...'}
          </p>
        </div>
      ) : (
        <>
          {/* Top User Info Strip */}
          {user && (
            <div className="w-full bg-[#0d0d0d] border-b border-white/[0.05] px-4 md:px-6 py-3 md:py-4 flex justify-center items-center z-[60] shrink-0">
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 w-full relative">
              <div className="flex items-center gap-4">
                {user.user_metadata?.avatar_url && !profileImageError ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt="Profile" 
                    className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-white/10" 
                    crossOrigin="anonymous"
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
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] md:text-[11px] font-premium font-medium text-emerald-400/80 uppercase tracking-[0.15em] md:tracking-[0.2em]">
                      {globalProgress}% Completed
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="text-[10px] md:text-[11px] font-premium font-medium text-zinc-500 uppercase tracking-[0.15em] md:tracking-[0.2em]">
                      {completedChaptersCount}/114 Chapters
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="hidden md:block w-px h-8 bg-white/10" />
              
              <div className="flex items-center gap-2 md:gap-3">
                <button 
                  onClick={() => setIsShareModalOpen(true)}
                  className="px-4 md:px-5 py-2 md:py-2.5 bg-white/5 border border-white/10 text-zinc-300 hover:text-indigo-400 hover:bg-indigo-500/5 rounded-full transition-all flex items-center gap-2"
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
                className="absolute right-0 top-0 text-zinc-500 hover:text-indigo-400 transition-all text-[10px] font-premium font-bold uppercase tracking-[0.2em]"
              >
                Help
              </button>
            </div>
          </div>
          )}

          {!showApp ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <LandingPage onSignIn={user ? () => setShowApp(true) : handleGoogleSignIn} user={user} isSigningIn={isSigningIn} />
            </div>
          ) : (
            <>
      {/* Header */}
      <header className="glass-panel sticky top-0 z-50 px-4 md:px-8 py-4 md:py-5 flex items-center justify-between">
        <button onClick={() => navigateSurah('prev')} className="p-2 md:p-2.5 text-zinc-500 hover:text-white transition-all duration-300 hover:bg-white/5 rounded-full">
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
        </button>

        <div className="relative" ref={dropdownRef}>
          <button onClick={() => {
            setIsDropdownOpen(!isDropdownOpen);
            if (isDropdownOpen) setSearchQuery('');
          }} className="flex flex-col items-center text-center group">
            <div className="flex items-center gap-2 md:gap-3">
              <span className="text-2xl md:text-3xl font-arabic text-white leading-none">{currentRegistryItem.arabicName}</span>
              <span className="text-lg md:text-xl font-premium font-medium text-white tracking-tight">{currentRegistryItem.englishName}</span>
              <svg className={`w-4.5 h-4.5 md:w-5 md:h-5 text-zinc-500 transition-transform duration-500 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" /></svg>
            </div>
            <span className="text-[10px] md:text-[11px] text-zinc-400 font-premium font-semibold uppercase tracking-[0.2em] md:tracking-[0.25em] mt-1.5 md:mt-2">{currentRegistryItem.id}. {currentRegistryItem.translation}</span>
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-6 w-80 bg-[#0d0d0d] border border-white/[0.08] rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.7)] animate-in fade-in slide-in-from-top-4 duration-300 z-[100]">
              <div className="p-4 border-b border-white/[0.05]">
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input 
                    type="text"
                    placeholder="Search chapter..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs font-premium text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/30 transition-all"
                  />
                </div>
              </div>
              <div className="max-h-[50vh] overflow-y-auto custom-scrollbar pb-2">
              {isOverviewLoading ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin mb-4" />
                  <p className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-zinc-500">Loading chapters progress...</p>
                </div>
              ) : (() => {
                const filtered = SURAHS_REGISTRY.filter(s => 
                  s.englishName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  s.translation.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  s.id.toString().includes(searchQuery)
                );
                
                if (filtered.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                      <div className="w-12 h-12 bg-white/[0.03] rounded-2xl flex items-center justify-center mb-4 border border-white/5">
                        <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-[11px] font-premium font-bold uppercase tracking-[0.2em] text-zinc-500">No chapters found</p>
                      <p className="text-[10px] text-zinc-600 mt-2 font-medium uppercase tracking-wider">Try searching name or number</p>
                    </div>
                  );
                }

                return filtered.map(s => {
                  const p = getSurahProgressPercent(s.id);
                  const isFinished = p === 100;
                  return (
                      <button key={s.id} onClick={() => {
                        selectSurah(s.id);
                        setSearchQuery('');
                      }} className={`w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.05] transition-all border-b border-white/[0.03] last:border-0 ${s.id === state.currentSurahId ? 'bg-white/[0.03]' : ''}`}>
                      <div className="flex items-center gap-4">
                          <span className="text-[10px] font-premium font-bold text-zinc-500 w-4">{s.id}</span>
                          <div className="text-left">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold tracking-tighter transition-all ${isFinished ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]' : s.id === state.currentSurahId ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                {isFinished ? 'DONE 100%' : `${p}%`}
                              </span>
                            </div>
                            <p className={`text-sm md:text-base font-premium font-semibold ${s.id === state.currentSurahId ? 'text-white' : 'text-zinc-200'}`}>{s.englishName}</p>
                            <p className={`text-[10px] font-premium uppercase tracking-wider mt-0.5 ${s.id === state.currentSurahId ? 'text-zinc-400' : 'text-zinc-500'}`}>{s.translation}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isFinished && (
                            <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          <span className={`text-xl font-arabic transition-colors ${isFinished ? 'text-emerald-400' : s.id === state.currentSurahId ? 'text-white' : 'text-zinc-500'}`}>{s.arabicName}</span>
                        </div>
                    </button>
                  );
                });
              })()}
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
          <span className="text-emerald-500/70">Answered</span>
          <span className="text-emerald-400 text-xs md:text-sm font-bold tracking-tight">{stats.answeredCount}</span>
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
        className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-32 lg:px-[25%] py-8 select-none"
      >
        {isLoading || isDataLoading ? (
          <div className="flex-1 mt-12 flex flex-col items-center justify-center animate-in fade-in duration-500 gap-8">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-indigo-500/10 border-t-indigo-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <p className="text-[10px] md:text-[11px] font-premium font-bold uppercase tracking-[0.4em] text-white/80">Loading</p>
            </div>
          </div>
        ) : currentSurahData && (
          <>
            {stats.isCompleted && (
              <div className="flex justify-center mb-10 animate-in fade-in slide-in-from-top-4 duration-1000">
                <div className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-full flex items-center gap-3">
                  <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-zinc-400">Tip: Double click any question to review your answer</p>
                </div>
              </div>
            )}

            <div className="relative text-[1.25rem] md:text-[1.4rem] font-light text-justify leading-[1.8] tracking-tight">
              {currentSurahData.questions.map((q, idx) => {
              const isNotSure = currentProgress.notSureIds.includes(q.id);
              const isAnswered = currentProgress.answeredIds.includes(q.id);
              const isPast = idx < currentProgress.activeIndex;
              const isActive = idx === currentProgress.activeIndex;
              const isSelected = selectedQuestionIndex === idx;
              const isFuture = idx > currentProgress.activeIndex;

              let colorClass = "text-zinc-400/70";
              if (isPast) {
                colorClass = isAnswered ? "text-emerald-500/80" : (isNotSure ? "text-amber-500/80" : "text-zinc-400/70");
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
                        isPast ? (isAnswered ? 'border-emerald-500/40 text-emerald-500/60 bg-emerald-500/5' : (isNotSure ? 'border-amber-500/40 text-amber-500/60 bg-amber-500/5' : 'border-white/20 text-zinc-400 bg-white/[0.05]')) : 
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
                      const isQuestionAnswered = currentProgress.answeredIds.includes(q.id) && idx < currentProgress.activeIndex;
                      if (stats.isCompleted) {
                        setReviewIdx(idx);
                        setIsReviewOpen(true);
                      } else {
                        if (isQuestionAnswered) {
                          openAnswerPopup(idx);
                        }
                      }
                    }}
                    className={`
                      question-span transition-all duration-700 px-2 py-1.5 rounded-xl inline decoration-indigo-500/20 underline-offset-8
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
              onClick={() => openAnswerPopup(selectedQuestionIndex !== null ? selectedQuestionIndex : currentProgress.activeIndex)}
              disabled={isActionDisabled}
              className={`flex-1 md:flex-none px-6 md:px-12 py-4 md:py-5 bg-white text-black rounded-full text-[9px] md:text-[10px] font-premium font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] hover:bg-indigo-50 transition-all duration-500 active:scale-[0.98] shadow-[0_20px_40px_rgba(255,255,255,0.1)] md:min-w-[160px] ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSelectedAnswered ? 'Update Answer' : 'Write Answer'}
            </button>
          </>
        ) : (
          <button
            onClick={() => navigateSurah('next')}
            className="w-full md:w-auto px-10 md:px-16 py-4 md:py-5 bg-white text-black rounded-full text-[9px] md:text-[10px] font-premium font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] hover:bg-indigo-50 transition-all duration-500 active:scale-[0.98] shadow-[0_20px_40px_rgba(255,255,255,0.1)] md:min-w-[280px] flex items-center justify-center gap-3 md:gap-4"
          >
            Next Chapter
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        )}
      </div>
            </>
          )}

      {/* Write Answer Popup */}
      {isAnswerPopupOpen && currentSurahData && answeringQuestionIdx !== null && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => !isSavingAnswer && setIsAnswerPopupOpen(false)} />
          <div className="relative w-full h-full md:h-[850px] md:max-h-[90vh] md:max-w-2xl bg-[#0d0d0d] border-b md:border border-white/[0.1] rounded-none md:rounded-[40px] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="p-6 md:p-12 flex flex-col h-full">
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-6 md:gap-0 mb-8 md:mb-10 flex-shrink-0">
                <div className="flex flex-col">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[10px] font-premium font-bold uppercase tracking-[0.3em] text-indigo-400">
                            {existingUserAnswer ? 'Update Answer' : 'Write Answer'}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-zinc-500">Chapter {currentRegistryItem.id}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl md:text-3xl font-arabic text-white leading-none">{currentRegistryItem.arabicName}</span>
                    <span className="text-lg md:text-xl font-premium font-medium text-white tracking-tight">{currentRegistryItem.englishName}</span>
                  </div>
                </div>
                <button onClick={() => !isSavingAnswer && setIsAnswerPopupOpen(false)} className="absolute top-6 right-6 md:relative md:top-0 md:right-0 p-3 text-zinc-500 hover:text-white transition-colors rounded-2xl hover:bg-white/5 z-10">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar mb-8 pr-4">
                <div className="flex flex-col min-h-full space-y-6 md:space-y-8">
                      <div className="p-6 md:p-8 bg-white/[0.03] border border-white/[0.05] rounded-[24px] md:rounded-[32px] flex-shrink-0">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <p className="text-xs md:text-sm font-premium font-bold uppercase tracking-[0.2em] text-white">Question {answeringQuestionIdx + 1} of {currentSurahData.questions.length}</p>
                        </div>
                        <p className="text-base md:text-lg text-zinc-400 font-light leading-relaxed italic">
                          "{currentSurahData.questions[answeringQuestionIdx].text}"
                        </p>
                      </div>

                      {isFetchingAnswer ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 gap-4">
                          <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                          <p className="text-[10px] font-premium font-bold uppercase tracking-widest text-zinc-500">Loading your answer...</p>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col space-y-6">
                          <div className="flex-1 flex flex-col space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-px bg-indigo-500/30" />
                                <p className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-indigo-500">Your Answer</p>
                              </div>
                              {lastUpdatedDate && (
                                <p className="text-[9px] font-premium font-bold uppercase tracking-wider text-zinc-500">
                                  Last Updated: {new Date(lastUpdatedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                            </div>
                            <textarea
                              value={answerText}
                              onChange={(e) => setAnswerText(e.target.value)}
                              placeholder="Type your answer here..."
                              className="flex-1 w-full min-h-[200px] bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/30 transition-all resize-none font-light leading-relaxed"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 md:pt-8 border-t border-white/[0.05] flex-shrink-0">
                    <p className="text-[9px] font-premium font-bold uppercase tracking-[0.2em] text-zinc-500">Your answers are private.</p>
                    <button
                      onClick={submitAnswer}
                      disabled={isSavingAnswer || !answerText.trim() || isFetchingAnswer}
                      className={`px-8 py-4 bg-indigo-500 text-white rounded-2xl text-[10px] font-premium font-bold uppercase tracking-[0.2em] hover:bg-indigo-400 transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isSavingAnswer ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Submit Answer'
                      )}
                    </button>
              </div>
            </div>
          </div>
        </div>
          )}

      {/* Review Modal */}
      {isReviewOpen && currentSurahData && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsReviewOpen(false)} />
          <div className="relative w-full h-full md:h-[850px] md:max-h-[90vh] md:max-w-2xl bg-[#0d0d0d] border-b md:border border-white/[0.1] rounded-none md:rounded-[40px] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="p-6 md:p-12 flex flex-col h-full">
              {/* Review Header with Chapter Info */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-6 md:gap-0 mb-8 md:mb-10 flex-shrink-0">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] font-premium font-bold uppercase tracking-[0.3em] text-indigo-400">Review Answers</span>
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
                  <button onClick={() => setIsReviewOpen(false)} className="absolute top-6 right-6 md:relative md:top-0 md:right-0 p-3 text-zinc-500 hover:text-white transition-colors rounded-2xl hover:bg-white/5 z-10">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar mb-8 md:mb-10 pr-4">
                <div className="space-y-6 md:space-y-8">
                  <div className="p-6 md:p-8 bg-white/[0.03] border border-white/[0.05] rounded-[24px] md:rounded-[32px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <p className="text-xs md:text-sm font-premium font-bold uppercase tracking-[0.2em] text-white">Question {reviewIdx + 1} of {currentSurahData.questions.length}</p>
                      </div>
                      
                      {/* User Status Badge */}
                      <div className={`px-3 py-1 rounded-full border text-[9px] font-premium font-bold uppercase tracking-wider ${
                        currentProgress.answeredIds.includes(currentSurahData.questions[reviewIdx].id)
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : currentProgress.notSureIds.includes(currentSurahData.questions[reviewIdx].id)
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
                      }`}>
                        {currentProgress.answeredIds.includes(currentSurahData.questions[reviewIdx].id)
                          ? 'You answered this'
                          : currentProgress.notSureIds.includes(currentSurahData.questions[reviewIdx].id)
                          ? 'You were not sure about this'
                          : 'Not answered'}
                      </div>
                    </div>
                    <p className="text-base md:text-lg text-zinc-400 font-light leading-relaxed italic">
                      "{currentSurahData.questions[reviewIdx].text}"
                    </p>
                  </div>

                    {isFetchingReviewAnswers ? (
                      <div className="space-y-4 px-2 md:px-0 animate-in fade-in duration-300">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-px bg-indigo-500/30" />
                          <p className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-indigo-500">Your Answer</p>
                        </div>
                        <div className="flex items-center gap-3 py-4">
                          <div className="w-4 h-4 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                          <p className="text-sm text-zinc-500 font-premium font-bold uppercase tracking-widest">Fetching your answer...</p>
                        </div>
                      </div>
                    ) : reviewUserAnswers[currentSurahData.questions[reviewIdx].id] && (
                      <div className="space-y-4 px-2 md:px-0 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-px bg-indigo-500/30" />
                          <p className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-indigo-500">Your Answer</p>
                        </div>
                        <p className="text-lg md:text-xl text-white font-light leading-relaxed">
                          {reviewUserAnswers[currentSurahData.questions[reviewIdx].id]}
                        </p>
                      </div>
                    )}

                  <div className="space-y-4 px-2 md:px-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-px bg-blue-500/30" />
                      <p className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-blue-500">Original Answer</p>
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
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-[10px] font-premium font-bold uppercase tracking-[0.15em] text-zinc-400">Answers are AI generated</p>
                  </div>
                  <p className="text-[9px] font-premium font-bold uppercase tracking-[0.2em] text-zinc-500">Double check for accuracy</p>
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowCompletionPopup(false)} />
          <div className="relative w-full h-full md:h-auto md:max-w-sm bg-[#0d0d0d] border md:border-emerald-500/20 rounded-none md:rounded-[40px] p-10 flex flex-col items-center justify-center text-center shadow-2xl animate-in fade-in zoom-in-95 duration-500">
            <button onClick={() => setShowCompletionPopup(false)} className="absolute top-6 right-6 p-3 text-zinc-500 hover:text-white transition-colors rounded-2xl hover:bg-white/5">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-8 mx-auto ring-1 ring-indigo-500/20">
              <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-2xl font-premium font-semibold text-white mb-4 tracking-tight">BarakAllah!</h3>
            <p className="text-zinc-500 text-sm leading-relaxed mb-8">
              You've completed this chapter. You can now double-click any question to view your answer and gain deeper insights.
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

      <div className="fixed -bottom-64 -left-64 w-[800px] h-[800px] bg-indigo-500/[0.03] rounded-full blur-[160px] -z-10 pointer-events-none"></div>
      <div className="fixed -top-64 -right-64 w-[800px] h-[800px] bg-white/[0.02] rounded-full blur-[160px] -z-10 pointer-events-none"></div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsShareModalOpen(false)} />
          <div className="relative w-full h-full md:h-auto md:max-w-sm bg-[#0d0d0d] border md:border-white/[0.1] rounded-none md:rounded-[32px] overflow-hidden flex flex-col justify-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <button onClick={() => setIsShareModalOpen(false)} className="absolute top-6 right-6 p-3 text-zinc-500 hover:text-white transition-colors rounded-2xl hover:bg-white/5">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="p-8">
              <h3 className="text-xl font-premium font-semibold text-white mb-2 tracking-tight">Share Progress</h3>
              <p className="text-sm text-zinc-500 mb-8 font-light">Generate a beautiful card to share with friends.</p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleShare()}
                  disabled={isGeneratingImage || shareStatus === 'success'}
                  className={`w-full py-4 rounded-2xl text-xs font-premium font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-50 ${
                    shareStatus === 'success' ? 'bg-indigo-500 text-white' : 'bg-white text-black hover:bg-zinc-200'
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

                {stats.isCompleted && (
                  <button 
                    onClick={() => generateExcelReport()}
                    disabled={isGeneratingReport}
                    className={`w-full py-4 rounded-2xl text-xs font-premium font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-50 ${
                      reportStatus === 'success' ? 'bg-indigo-500 text-white' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {isGeneratingReport ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                         Exporting Answers...
                      </>
                    ) : reportStatus === 'success' ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                        Answers Exportedrte!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export Answers
                      </>
                    )}
                  </button>
                )}
                
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsReviewShareModalOpen(false)} />
          <div className="relative w-full h-full md:h-auto md:max-w-sm bg-[#0d0d0d] border md:border-white/[0.1] rounded-none md:rounded-[32px] overflow-hidden flex flex-col justify-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <button onClick={() => setIsReviewShareModalOpen(false)} className="absolute top-6 right-6 p-3 text-zinc-500 hover:text-white transition-colors rounded-2xl hover:bg-white/5">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
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

                {stats.isCompleted && (
                  <button 
                    onClick={() => generateExcelReport()}
                    disabled={isGeneratingReport}
                    className={`w-full py-4 rounded-2xl text-xs font-premium font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-50 ${
                      reportStatus === 'success' ? 'bg-indigo-500 text-white' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {isGeneratingReport ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        Generating Report...
                      </>
                    ) : reportStatus === 'success' ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                        Report Generated!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export Answers
                      </>
                    )}
                  </button>
                )}
                
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-6 bg-black/90 backdrop-blur-xl">
          <div className="relative w-full h-full md:h-[850px] md:max-h-[90vh] md:max-w-2xl bg-[#0d0d0d] border-b md:border border-white/[0.1] rounded-none md:rounded-[40px] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <button onClick={() => setIsInstructionsOpen(false)} className="absolute top-6 right-6 p-3 text-zinc-500 hover:text-white transition-colors rounded-2xl hover:bg-white/5 z-20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            {/* Slide Progress Dots */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${i === currentSlide ? 'bg-indigo-400 w-6' : 'bg-white/10'}`} />
              ))}
            </div>

            <div className="flex-1 p-6 md:p-10 pt-20 md:pt-32 overflow-y-auto custom-scrollbar flex flex-col items-center text-center">
              {currentSlide === 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-lg">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-500/10 rounded-2xl md:rounded-3xl flex items-center justify-center mb-6 md:mb-8 mx-auto ring-1 ring-indigo-500/20">
                    <svg className="w-8 h-8 md:w-10 md:h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.584.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h2 className="text-2xl md:text-4xl font-premium font-light text-white mb-4 md:mb-6 tracking-tight">Welcome to QuranFurqan</h2>
                  <p className="text-sm md:text-lg text-zinc-400 leading-relaxed font-light mb-8 md:mb-10 px-2 md:px-0">
                    Assess and deepen your understanding of the Quran through structured quiz questions designed for meaningful reflection.
                  </p>
                  <div className="p-3 md:p-4 bg-indigo-500/5 rounded-xl md:rounded-2xl border border-indigo-500/10 inline-block">
                    <p className="text-[10px] md:text-[12px] font-premium font-bold uppercase tracking-[0.2em] text-indigo-400">Deep Assessment, Not Just Reading</p>
                  </div>
                </div>
              )}

              {currentSlide === 1 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-lg">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-amber-500/10 rounded-2xl md:rounded-3xl flex items-center justify-center mb-6 md:mb-8 mx-auto ring-1 ring-amber-500/20">
                    <svg className="w-8 h-8 md:w-10 md:h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl md:text-4xl font-premium font-light text-white mb-4 md:mb-6 tracking-tight">How it Works</h2>
                  <p className="text-sm md:text-lg text-zinc-400 leading-relaxed font-light mb-8 md:mb-10 px-2 md:px-0">
                    You're displayed a set of questions for each chapter. Use the buttons below based on your understanding:
                  </p>
                  <div className="grid grid-cols-2 gap-3 md:gap-4 text-left">
                    <div className="p-4 md:p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl md:rounded-3xl">
                      <p className="text-[10px] md:text-[12px] font-bold text-emerald-400 uppercase mb-2 tracking-wider">Answered</p>
                      <p className="text-xs md:text-sm text-zinc-400 font-light leading-relaxed">Confirm your mastery of this question's concept.</p>
                    </div>
                    <div className="p-4 md:p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl md:rounded-3xl">
                      <p className="text-[10px] md:text-[12px] font-bold text-amber-400 uppercase mb-2 tracking-wider">Not Sure</p>
                      <p className="text-xs md:text-sm text-zinc-400 font-light leading-relaxed">Indicate you need more study on this point.</p>
                    </div>
                  </div>
                </div>
              )}

              {currentSlide === 2 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-lg">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-500/10 rounded-2xl md:rounded-3xl flex items-center justify-center mb-6 md:mb-8 mx-auto ring-1 ring-indigo-500/20">
                    <svg className="w-8 h-8 md:w-10 md:h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl md:text-4xl font-premium font-light text-white mb-4 md:mb-6 tracking-tight">Write Your Answer</h2>
                  <p className="text-sm md:text-lg text-zinc-400 leading-relaxed font-light mb-8 md:mb-10 px-2 md:px-0">
                    When you click <span className="text-white font-medium">"Write Answer"</span> (or <span className="text-white font-medium">"Update Answer"</span>), you can type your answer. Your answers are saved securely in the cloud.
                  </p>
                  <div className="p-5 md:p-8 bg-white/[0.03] border border-white/10 rounded-2xl md:rounded-[32px] text-left space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-6 md:w-8 h-px bg-indigo-500/30" />
                      <p className="text-[10px] md:text-[12px] font-premium font-bold uppercase tracking-[0.2em] text-indigo-400">Save Your Insights</p>
                    </div>
                    <p className="text-xs md:text-base text-zinc-400 font-light leading-relaxed">
                      Typed answers are preserved linked to your account, allowing you to build a personal journal of reflections as you progress through the Quran.
                    </p>
                  </div>
                </div>
              )}

              {currentSlide === 3 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-lg">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-500/10 rounded-2xl md:rounded-3xl flex items-center justify-center mb-6 md:mb-8 mx-auto ring-1 ring-blue-500/20">
                    <svg className="w-8 h-8 md:w-10 md:h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl md:text-4xl font-premium font-light text-white mb-4 md:mb-6 tracking-tight">Update Previous Questions</h2>
                  <p className="text-sm md:text-lg text-zinc-400 leading-relaxed font-light mb-8 md:mb-10 px-2 md:px-0">
                    Click on any previous question to select it, then update its status or rewrite your answer using the buttons at the bottom.
                  </p>
                  <div className="p-3 md:p-4 bg-blue-500/5 rounded-xl md:rounded-2xl border border-blue-500/10 inline-block">
                    <p className="text-[10px] md:text-[12px] font-premium font-bold uppercase tracking-[0.2em] text-blue-400">Modify Your Progress Anytime</p>
                  </div>
                </div>
              )}

              {currentSlide === 4 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full max-w-lg">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-500/10 rounded-2xl md:rounded-3xl flex items-center justify-center mb-6 md:mb-8 mx-auto ring-1 ring-indigo-500/20">
                    <svg className="w-8 h-8 md:w-10 md:h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
                    </svg>
                  </div>
                  <h2 className="text-2xl md:text-4xl font-premium font-light text-white mb-4 md:mb-6 tracking-tight">Chapter Insights</h2>
                  <div className="space-y-3 md:space-y-4 text-left">
                    <div className="flex items-start gap-4 p-4 md:p-6 bg-white/5 rounded-2xl md:rounded-[24px] border border-white/[0.03]">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2" />
                      <p className="text-xs md:text-base text-zinc-400 font-light leading-relaxed">
                        <span className="text-white font-medium uppercase text-[10px] md:text-[12px] block mb-1">Chapter Stats</span> 
                        The dashboard tracks Total Questions, Answered, and Not Sure specifically for the current chapter.
                      </p>
                    </div>
                    <div className="flex items-start gap-4 p-4 md:p-6 bg-white/5 rounded-2xl md:rounded-[24px] border border-white/[0.03]">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2" />
                      <p className="text-xs md:text-base text-zinc-400 font-light leading-relaxed">
                        <span className="text-white font-medium uppercase text-[10px] md:text-[12px] block mb-1">Overall Progress</span> 
                        The percentage under your name reflects your Overall Quran Progress across all chapters combined.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {currentSlide === 5 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-lg">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-purple-500/10 rounded-2xl md:rounded-3xl flex items-center justify-center mb-6 md:mb-8 mx-auto ring-1 ring-purple-500/20">
                    <svg className="w-8 h-8 md:w-10 md:h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl md:text-4xl font-premium font-light text-white mb-4 md:mb-6 tracking-tight">Review Knowledge</h2>
                  <p className="text-sm md:text-lg text-zinc-400 leading-relaxed font-light mb-8 md:mb-10 px-2 md:px-0">
                    Once a chapter is 100% complete, you can double-click any question to review your answer alongside the original answer for deeper insights.
                  </p>
                  <div className="p-3 md:p-4 bg-purple-500/5 rounded-xl md:rounded-2xl border border-purple-500/10 inline-block">
                    <p className="text-[10px] md:text-[12px] font-premium font-bold uppercase tracking-[0.2em] text-purple-400">Deepen Your Study Post-Quiz</p>
                  </div>
                </div>
              )}

              {currentSlide === 6 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-lg">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-500/10 rounded-2xl md:rounded-3xl flex items-center justify-center mb-6 md:mb-8 mx-auto ring-1 ring-indigo-500/20">
                    <svg className="w-8 h-8 md:w-10 md:h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl md:text-4xl font-premium font-light text-white mb-4 md:mb-6 tracking-tight">Share Your Journey</h2>
                  <p className="text-sm md:text-lg text-zinc-400 leading-relaxed font-light mb-8 md:mb-10 px-2 md:px-0">
                    Inspire others by sharing your progress. Click the Share button to generate a beautiful card of your achievements.
                  </p>
                  <div className="p-3 md:p-4 bg-indigo-500/5 rounded-xl md:rounded-2xl border border-indigo-500/10 inline-block">
                    <p className="text-[10px] md:text-[12px] font-premium font-bold uppercase tracking-[0.2em] text-indigo-400">Invite Others to Reflection</p>
                  </div>
                </div>
              )}

              {currentSlide === 7 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-lg">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-500/10 rounded-2xl md:rounded-3xl flex items-center justify-center mb-6 md:mb-8 mx-auto ring-1 ring-indigo-500/20">
                    <svg className="w-8 h-8 md:w-10 md:h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl md:text-4xl font-premium font-light text-white mb-4 md:mb-6 tracking-tight">Seek True Knowledge</h2>
                  <p className="text-sm md:text-lg text-zinc-400 leading-relaxed font-light mb-8 md:mb-10 px-2 md:px-0">
                    Your progress is preserved in the cloud. Continue your journey of self-assessment and reflection every day.
                  </p>
                  <div className="px-6 md:px-10 py-8 md:py-10 bg-indigo-500/10 border border-indigo-500/20 rounded-[28px] md:rounded-[36px]">
                    <p className="text-2xl md:text-4xl font-arabic text-indigo-400 mb-4 md:mb-6 leading-loose">وَقُل رَّبِّ زِدْنِي عِلْمًا</p>
                    <p className="text-[12px] md:text-[15px] font-premium text-zinc-300 font-medium uppercase tracking-[0.15em] leading-relaxed">"And say: My Lord, increase me in knowledge."</p>
                    <p className="text-[10px] md:text-[12px] text-zinc-500 mt-3 md:mt-4 tracking-[0.2em]">[Surah Taha 20:114]</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Buttons */}
            <div className="p-6 md:p-10 flex gap-3 md:gap-4 mt-auto border-t border-white/[0.05]">
              {currentSlide > 0 ? (
                <button 
                  onClick={() => setCurrentSlide(prev => prev - 1)}
                  className="flex-1 py-3 md:py-4 border border-white/10 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-premium font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                >
                  Back
                </button>
              ) : null}
              
              {currentSlide < 7 ? (
                <button 
                  onClick={() => setCurrentSlide(prev => prev + 1)}
                  className="flex-[2] py-3 md:py-4 bg-white text-black rounded-xl md:rounded-2xl text-[10px] md:text-xs font-premium font-bold uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all shadow-xl"
                >
                  Next Step
                </button>
              ) : (
                <button 
                  onClick={markInstructionsViewed}
                  className="flex-[2] py-3 md:py-4 bg-indigo-500 text-white rounded-xl md:rounded-2xl text-[10px] md:text-xs font-premium font-bold uppercase tracking-[0.2em] hover:bg-indigo-400 transition-all shadow-xl shadow-indigo-500/20"
                >
                  Start Assessment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-0 md:p-6">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="relative w-full h-full md:h-auto md:max-w-sm bg-[#0d0d0d] border md:border-white/[0.1] rounded-none md:rounded-[40px] p-10 flex flex-col items-center justify-center text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <button onClick={() => setIsDeleteConfirmOpen(false)} className="absolute top-6 right-6 p-3 text-zinc-500 hover:text-white transition-colors rounded-2xl hover:bg-white/5">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-8 mx-auto ring-1 ring-amber-500/20">
              <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-2xl font-premium font-semibold text-white mb-4 tracking-tight">Are you sure?</h3>
            <p className="text-zinc-500 text-sm leading-relaxed mb-10">
              Marking this as "Not Sure" will <span className="font-medium">permanently delete</span> your saved answer for this question. This action cannot be undone.
            </p>
            <div className="w-full space-y-3">
              <button 
                onClick={confirmNotSureDelete}
                disabled={isDeletingAnswer}
                className="w-full py-4 bg-amber-500 text-white rounded-2xl text-xs font-premium font-bold uppercase tracking-[0.2em] hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeletingAnswer ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Yes, Delete Answer'
                )}
              </button>
              <button 
                onClick={() => !isDeletingAnswer && setIsDeleteConfirmOpen(false)}
                disabled={isDeletingAnswer}
                className="w-full py-4 bg-white/5 border border-white/10 text-zinc-400 rounded-2xl text-xs font-premium font-bold uppercase tracking-[0.2em] hover:bg-white/10 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Streak Celebration Overlay */}
      {showStreakCelebration && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none">
          {/* Background Dimming */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-500" />
          
          <div className="relative flex flex-col items-center animate-in fade-in zoom-in duration-500">
            {/* Floating Graphics/Particles Effect */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl animate-pulse delay-75" />
            
     
       
            
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 bg-gradient-to-tr from-emerald-400 to-emerald-600 rounded-[40px] flex items-center justify-center mb-10 rotate-12 shadow-[0_25px_50px_rgba(16,185,129,0.4)] ring-8 ring-white/10">
                <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                </svg>
              </div>
              
              <div className="text-center relative">
                <h2 className="text-7xl md:text-8xl font-premium font-black text-white mb-2 tracking-tighter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] italic">
                  {streak} IN A ROW!
                </h2>
                <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent mb-6 opacity-80" />
               
              </div>
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
          <div className="absolute top-[-50px] right-[-50px] w-[300px] h-[300px] bg-indigo-500/[0.06] rounded-full blur-[80px] -z-10" />
          <div className="absolute bottom-[-50px] left-[-50px] w-[300px] h-[300px] bg-white/[0.01] rounded-full blur-[80px] -z-10" />
          
          {/* Branding Header */}
          <div className="w-full flex justify-between items-center mb-10 pb-6 border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
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
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-indigo-400">{(user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()}</span>
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
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <p className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-indigo-400">Chapter {currentRegistryItem.id}</p>
             </div>
             <div className="flex flex-col items-center gap-1">
               <h1 className="text-4xl font-premium font-light text-white tracking-tighter">{currentRegistryItem.englishName}</h1>
               <span className="text-3xl font-arabic text-indigo-400/90">{currentRegistryItem.arabicName}</span>
             </div>
          </div>
          
                    {/* Main Stats Grid */}
                    <div className="w-full grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[24px] flex flex-col gap-6">
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-premium font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">Answered</span>
                            <span className="text-4xl font-premium font-bold text-emerald-400">{stats.answeredCount}</span>
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
          <div className="absolute top-[-50px] right-[-50px] w-[300px] h-[300px] bg-indigo-500/[0.06] rounded-full blur-[80px] -z-10" />
          <div className="absolute bottom-[-50px] left-[-50px] w-[300px] h-[300px] bg-white/[0.01] rounded-full blur-[80px] -z-10" />
          
          {/* Branding Header */}
          <div className="w-full flex justify-between items-center mb-10 pb-6 border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.976 8.976 0 00-1.318.236 1 1 0 01-1.091-.637 2.993 2.993 0 00-.816-1.112c-.4-.307-.862-.533-1.352-.667z" />
                </svg>
              </div>
              <span className="text-2xl font-premium font-bold text-white tracking-tight">QuranFurqan</span>
            </div>
            <p className="text-[10px] font-premium font-bold uppercase tracking-[0.3em] text-zinc-500">Answer Insight</p>
          </div>

          {/* Chapter Info */}
          <div className="w-full mb-12 flex flex-col items-center">
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-4">
                <p className="text-[10px] font-premium font-bold uppercase tracking-[0.2em] text-indigo-400">Chapter {currentRegistryItem.id}</p>
             </div>
             <div className="flex flex-col items-center gap-2 text-center">
               <h1 className="text-4xl font-premium font-light text-white tracking-tighter">{currentRegistryItem.englishName}</h1>
               <span className="text-3xl font-arabic text-indigo-400/90">{currentRegistryItem.arabicName}</span>
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
                <div className="w-10 h-px bg-indigo-500/30" />
                <p className="text-[11px] font-premium font-bold uppercase tracking-[0.3em] text-indigo-400">Original Answer</p>
                <div className="w-10 h-px bg-indigo-500/30" />
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
