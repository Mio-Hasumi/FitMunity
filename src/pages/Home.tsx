import React, { useState } from 'react';
import { MessageCircle, PlusCircle, User, LogOut, PieChart } from 'lucide-react';
import UploadForm from '../components/UploadForm';
import History from '../components/History';
import Summary from '../components/Summary';
import { generateComment, calculateCalories } from '../services/openai';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Post } from '../types';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'summary'>('feed');
  const [isGeneratingComment, setIsGeneratingComment] = useState(false);
  const { user, signOut } = useAuth();
  const { posts, setPosts } = useAppContext();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      // First, get the post to check if it has images
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      // If the post has images, delete them from storage
      if (post.mediaUrls && post.mediaUrls.length > 0) {
        for (const url of post.mediaUrls) {
          const path = url.split('/').pop(); // Get filename from URL
          if (path) {
            const { error: storageError } = await supabase.storage
              .from('post-images')
              .remove([path]);
            
            if (storageError) {
              console.error('Error deleting image:', storageError);
            }
          }
        }
      }

      // Delete the post from Supabase
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error deleting post:', error);
        return;
      }

      // Update local state
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handlePost = async (newPost: Omit<Post, 'id' | 'timestamp' | 'commentClusters' | 'likes' | 'targetLikes' | 'likedBy'> & { files?: File[] }) => {
    try {
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

      // Upload images to Supabase Storage if present
      if (newPost.files && newPost.files.length > 0) {
        const uploadedUrls: string[] = [];

        for (const file of newPost.files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${crypto.randomUUID()}.${fileExt}`;

          const { data, error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Error uploading image:', uploadError);
            continue;
          }

          if (data) {
            const { data: { publicUrl } } = supabase.storage
              .from('post-images')
              .getPublicUrl(data.path);
            
            uploadedUrls.push(publicUrl);
          }
        }

        post.mediaUrls = uploadedUrls;
      }

      // Calculate calories for food posts immediately
      if (post.tags.includes('Food')) {
        try {
          const calories = await calculateCalories({
            content: post.content,
            mediaUrls: post.mediaUrls,
            type: post.type
          });
          post.calories = calories;
        } catch (error) {
          console.error('Error calculating calories:', error);
        }
      }

      // Save the post to Supabase
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          id: post.id,
          user_id: user?.id,
          content: post.content,
          type: post.type,
          media_urls: post.mediaUrls || [],
          tags: post.tags,
          calories: post.calories, // Store calories in database
          workout_details: post.workoutDetails,
          likes: post.likes,
          target_likes: post.targetLikes,
          created_at: post.timestamp.toISOString()
        });

      if (postError) {
        console.error('Error saving post:', postError);
        return;
      }

      // Update local state
      setPosts(prevPosts => [post, ...prevPosts]);
      setShowUploadForm(false);
      setActiveTab('feed');
      setIsGeneratingComment(true);

      // Generate and save comment clusters
      try {
        const clusters = await generateComment(post);
        
        if (Array.isArray(clusters)) {
          // Save each cluster and its comments
          for (const cluster of clusters) {
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
            }
          }

          // Update local state with clusters
          setPosts(prevPosts => prevPosts.map(p => 
            p.id === post.id 
              ? { ...p, commentClusters: clusters }
              : p
          ));
        }
      } catch (error) {
        console.error('Error generating comments:', error);
      } finally {
        setIsGeneratingComment(false);
      }
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F0FF]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-xl font-bold text-indigo-600">FitMunity</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('feed')}
              className={`p-2 ${
                activeTab === 'feed' ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              <MessageCircle className="w-6 h-6" />
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`p-2 ${
                activeTab === 'summary' ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              <PieChart className="w-6 h-6" />
            </button>
            <button
              onClick={() => setShowUploadForm(true)}
              className="p-2 text-gray-600 hover:text-indigo-600"
            >
              <PlusCircle className="w-6 h-6" />
            </button>
            <button
              onClick={handleSignOut}
              className="p-2 text-gray-600 hover:text-indigo-600"
            >
              <User className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-14 pb-16 max-w-2xl mx-auto">
        {activeTab === 'feed' ? (
          <History 
            posts={posts}
            isGeneratingComment={isGeneratingComment}
            onDeletePost={handleDeletePost}
            currentUserId={user?.id || ''}
          />
        ) : (
          <Summary />
        )}
      </main>

      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create Post</h2>
              <button
                onClick={() => setShowUploadForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <UploadForm onPost={handlePost} />
          </div>
        </div>
      )}
    </div>
  );
}