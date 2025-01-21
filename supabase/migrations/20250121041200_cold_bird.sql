/*
  # Update storage policies for public access
  
  1. Changes
    - Make storage bucket public
    - Drop all existing policies to avoid conflicts
    - Create new simplified policies for better accessibility
*/

-- Ensure storage bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'post-images';

-- Drop ALL existing policies to avoid conflicts
DO $$ 
BEGIN
  -- Drop all policies for the objects table in storage schema
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- Create new simplified policies
CREATE POLICY "public_read_access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-images');

CREATE POLICY "authenticated_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-images');

CREATE POLICY "authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'post-images');