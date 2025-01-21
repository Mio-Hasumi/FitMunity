/*
  # Fix posts table schema

  1. Changes
    - Add media_urls column to posts table
    - Drop old media_url column
    - Re-enable RLS and update policies
*/

-- Add media_urls column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'media_urls'
  ) THEN
    ALTER TABLE posts ADD COLUMN media_urls text[] DEFAULT '{}';
  END IF;
END $$;

-- Drop old media_url column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'media_url'
  ) THEN
    ALTER TABLE posts DROP COLUMN media_url;
  END IF;
END $$;

-- Re-enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for own posts" ON posts;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON posts;
DROP POLICY IF EXISTS "Enable update access for own posts" ON posts;
DROP POLICY IF EXISTS "Enable delete access for own posts" ON posts;

-- Create new simplified policies
CREATE POLICY "Enable read access for own posts"
  ON posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Enable insert access for authenticated users"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update access for own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete access for own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
