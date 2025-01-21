/*
  # Add comment deletion functionality

  1. Changes
    - Drop existing comment policies
    - Add new simplified policies for comments table
    - Enable full CRUD operations for authenticated users on their own posts' comments

  2. Security
    - Enable RLS on comments table
    - Add policies for authenticated users
    - Ensure users can only modify comments on their own posts
*/

-- Re-enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read comments on own posts" ON comments;
DROP POLICY IF EXISTS "Users can create comments on own posts" ON comments;
DROP POLICY IF EXISTS "Users can update comments on own posts" ON comments;
DROP POLICY IF EXISTS "Users can delete comments on own posts" ON comments;

-- Create new simplified policies
CREATE POLICY "comments_select"
ON comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM comment_clusters
    JOIN posts ON posts.id = comment_clusters.post_id
    WHERE comment_clusters.id = cluster_id
  )
);

CREATE POLICY "comments_insert"
ON comments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM comment_clusters
    JOIN posts ON posts.id = comment_clusters.post_id
    WHERE comment_clusters.id = cluster_id
    AND posts.user_id = auth.uid()
  )
);

CREATE POLICY "comments_update"
ON comments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM comment_clusters
    JOIN posts ON posts.id = comment_clusters.post_id
    WHERE comment_clusters.id = cluster_id
    AND posts.user_id = auth.uid()
  )
);

CREATE POLICY "comments_delete"
ON comments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM comment_clusters
    JOIN posts ON posts.id = comment_clusters.post_id
    WHERE comment_clusters.id = cluster_id
    AND posts.user_id = auth.uid()
  )
);
