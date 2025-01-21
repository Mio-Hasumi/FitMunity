/*
  # Update storage policies for public access
  
  1. Changes
    - Make storage bucket public
    - Simplify storage policies for better accessibility
    - Ensure images are always publicly accessible
*/

-- Ensure storage bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'post-images';

-- Drop existing policies
DROP POLICY IF EXISTS "Enable public read access for post images" ON storage.objects;
DROP POLICY IF EXISTS "Enable upload access for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete access for own images" ON storage.objects;

-- Create simplified policies
CREATE POLICY "Allow public read access to all images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-images');

CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-images');

CREATE POLICY "Allow users to delete their images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'post-images');
