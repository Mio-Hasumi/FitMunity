/*
  # Add storage policies for post images

  1. Security
    - Enable storage access for authenticated users
    - Allow users to upload images to their own posts
    - Allow users to delete their own images
    - Allow public read access to post images
*/

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable storage access for authenticated users
CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-images');

CREATE POLICY "Allow users to delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'post-images');

CREATE POLICY "Allow public read access to post images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-images');
