/**
 * Quran API Service
 * 
 * This service fetches Quranic data from the public Quran.com API (v4).
 * It provides verse-by-verse translations for review.
 */

const BASE_URL = 'https://api.quran.com/api/v4';
const SAHEEH_INTERNATIONAL_ID = 20;

export interface TranslationVerse {
  id: number;
  verse_key: string;
  translations: {
    resource_id: number;
    text: string;
  }[];
}

/**
 * Fetches the translations for an entire chapter.
 * Uses Saheeh International (ID: 20) by default.
 * 
 * @param chapterId The ID of the Suarh (1-114)
 * @returns Promise with array of verses and their translations
 */
export async function fetchChapterTranslation(chapterId: number): Promise<TranslationVerse[]> {
  try {
    // We fetch with a large per_page to ensure we get the whole chapter in one go.
    // The longest chapter (Al-Baqarah) has 286 verses.
    const url = `${BASE_URL}/verses/by_chapter/${chapterId}?translations=${SAHEEH_INTERNATIONAL_ID}&per_page=300`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch translation: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.verses || [];
  } catch (error) {
    console.error('Quran API Error:', error);
    throw error;
  }
}
