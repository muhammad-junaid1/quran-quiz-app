-- Create UserChaptersOverview table for storing all chapters progress percentages for each user
-- One record per user containing a JSONB object mapping chapter_id -> progress_percentage

CREATE TABLE IF NOT EXISTS user_chapters_overview (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  chapters_progress JSONB DEFAULT '{}'::jsonb NOT NULL,
  -- chapters_progress structure: {"1": 45, "2": 100, "3": 0, ...}
  -- where key is chapter_id (as string) and value is progress_percentage (0-100)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_chapters_overview_email ON user_chapters_overview(email);

-- Create GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_user_chapters_overview_progress ON user_chapters_overview USING GIN (chapters_progress);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_chapters_overview_updated_at 
    BEFORE UPDATE ON user_chapters_overview 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE user_chapters_overview ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own overview
CREATE POLICY "Users can read their own overview"
  ON user_chapters_overview
  FOR SELECT
  USING (auth.jwt() ->> 'email' = email);

-- Create policy to allow users to insert their own overview
CREATE POLICY "Users can insert their own overview"
  ON user_chapters_overview
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = email);

-- Create policy to allow users to update their own overview
CREATE POLICY "Users can update their own overview"
  ON user_chapters_overview
  FOR UPDATE
  USING (auth.jwt() ->> 'email' = email);

-- Create policy to allow users to delete their own overview
CREATE POLICY "Users can delete their own overview"
  ON user_chapters_overview
  FOR DELETE
  USING (auth.jwt() ->> 'email' = email);
