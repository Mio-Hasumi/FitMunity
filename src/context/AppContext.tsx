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
            mediaUrl: post.media_url,
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

  // Save posts to Supabase when they change
  useEffect(() => {
    if (!user || posts.length === 0) return;

    const saveTimeout = setTimeout(async () => {
      try {
        // Get the latest posts from Supabase
        const { data: existingPosts } = await supabase
          .from('posts')
          .select('id')
          .eq('user_id', user.id);

        const existingIds = new Set(existingPosts?.map(p => p.id) || []);

        // Find new posts to insert
        const newPosts = posts.filter(post => !existingIds.has(post.id));

        // Insert new posts and their comments
        for (const post of newPosts) {
          const { error: postError } = await supabase.from('posts').insert({
            id: post.id,
            user_id: user.id,
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
            console.error('Error saving new post:', postError);
            continue;
          }

          // Insert comment clusters and comments
          for (const cluster of post.commentClusters) {
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
        }

        // Update existing posts
        for (const post of posts) {
          if (existingIds.has(post.id)) {
            const { error: postError } = await supabase
              .from('posts')
              .update({
                content: post.content,
                type: post.type,
                media_url: post.mediaUrl,
                tags: post.tags,
                calories: post.calories,
                workout_details: post.workoutDetails,
                likes: post.likes,
                target_likes: post.targetLikes
              })
              .eq('id', post.id)
              .eq('user_id', user.id);

            if (postError) {
              console.error('Error updating post:', postError);
              continue;
            }

            // Get existing clusters
            const { data: existingClusters } = await supabase
              .from('comment_clusters')
              .select('id')
              .eq('post_id', post.id);

            const existingClusterIds = new Set(existingClusters?.map(c => c.id) || []);

            // Handle new clusters
            for (const cluster of post.commentClusters) {
              if (!existingClusterIds.has(cluster.id)) {
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
                  console.error('Error saving new cluster:', clusterError);
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
                  console.error('Error saving new comments:', commentsError);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error syncing posts:', error);
      }
    }, 1000); // Debounce saves to prevent too many requests

    return () => clearTimeout(saveTimeout);
  }, [posts, user]);

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