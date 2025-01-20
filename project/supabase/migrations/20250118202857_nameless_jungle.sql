/*
  # Fix RLS policies for posts table

  1. Changes
    - Simplify and fix posts table RLS policies
    - Ensure proper access control for authenticated users
    - Fix policy issues causing 42501 errors

  2. Security
    - Enable RLS on posts table
    - Add policies for CRUD operations
    - Ensure users can only access their own data
*/

-- First, drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read own posts" ON posts;
DROP POLICY IF EXISTS "Users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;

-- Re-enable RLS (in case it was disabled)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

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