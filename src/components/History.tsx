import React, { useState } from 'react';
import { MessageCircle, Tag as TagIcon, Send, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { generateComment } from '../services/openai';
import type { Post, Tag } from '../types';
import ImageGallery from './ImageGallery';
import { supabase } from '../lib/supabase';

interface HistoryProps {
  posts: Post[];
  isGeneratingComment?: boolean;
  onDeletePost?: (postId: string) => void;
  currentUserId: string;
}

export default function History({ 
  posts, 
  isGeneratingComment,
  onDeletePost,
  currentUserId 
}: HistoryProps) {
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [replyContents, setReplyContents] = useState<Record<string, string>>({});
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<{ postId: string; clusterId: string; commentId: string } | null>(null);
  const { setPosts } = useAppContext();
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

  const handleDeleteComment = async (postId: string, clusterId: string, commentId: string) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const cluster = post.commentClusters.find(c => c.id === clusterId);
      if (!cluster) return;

      // Find the comment to be deleted
      const commentToDelete = cluster.comments.find(c => c.id === commentId);
      if (!commentToDelete) return;

      // If this is the first comment in the cluster (main persona comment)
      const isMainComment = cluster.comments[0]?.id === commentId;

      if (isMainComment) {
        // Delete all comments in the cluster from Supabase
        const { error: deleteError } = await supabase
          .from('comments')
          .delete()
          .eq('cluster_id', clusterId);

        if (deleteError) {
          console.error('Error deleting comments:', deleteError);
          throw deleteError;
        }

        // Delete the cluster itself
        const { error: clusterError } = await supabase
          .from('comment_clusters')
          .delete()
          .eq('id', clusterId);

        if (clusterError) {
          console.error('Error deleting cluster:', clusterError);
          throw clusterError;
        }

        // Update local state to remove the entire cluster
        setPosts(prevPosts => 
          prevPosts.map(p => {
            if (p.id === postId) {
              return {
                ...p,
                commentClusters: p.commentClusters.filter(c => c.id !== clusterId)
              };
            }
            return p;
          })
        );

        // Clear any reply content for this cluster
        setReplyContents(prev => {
          const updated = { ...prev };
          delete updated[clusterId];
          return updated;
        });
      } else {
        // Delete just the single comment
        const { error } = await supabase
          .from('comments')
          .delete()
          .eq('id', commentId)
          .eq('cluster_id', clusterId);

        if (error) {
          console.error('Error deleting comment:', error);
          throw error;
        }

        // Update local state
        setPosts(prevPosts => 
          prevPosts.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                commentClusters: post.commentClusters.map(cluster => {
                  if (cluster.id === clusterId) {
                    return {
                      ...cluster,
                      comments: cluster.comments.filter(comment => comment.id !== commentId)
                    };
                  }
                  return cluster;
                })
              };
            }
            return post;
          })
        );
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    } finally {
      setCommentToDelete(null);
    }
  };

  const handleReplySubmit = async (postId: string, clusterId: string, e: React.FormEvent) => {
    e.preventDefault();
    const content = replyContents[clusterId]?.trim();
    if (!content) return;

    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const cluster = post.commentClusters.find(c => c.id === clusterId);
      if (!cluster) return;

      const userReply = {
        id: crypto.randomUUID(),
        content,
        type: 'user' as const,
        userName: 'You',
        timestamp: new Date(),
        likes: 0,
        targetLikes: Math.floor(Math.random() * 30) + 1,
        likedBy: [],
        isUserReply: true
      };

      // Add user's reply to the cluster
      cluster.comments.push(userReply);

      // Generate AI response
      const aiResponse = await generateComment(post, true, clusterId, content);
      if ('content' in aiResponse) {
        cluster.comments.push(aiResponse);
      }

      // Clear the reply input
      setReplyContents(prev => ({
        ...prev,
        [clusterId]: ''
      }));
    } catch (error) {
      console.error('Error handling reply:', error);
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Tags */}
      <div className="flex flex-wrap gap-2 sticky top-14 bg-[#F3F0FF] py-2 z-40">
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors
              ${selectedTag === tag
                ? 'bg-indigo-100 text-indigo-800'
                : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
          >
            <TagIcon className="w-4 h-4 inline-block mr-1" />
            {tag}
          </button>
        ))}
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {filteredPosts.map((post) => (
          <PostCard 
            key={post.id} 
            post={post}
            replyContent={replyContents}
            onReplyChange={handleReplyChange}
            onReplySubmit={handleReplySubmit}
            onDeletePost={() => setPostToDelete(post.id)}
            onDeleteComment={(clusterId, commentId) => 
              setCommentToDelete({ postId: post.id, clusterId, commentId })}
            isOwner={post.userId === currentUserId}
          />
        ))}
      </div>

      {/* Delete Post Confirmation Modal */}
      {postToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-auto">
            <h3 className="text-lg font-medium mb-4">Delete Post</h3>
            <p className="text-gray-500 mb-4">
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setPostToDelete(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (postToDelete && onDeletePost) {
                    onDeletePost(postToDelete);
                    setPostToDelete(null);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Comment Confirmation Modal */}
      {commentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-auto">
            <h3 className="text-lg font-medium mb-4">Delete Comment</h3>
            <p className="text-gray-500 mb-4">
              Are you sure you want to delete this comment? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setCommentToDelete(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (commentToDelete) {
                    handleDeleteComment(
                      commentToDelete.postId,
                      commentToDelete.clusterId,
                      commentToDelete.commentId
                    );
                  }
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

function PostCard({ 
  post,
  replyContent,
  onReplyChange,
  onReplySubmit,
  onDeletePost,
  onDeleteComment,
  isOwner
}: { 
  post: Post;
  replyContent: Record<string, string>;
  onReplyChange: (clusterId: string, content: string) => void;
  onReplySubmit: (postId: string, clusterId: string, e: React.FormEvent) => void;
  onDeletePost: () => void;
  onDeleteComment: (clusterId: string, commentId: string) => void;
  isOwner: boolean;
}) {
  const [showComments, setShowComments] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Post Content */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-sm font-medium text-indigo-600">
                {post.userId?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {new Date(post.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isOwner && (
              <button
                onClick={onDeletePost}
                className="p-1 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center space-x-1">
              <span className="text-sm font-medium text-gray-500">
                {post.commentClusters.reduce((total, cluster) => total + cluster.comments.length, 0)}
              </span>
              <button
                onClick={() => setShowComments(!showComments)}
                className="text-gray-500 hover:text-indigo-600"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <p className="mt-2 text-gray-900">{post.content}</p>

        {post.type === 'image' && post.mediaUrls && (
          <div className="mt-3">
            <ImageGallery images={post.mediaUrls} />
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700"
            >
              <TagIcon className="w-3 h-3 mr-1" />
              {tag}
            </span>
          ))}
        </div>

        {post.tags.includes('Food') && post.calories !== undefined && (
          <div className="mt-3 text-sm text-gray-500">
            {post.calories} calories
          </div>
        )}
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-gray-100">
          {post.commentClusters.map((cluster) => (
            <div key={cluster.id} className="p-4 space-y-4">
              {cluster.comments.map((comment, index) => (
                <div
                  key={comment.id}
                  className={`flex items-start gap-3 ${
                    index > 0 ? 'ml-8 border-l-2 border-gray-100 pl-4' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    comment.type === 'expert' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    {comment.userName?.[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {comment.isUserReply ? 'You' : comment.userName}
                        </span>
                        {comment.type === 'expert' && (
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            {comment.expertiseArea}
                          </span>
                        )}
                      </div>
                      {isOwner && (
                        <button
                          onClick={() => onDeleteComment(cluster.id, comment.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-gray-700">{comment.content}</p>
                  </div>
                </div>
              ))}

              {/* Reply Form */}
              {cluster.comments.length > 0 && (
                <form 
                  onSubmit={(e) => onReplySubmit(post.id, cluster.id, e)}
                  className="flex gap-2 mt-2 ml-8"
                >
                  <input
                    type="text"
                    value={replyContent[cluster.id] || ''}
                    onChange={(e) => onReplyChange(cluster.id, e.target.value)}
                    placeholder="Write a reply..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!replyContent[cluster.id]?.trim()}
                    className="p-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
