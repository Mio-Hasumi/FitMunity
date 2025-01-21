import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Tag as TagIcon, Plus, X } from 'lucide-react';
import type { Tag, Post } from '../types';
import ImageGallery from './ImageGallery';

interface UploadFormProps {
  onPost?: (post: Omit<Post, 'id' | 'timestamp' | 'commentClusters' | 'likes' | 'targetLikes' | 'likedBy'> & { files?: File[] }) => void;
}

export default function UploadForm({ onPost }: UploadFormProps) {
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultTags: Tag[] = ['Mood', 'Food', 'Fitness', 'Achievements'];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length) {
      setFiles(prev => [...prev, ...selectedFiles]);
      
      selectedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !files.length) return;

    const post = {
      content: content.trim(),
      type: files.length ? 'image' as const : 'text' as const,
      files: files.length ? files : undefined,
      tags: selectedTags,
    };

    onPost?.(post);

    // Reset form
    setContent('');
    setSelectedTags([]);
    setFiles([]);
    setImagePreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tags */}
      <div className="p-4 flex flex-wrap gap-2">
        {defaultTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => 
              setSelectedTags(
                selectedTags.includes(tag)
                  ? selectedTags.filter((t) => t !== tag)
                  : [...selectedTags, tag]
              )
            }
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              ${selectedTags.includes(tag)
                ? 'bg-indigo-100 text-indigo-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <TagIcon className="w-4 h-4 mr-1" />
            {tag}
          </button>
        ))}
      </div>

      {/* Image Preview */}
      {imagePreviews.length > 0 && (
        <div className="px-4">
          <ImageGallery 
            images={imagePreviews} 
            onRemove={handleRemoveImage}
            editable
          />
        </div>
      )}

      {/* Content Input */}
      <div className="p-4 space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full p-3 min-h-[120px] rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          rows={4}
        />

        <div className="flex items-center justify-between">
          <label className="cursor-pointer inline-flex items-center gap-2 text-gray-600 hover:text-indigo-600">
            <ImageIcon className="w-5 h-5" />
            <span className="text-sm">Add images</span>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleImageChange}
            />
          </label>

          <button
            type="submit"
            disabled={!content.trim() && !files.length}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Post
          </button>
        </div>
      </div>
    </form>
  );
}