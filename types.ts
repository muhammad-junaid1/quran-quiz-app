
export interface Question {
  id: string;
  text: string;
}

export interface Surah {
  id: number;
  englishName: string;
  arabicName: string;
  translation: string;
  revelationType: string;
  questions: Question[];
}

export interface UserState {
  currentSurahId: number;
  activeQuestionIndex: number;
  correctQuestionIds: string[];
}
