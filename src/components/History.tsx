import React, { useState } from 'react';
import { Calendar, Tag as TagIcon, Loader2, Trash2, Heart, MessageCircle, Send, Utensils } from 'lucide-react';
import type { Post, Tag, Comment, CommentCluster } from '../types';

interface HistoryProps {
  posts: Post[];
  isGeneratingComment?: boolean;
  onDeletePost?: (postId: string) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
  onAddReply?: (postId: string, clusterId: string, content: string) => void;
  onLikeComment?: (postId: string, commentId: string) => void;
  onLikePost?: (postId: string) => void;
  currentUserId: string;
}

export default function History({ 
  posts, 
  isGeneratingComment, 
  onDeletePost,
  onDeleteComment,
  onAddReply,
  onLikeComment,
  onLikePost,
  currentUserId
}: HistoryProps) {
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [replyContents, setReplyContents] = useState<Record<string, string>>({});
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<{ postId: string; commentId: string } | null>(null);
  const tags: Tag[] = ['Mood', 'Food', 'Fitness', 'Achievements'];

  const filteredPosts = selectedTag
    ? posts.filter(post => post.tags.includes(selectedTag))
    : posts;

  const handleReplyChange = (clusterId: string, content: string) => {
    setReplyContents(prev => ({
      ...prev,
      [clusterId]: content
    }));
  };

  const handleReplySubmit = (postId: string, clusterId: string, e: React.FormEvent) => {
    e.preventDefault();
    const content = replyContents[clusterId]?.trim();
    if (content) {
      onAddReply?.(postId, clusterId, content);
      setReplyContents(prev => ({
        ...prev,
        [clusterId]: ''
      }));
    }
  };

  const renderComments = (cluster: CommentCluster, postId: string) => (
    <div key={cluster.id} className="space-y-4 mt-4">
      {cluster.comments.map((comment, index) => (
        <div
          key={comment.id}
          style={{ marginLeft: `${index * 2}rem` }}
          className="bg-white rounded-lg p-4 shadow-sm border border-gray-100"
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              comment.type === 'expert' ? 'bg-blue-100' : 'bg-indigo-100'
            }`}>
              {comment.userName?.[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div>
                    <span className="font-medium text-gray-900">
                      {comment.isUserReply ? 'You' : comment.userName}
                    </span>
                    {comment.type === 'expert' && (
                      <span className="ml-2 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {comment.expertiseArea}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">·</span>
                  <span className="text-sm text-gray-500">
                    {new Date(comment.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <button
                  onClick={() => setCommentToDelete({ postId, commentId: comment.id })}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-gray-700 mt-1">{comment.content}</p>
              <div className="flex items-center gap-4 mt-3">
                <button
                  onClick={() => onLikeComment?.(postId, comment.id)}
                  className={`flex items-center gap-1 text-sm ${
                    comment.likedBy.includes(currentUserId)
                      ? 'text-indigo-600'
                      : 'text-gray-500 hover:text-indigo-600'
                  }`}
                >
                  <Heart 
                    className="w-4 h-4" 
                    fill={comment.likedBy.includes(currentUserId) ? 'currentColor' : 'none'} 
                  />
                  <span>{comment.likes}</span>
                </button>
                {!comment.isUserReply && (
                  <button
                    onClick={() => {
                      const replyInput = document.getElementById(`reply-${cluster.id}`);
                      if (replyInput) {
                        replyInput.focus();
                      }
                    }}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Reply</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      <form 
        onSubmit={(e) => handleReplySubmit(postId, cluster.id, e)}
        className="flex gap-2 mt-2"
        style={{ marginLeft: `${cluster.comments.length * 2}rem` }}
      >
        <input
          type="text"
          id={`reply-${cluster.id}`}
          value={replyContents[cluster.id] || ''}
          onChange={(e) => handleReplyChange(cluster.id, e.target.value)}
          placeholder="Write a reply..."
          className="flex-1 px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
        />
        <button
          type="submit"
          disabled={!replyContents[cluster.id]?.trim()}
          className="p-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm
              ${selectedTag === tag
                ? 'bg-indigo-100 text-indigo-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <TagIcon className="w-4 h-4 mr-1" />
            {tag}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {filteredPosts.map((post) => (
          <div key={post.id} className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-500">
                  {new Date(post.timestamp).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setPostToDelete(post.id)}
                className="text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {post.type === 'image' && post.mediaUrl && (
              <img
                src={post.mediaUrl}
                alt="Post"
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}

            <p className="text-gray-700 mb-4">{post.content}</p>

            {post.tags.includes('Food') && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-indigo-50 rounded-lg">
                <Utensils className="w-5 h-5 text-indigo-600" />
                <span className="text-indigo-600 font-medium">
                  {post.calories !== undefined ? (
                    <>
                      {post.calories} calories
                      {post.calories === 0 && ' (calculating...)'}
                    </>
                  ) : (
                    'Calculating calories...'
                  )}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                >
                  <TagIcon className="w-3 h-3 mr-1" />
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-4 border-t border-gray-100 pt-4">
              <button
                onClick={() => onLikePost?.(post.id)}
                className={`flex items-center gap-1 text-sm ${
                  post.likedBy.includes(currentUserId)
                    ? 'text-indigo-600'
                    : 'text-gray-500 hover:text-indigo-600'
                }`}
              >
                <Heart 
                  className="w-4 h-4" 
                  fill={post.likedBy.includes(currentUserId) ? 'currentColor' : 'none'} 
                />
                <span>{post.likes}</span>
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {isGeneratingComment && post.commentClusters.length === 0 && (
                <div className="flex items-center justify-center py-4 text-gray-500">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating responses...
                </div>
              )}
              {post.commentClusters.map(cluster => renderComments(cluster, post.id))}
            </div>
          </div>
        ))}
      </div>

      {postToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm mx-4">
            <h3 className="text-lg font-medium mb-4">Delete Post</h3>
            <p className="text-gray-500 mb-4">Are you sure you want to delete this post? This action cannot be undone.</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setPostToDelete(null)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeletePost?.(postToDelete);
                  setPostToDelete(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {commentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm mx-4">
            <h3 className="text-lg font-medium mb-4">Delete Comment</h3>
            <p className="text-gray-500 mb-4">Are you sure you want to delete this comment? This action cannot be undone.</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setCommentToDelete(null)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteComment?.(commentToDelete.postId, commentToDelete.commentId);
                  setCommentToDelete(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}