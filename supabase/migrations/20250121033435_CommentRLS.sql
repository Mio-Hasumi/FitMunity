-- Re-enable RLS
ALTER TABLE comment_clusters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own post clusters" ON comment_clusters;
DROP POLICY IF EXISTS "Users can create clusters" ON comment_clusters;
DROP POLICY IF EXISTS "Users can update own post clusters" ON comment_clusters;
DROP POLICY IF EXISTS "Users can delete own post clusters" ON comment_clusters;
DROP POLICY IF EXISTS "Enable read access for own post clusters" ON comment_clusters;
DROP POLICY IF EXISTS "Enable insert access for own post clusters" ON comment_clusters;
DROP POLICY IF EXISTS "Enable update access for own post clusters" ON comment_clusters;
DROP POLICY IF EXISTS "Enable delete access for own post clusters" ON comment_clusters;

-- Create new simplified policies
CREATE POLICY "Enable read access for authenticated users"
  ON comment_clusters FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users"
  ON comment_clusters FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_id
      AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Enable update access for authenticated users"
  ON comment_clusters FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_id
      AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Enable delete access for authenticated users"
  ON comment_clusters FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_id
      AND posts.user_id = auth.uid()
    )
  );
