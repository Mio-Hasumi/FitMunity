export type Tag = 'Mood' | 'Food' | 'Fitness' | 'Achievements';

export interface Post {
  id: string;
  content: string;
  type: 'audio' | 'image' | 'text';
  mediaUrls?: string[]; // Changed from mediaUrl to mediaUrls
  tags: Tag[];
  timestamp: Date;
  calories?: number;
  workoutDetails?: string;
  likes: number;
  targetLikes: number;
  likedBy: string[];
  commentClusters: CommentCluster[];
  userId?: string;
}

export interface CommentCluster {
  id: string;
  persona: {
    name: string;
    style: string;
    systemRole: string;
  };
  comments: Comment[];
  timestamp: Date;
}

export interface Comment {
  id: string;
  content: string;
  type: 'ai' | 'expert' | 'user';
  expertiseArea?: string;
  userName?: string;
  timestamp: Date;
  likes: number;
  targetLikes: number;
  likedBy: string[];
  isUserReply?: boolean;
}