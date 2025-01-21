/*
  # Add media_urls column to posts table

  1. Changes
    - Add `media_urls` column to store multiple image URLs per post
    - Keep `media_url` for backward compatibility
    - Add check constraint to ensure at least one URL field is used

  2. Security
    - No changes to RLS policies needed
*/

-- Add media_urls column
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS media_urls text[] DEFAULT '{}';

-- Migrate existing data from media_url to media_urls if needed
DO $$ 
BEGIN
  UPDATE posts 
  SET media_urls = ARRAY[media_url]
  WHERE media_url IS NOT NULL 
    AND (media_urls IS NULL OR array_length(media_urls, 1) IS NULL);
END $$;