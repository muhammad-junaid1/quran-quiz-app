-- Create UserChapterProgress table for storing user progress per chapter
-- Each record represents progress for a specific user and chapter

CREATE TABLE IF NOT EXISTS user_chapter_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  chapter_id INTEGER NOT NULL,
  answered_question_ids TEXT[] DEFAULT '{}' NOT NULL,
  not_sure_question_ids TEXT[] DEFAULT '{}' NOT NULL,
  active_index INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(email, chapter_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_chapter_progress_email_chapter ON user_chapter_progress(email, chapter_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_chapter_progress_updated_at 
    BEFORE UPDATE ON user_chapter_progress 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE user_chapter_progress ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own progress
CREATE POLICY "Users can read their own progress"
  ON user_chapter_progress
  FOR SELECT
  USING (auth.jwt() ->> 'email' = email);

-- Create policy to allow users to insert their own progress
CREATE POLICY "Users can insert their own progress"
  ON user_chapter_progress
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = email);

-- Create policy to allow users to update their own progress
CREATE POLICY "Users can update their own progress"
  ON user_chapter_progress
  FOR UPDATE
  USING (auth.jwt() ->> 'email' = email);

-- Create policy to allow users to delete their own progress
CREATE POLICY "Users can delete their own progress"
  ON user_chapter_progress
  FOR DELETE
  USING (auth.jwt() ->> 'email' = email);

