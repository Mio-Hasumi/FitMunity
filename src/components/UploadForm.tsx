import React, { useState, useRef } from 'react';
import { Upload, Tag as TagIcon, Plus, X, Image as ImageIcon, Send } from 'lucide-react';
import type { Tag, Post } from '../types';

interface UploadFormProps {
  onPost?: (post: Omit<Post, 'id' | 'timestamp' | 'comments'>) => void;
}

export default function UploadForm({ onPost }: UploadFormProps) {
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState('');
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultTags: Tag[] = ['Mood', 'Food', 'Fitness', 'Achievements'];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCustomTag = () => {
    if (newTag.trim() && !customTags.includes(newTag.trim())) {
      setCustomTags([...customTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !image) return;

    const post = {
      content: content.trim(),
      type: image ? 'image' as const : 'text' as const,
      mediaUrl: imagePreview || undefined,
      tags: [...selectedTags, ...customTags],
    };

    onPost?.(post);

    // Reset form
    setContent('');
    setSelectedTags([]);
    setCustomTags([]);
    setImage(null);
    setImagePreview(null);
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Tags Section */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-wrap gap-2 mb-3">
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
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm
                  ${
                    selectedTags.includes(tag)
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                <TagIcon className="w-4 h-4 mr-1" />
                {tag}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add custom tag"
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomTag();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddCustomTag}
              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {customTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {customTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
                >
                  <TagIcon className="w-3 h-3 mr-1" />
                  {tag}
                  <button
                    type="button"
                    onClick={() => setCustomTags(customTags.filter((t) => t !== tag))}
                    className="ml-1 p-0.5 hover:bg-indigo-200 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Chat-like Input Section */}
        <form onSubmit={handleSubmit} className="p-4">
          {imagePreview && (
            <div className="relative mb-4 rounded-lg overflow-hidden">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-h-64 object-contain bg-gray-50"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 p-1 bg-gray-900 bg-opacity-50 hover:bg-opacity-70 rounded-full text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          
          <div className="flex items-end gap-2">
            <div className="flex-1 min-h-[80px] bg-white rounded-lg border border-gray-200">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind? Type your message here..."
                className="w-full p-3 rounded-t-lg focus:ring-0 focus:border-transparent resize-none"
                rows={3}
              />
              <div className="px-3 py-2 border-t border-gray-100">
                <label className="cursor-pointer inline-flex items-center gap-2 text-gray-600 hover:text-indigo-600">
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-sm">Add image</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={!content.trim() && !image}
              className="p-3 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}