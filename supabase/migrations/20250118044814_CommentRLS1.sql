/*
  # Update RLS policies for comment clusters

  1. Changes
    - Drop existing RLS policies for comment_clusters table
    - Create new, more permissive policies that allow proper creation and management of comment clusters
    
  2. Security
    - Policies ensure users can only access clusters related to their own posts
    - Maintains data isolation between users while allowing proper functionality
*/


-- Create new policies
CREATE POLICY "Users can read own post clusters"
  ON comment_clusters
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = comment_clusters.post_id
    AND posts.user_id = auth.uid()
  ));

CREATE POLICY "Users can create clusters"
  ON comment_clusters
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = post_id
    AND posts.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own post clusters"
  ON comment_clusters
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = post_id
    AND posts.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = post_id
    AND posts.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own post clusters"
  ON comment_clusters
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = post_id
    AND posts.user_id = auth.uid()
  ));
