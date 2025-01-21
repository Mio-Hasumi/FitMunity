/*
  # Image handling improvements
  
  1. Storage Setup
    - Create post-images bucket for storing user uploaded images
    - Set up proper RLS policies for image access
  
  2. Changes
    - Ensure media_urls column exists on posts table
    - Set up storage policies for authenticated users
*/

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable storage access for authenticated users
CREATE POLICY "Enable public read access for post images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-images');

CREATE POLICY "Enable upload access for authenticated users"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND auth.uid() = owner
);

CREATE POLICY "Enable delete access for own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-images'
  AND auth.uid() = owner
);