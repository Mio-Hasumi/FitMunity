import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import type { Post, CommentCluster, Comment } from '../types';

interface AppContextType {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load posts from Supabase when user changes
  useEffect(() => {
    let mounted = true;

    if (!user) {
      setPosts([]);
      setLoading(false);
      return;
    }

    async function loadPosts() {
      try {
        setLoading(true);

        // First, get all posts
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (postsError) {
          console.error('Error loading posts:', postsError);
          return;
        }

        if (!mounted) return;

        // Then, get all clusters and comments in parallel for better performance
        const { data: allClusters, error: clustersError } = await supabase
          .from('comment_clusters')
          .select('*')
          .in('post_id', postsData.map(p => p.id))
          .order('created_at', { ascending: true });

        if (clustersError) {
          console.error('Error loading clusters:', clustersError);
          return;
        }

        if (!mounted) return;

        const { data: allComments, error: commentsError } = await supabase
          .from('comments')
          .select('*')
          .in('cluster_id', allClusters.map(c => c.id))
          .order('created_at', { ascending: true });

        if (commentsError) {
          console.error('Error loading comments:', commentsError);
          return;
        }

        if (!mounted) return;

        // Group comments by cluster ID for faster lookup
        const commentsByCluster = allComments.reduce((acc, comment) => {
          if (!acc[comment.cluster_id]) {
            acc[comment.cluster_id] = [];
          }
          acc[comment.cluster_id].push(comment);
          return acc;
        }, {} as Record<string, any[]>);

        // Group clusters by post ID
        const clustersByPost = allClusters.reduce((acc, cluster) => {
          if (!acc[cluster.post_id]) {
            acc[cluster.post_id] = [];
          }
          acc[cluster.post_id].push(cluster);
          return acc;
        }, {} as Record<string, any[]>);

        // Assemble the complete post objects
        const postsWithComments = postsData.map(post => {
          // Ensure media_urls is always an array
          const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls : [];
          
          // Get public URLs for each image
          const publicUrls = mediaUrls.map(url => {
            // If it's already a full URL, return it
            if (url.startsWith('http')) {
              return url;
            }
            // Otherwise, get the public URL from Supabase
            const { data: { publicUrl } } = supabase.storage
              .from('post-images')
              .getPublicUrl(url);
            return publicUrl;
          });

          const postClusters = (clustersByPost[post.id] || []).map(cluster => {
            const clusterComments = (commentsByCluster[cluster.id] || []).map(comment => ({
              id: comment.id,
              content: comment.content,
              type: comment.type,
              expertiseArea: comment.expertise_area,
              userName: comment.user_name,
              timestamp: new Date(comment.created_at),
              likes: comment.likes,
              targetLikes: comment.target_likes,
              likedBy: [],
              isUserReply: comment.is_user_reply
            }));

            return {
              id: cluster.id,
              persona: {
                name: cluster.persona_name,
                style: cluster.persona_style,
                systemRole: cluster.persona_system_role
              },
              comments: clusterComments,
              timestamp: new Date(cluster.created_at)
            } as CommentCluster;
          });

          return {
            id: post.id,
            content: post.content,
            type: post.type,
            mediaUrls: publicUrls, // Use the public URLs
            tags: post.tags,
            timestamp: new Date(post.created_at),
            calories: post.calories,
            workoutDetails: post.workout_details,
            likes: post.likes,
            targetLikes: post.target_likes,
            likedBy: [],
            commentClusters: postClusters,
            userId: post.user_id
          } as Post;
        });

        if (mounted) {
          setPosts(postsWithComments);
        }
      } catch (error) {
        console.error('Error loading posts:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadPosts();

    return () => {
      mounted = false;
    };
  }, [user]);

  return (
    <AppContext.Provider value={{ posts, setPosts, loading }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}