import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

export function useCalories() {
  const { posts } = useAppContext();

  const foodPosts = useMemo(() => {
    return posts
      .filter(post => post.tags.includes('Food') && post.calories)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [posts]);

  const totalCalories = useMemo(() => {
    return foodPosts.reduce((total, post) => total + (post.calories || 0), 0);
  }, [foodPosts]);

  return { totalCalories, foodPosts };
}