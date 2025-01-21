-- Create comment_clusters table
CREATE TABLE IF NOT EXISTS comment_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts ON DELETE CASCADE NOT NULL,
  persona_name text NOT NULL,
  persona_style text NOT NULL,
  persona_system_role text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid REFERENCES comment_clusters ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  type text NOT NULL,
  expertise_area text,
  user_name text,
  likes integer DEFAULT 0,
  target_likes integer DEFAULT 0,
  is_user_reply boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE comment_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policies for comments
CREATE POLICY "Users can read comments on own posts"
  ON comments
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM comment_clusters
    JOIN posts ON posts.id = comment_clusters.post_id
    WHERE comment_clusters.id = comments.cluster_id
    AND posts.user_id = auth.uid()
  ));

CREATE POLICY "Users can create comments on own posts"
  ON comments
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM comment_clusters
    JOIN posts ON posts.id = comment_clusters.post_id
    WHERE comment_clusters.id = cluster_id
    AND posts.user_id = auth.uid()
  ));

CREATE POLICY "Users can update comments on own posts"
  ON comments
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM comment_clusters
    JOIN posts ON posts.id = comment_clusters.post_id
    WHERE comment_clusters.id = cluster_id
    AND posts.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete comments on own posts"
  ON comments
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM comment_clusters
    JOIN posts ON posts.id = comment_clusters.post_id
    WHERE comment_clusters.id = cluster_id
    AND posts.user_id = auth.uid()
  ));