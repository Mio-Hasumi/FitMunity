import React, { useState } from 'react';
import { Upload, History as HistoryIcon, PieChart, LogOut, Loader2 } from 'lucide-react';
import UploadForm from '../components/UploadForm';
import History from '../components/History';
import Summary from '../components/Summary';
import { generateComment } from '../services/openai';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Post, CommentCluster, Comment } from '../types';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'upload' | 'history' | 'summary'>('upload');
  const [isGeneratingComment, setIsGeneratingComment] = useState(false);
  const { posts, setPosts, loading } = useAppContext();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleAddReply = async (postId: string, clusterId: string, content: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const userReply: Comment = {
      id: crypto.randomUUID(),
      content,
      type: 'user',
      userName: 'You',
      timestamp: new Date(),
      likes: 0,
      targetLikes: Math.floor(Math.random() * 30) + 1,
      likedBy: [],
      isUserReply: true
    };

    try {
      // Save user reply to database first
      const { error: userReplyError } = await supabase
        .from('comments')
        .insert({
          id: userReply.id,
          cluster_id: clusterId,
          content: userReply.content,
          type: userReply.type,
          user_name: userReply.userName,
          likes: userReply.likes,
          target_likes: userReply.targetLikes,
          is_user_reply: userReply.isUserReply,
          created_at: userReply.timestamp.toISOString()
        });

      if (userReplyError) {
        console.error('Error saving user reply:', userReplyError);
        return;
      }

      // Update local state with user reply
      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id !== postId) return post;

        return {
          ...post,
          commentClusters: post.commentClusters.map(cluster => {
            if (cluster.id !== clusterId) return cluster;

            return {
              ...cluster,
              comments: [...cluster.comments, userReply]
            };
          })
        };
      }));

      // Generate and save AI reply
      const aiReply = await generateComment(post, false, clusterId, content) as Comment;
      
      const { error: aiReplyError } = await supabase
        .from('comments')
        .insert({
          id: aiReply.id,
          cluster_id: clusterId,
          content: aiReply.content,
          type: aiReply.type,
          expertise_area: aiReply.expertiseArea,
          user_name: aiReply.userName,
          likes: aiReply.likes,
          target_likes: aiReply.targetLikes,
          is_user_reply: false,
          created_at: aiReply.timestamp.toISOString()
        });

      if (aiReplyError) {
        console.error('Error saving AI reply:', aiReplyError);
        return;
      }

      // Update local state with AI reply
      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id !== postId) return post;

        return {
          ...post,
          commentClusters: post.commentClusters.map(cluster => {
            if (cluster.id !== clusterId) return cluster;

            return {
              ...cluster,
              comments: [...cluster.comments, aiReply]
            };
          })
        };
      }));
    } catch (error) {
      console.error('Failed to handle reply:', error);
    }
  };

  const handlePost = async (newPost: Omit<Post, 'id' | 'timestamp' | 'commentClusters' | 'likes' | 'targetLikes' | 'likedBy'>) => {
    const post: Post = {
      ...newPost,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      commentClusters: [],
      likes: 0,
      targetLikes: Math.floor(Math.random() * 30) + 1,
      likedBy: [],
      userId: user?.id
    };

    try {
      // Save the post first
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          id: post.id,
          user_id: user?.id,
          content: post.content,
          type: post.type,
          media_url: post.mediaUrl,
          tags: post.tags,
          calories: post.calories,
          workout_details: post.workoutDetails,
          likes: post.likes,
          target_likes: post.targetLikes,
          created_at: post.timestamp.toISOString()
        });

      if (postError) {
        console.error('Error saving post:', postError);
        return;
      }

      // Update local state with the new post
      setPosts(prevPosts => [post, ...prevPosts]);
      setActiveTab('history');
      setIsGeneratingComment(true);

      // Generate and save comment clusters
      const clusters = await generateComment(post) as CommentCluster[];
      
      // Save each cluster and its comments
      for (const cluster of clusters) {
        // Save cluster
        const { error: clusterError } = await supabase
          .from('comment_clusters')
          .insert({
            id: cluster.id,
            post_id: post.id,
            persona_name: cluster.persona.name,
            persona_style: cluster.persona.style,
            persona_system_role: cluster.persona.systemRole,
            created_at: cluster.timestamp.toISOString()
          });

        if (clusterError) {
          console.error('Error saving cluster:', clusterError);
          continue;
        }

        // Save comments for this cluster
        const { error: commentsError } = await supabase
          .from('comments')
          .insert(
            cluster.comments.map(comment => ({
              id: comment.id,
              cluster_id: cluster.id,
              content: comment.content,
              type: comment.type,
              expertise_area: comment.expertiseArea,
              user_name: comment.userName,
              likes: comment.likes,
              target_likes: comment.targetLikes,
              is_user_reply: comment.isUserReply,
              created_at: comment.timestamp.toISOString()
            }))
          );

        if (commentsError) {
          console.error('Error saving comments:', commentsError);
          continue;
        }
      }

      // Update local state with clusters
      setPosts(prevPosts => prevPosts.map(p => 
        p.id === post.id 
          ? { ...p, commentClusters: clusters }
          : p
      ));
    } catch (error) {
      console.error('Failed to handle post:', error);
    } finally {
      setIsGeneratingComment(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      // Delete from Supabase first
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error deleting post:', error);
        return;
      }

      // If successful, update local state
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    try {
      // Delete from Supabase first
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        console.error('Error deleting comment:', error);
        return;
      }

      // If successful, update local state
      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id !== postId) return post;

        return {
          ...post,
          commentClusters: post.commentClusters.map(cluster => ({
            ...cluster,
            comments: cluster.comments.filter(comment => comment.id !== commentId)
          }))
        };
      }));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleLikePost = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isLiked = post.likedBy.includes(user?.id || '');
    const newLikes = isLiked ? post.likes - 1 : post.likes + 1;
    const newLikedBy = isLiked 
      ? post.likedBy.filter(id => id !== user?.id)
      : [...post.likedBy, user?.id || ''];

    try {
      const { error } = await supabase
        .from('posts')
        .update({ 
          likes: newLikes,
          liked_by: newLikedBy 
        })
        .eq('id', postId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error updating post likes:', error);
        return;
      }

      setPosts(prevPosts => prevPosts.map(p => 
        p.id === postId
          ? { ...p, likes: newLikes, likedBy: newLikedBy }
          : p
      ));
    } catch (error) {
      console.error('Error updating likes:', error);
    }
  };

  const handleLikeComment = async (postId: string, commentId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    let comment: Comment | undefined;
    let clusterId: string | undefined;

    post.commentClusters.forEach(cluster => {
      const foundComment = cluster.comments.find(c => c.id === commentId);
      if (foundComment) {
        comment = foundComment;
        clusterId = cluster.id;
      }
    });

    if (!comment || !clusterId) return;

    const isLiked = comment.likedBy.includes(user?.id || '');
    const newLikes = isLiked ? comment.likes - 1 : comment.likes + 1;
    const newLikedBy = isLiked
      ? comment.likedBy.filter(id => id !== user?.id)
      : [...comment.likedBy, user?.id || ''];

    try {
      const { error } = await supabase
        .from('comments')
        .update({ 
          likes: newLikes,
          liked_by: newLikedBy 
        })
        .eq('id', commentId);

      if (error) {
        console.error('Error updating comment likes:', error);
        return;
      }

      setPosts(prevPosts => prevPosts.map(p => {
        if (p.id !== postId) return p;

        return {
          ...p,
          commentClusters: p.commentClusters.map(cluster => ({
            ...cluster,
            comments: cluster.comments.map(c => 
              c.id === commentId
                ? { ...c, likes: newLikes, likedBy: newLikedBy }
                : c
            )
          }))
        };
      }));
    } catch (error) {
      console.error('Error updating comment likes:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-indigo-600">FitMunity</h1>
            <nav className="flex items-center space-x-4">
              <button
                onClick={() => setActiveTab('upload')}
                className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium
                  ${activeTab === 'upload'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Upload className="w-5 h-5 mr-1" />
                Upload
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium
                  ${activeTab === 'history'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <HistoryIcon className="w-5 h-5 mr-1" />
                History
              </button>
              <button
                onClick={() => setActiveTab('summary')}
                className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium
                  ${activeTab === 'summary'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <PieChart className="w-5 h-5 mr-1" />
                Summary
              </button>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                <LogOut className="w-5 h-5 mr-1" />
                Sign Out
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <>
            {activeTab === 'upload' && <UploadForm onPost={handlePost} />}
            {activeTab === 'history' && (
              <History 
                posts={posts} 
                isGeneratingComment={isGeneratingComment}
                onDeletePost={handleDeletePost}
                onDeleteComment={handleDeleteComment}
                onAddReply={handleAddReply}
                onLikeComment={handleLikeComment}
                onLikePost={handleLikePost}
                currentUserId={user?.id || ''}
              />
            )}
            {activeTab === 'summary' && <Summary />}
          </>
        )}
      </main>
    </div>
  );
}