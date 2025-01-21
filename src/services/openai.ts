import OpenAI from 'openai';
import type { Post, Comment, CommentCluster } from '../types';

function generateUUID(): string {
  return crypto.randomUUID();
}

// Initialize OpenAI client once
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const EXPERTS = {
  FITNESS: {
    name: 'Alex Thompson',
    role: 'Fitness Trainer',
    systemRole:
      'You are a certified fitness trainer with 10 years of experience. You provide professional advice while being encouraging.',
    imagePrompts: [
      'Analyze these workout or fitness-related images together and provide specific tips or observations.',
      'Share your professional perspective on the form or technique shown in these images.',
      'Suggest how these exercises or activities could be modified for different fitness levels.'
    ]
  },
  NUTRITION: {
    name: 'Sarah Chen',
    role: 'Dietary Specialist',
    systemRole:
      'You are a registered dietitian with expertise in balanced nutrition. Focus on providing insights about nutritional value, health benefits, and dietary recommendations. Do not mention calorie counts as these are handled separately.',
    imagePrompts: [
      'Analyze these dishes together and share insights about their nutritional benefits and potential health impacts.',
      'Examine the nutritional balance of this meal and suggest any beneficial modifications.',
      'Share professional insights about the nutritional value and health benefits of these dishes together.',
      'Keep short, do not reply too much, in 2/3 sentences.'
    ]
  },
  MENTAL_HEALTH: {
    name: 'Dr. Emma Parker',
    role: 'Mental Health Specialist',
    systemRole:
      'You are a licensed therapist specializing in mental wellness. You provide empathetic support and professional guidance.',
    imagePrompts: [
      'Reflect on the mood or emotional atmosphere captured in these images.',
      'Share how these scenes or activities might impact mental well-being.',
      'Suggest ways to incorporate similar positive elements into daily routines.'
    ]
  },
};

const RANDOM_NAMES = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'William',
  'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander'
];

const USER_PERSONAS = [
  {
    style: 'casual',
    systemRole: 'You are a friendly, conversational user who shares personal experiences and opinions casually.',
  },
  {
    style: 'supportive',
    systemRole: 'You are an empathetic and supportive user who offers encouragement and positive feedback.',
  },
  {
    style: 'humorous',
    systemRole: 'You are a witty user who adds humor and light-hearted comments to the conversation.',
  },
  {
    style: 'analytical',
    systemRole: 'You are a thoughtful user who provides detailed and insightful observations.',
  }
];

// Export the calculateCalories function
export async function calculateCalories(post: { content: string; mediaUrls?: string[]; type: string }): Promise<number> {
  try {
    const messages = [
      {
        role: 'system' as const,
        content: 'You are a precise calorie calculator. For multiple food items, analyze each one and provide the total calories. Respond only with a number representing the total estimated calories. No explanations or additional text.'
      },
      {
        role: 'user' as const,
        content: post.type === 'image' && post.mediaUrls && post.mediaUrls.length > 0
          ? [
              {
                type: 'text',
                text: `Calculate the total calories for ${post.mediaUrls.length > 1 ? 'all these food items' : 'this food'}. Consider the items together as a meal. ${post.content ? `Context: ${post.content}` : ''} Respond with only the total number.`
              },
              ...post.mediaUrls.map(url => ({
                type: 'image_url',
                image_url: { url }
              }))
            ]
          : `Calculate the total calories for this food: "${post.content}". Respond with only the number.`
      }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 10,
      temperature: 0.3
    });

    const response = completion.choices[0]?.message?.content?.trim();
    const calories = parseInt(response || '0', 10);
    return isNaN(calories) ? 0 : calories;
  } catch (error) {
    console.error('Error calculating calories:', error);
    return 0;
  }
}

async function generateSingleComment(
  post: Post,
  persona: { 
    name: string; 
    systemRole: string; 
    prompt?: string; 
    role?: string; 
    style?: string;
    imagePrompts?: string[];
  },
  isExpert = false,
  previousComments: Comment[] = [],
  latestUserContent?: string
): Promise<Comment> {
  try {
    const messages: any[] = [
      {
        role: 'system' as const,
        content: `${persona.systemRole}. IMPORTANT: Always respond directly to the most recent message. Never repeat previous responses.`,
      },
    ];

    if (post.type === 'image' && post.mediaUrls && post.mediaUrls.length > 0) {
      let textPrompt: string;
      
      if (persona.imagePrompts && !latestUserContent) {
        textPrompt = persona.imagePrompts[Math.floor(Math.random() * persona.imagePrompts.length)];
      } else if (latestUserContent) {
        textPrompt = `Respond to: "${latestUserContent}" while considering these images. Keep your response focused and engaging.`;
      } else {
        textPrompt = post.content
          ? `Please analyze these images together and respond to: "${post.content}". Keep your response focused and engaging (max 2-3 sentences).`
          : `Please analyze these images together and provide your thoughts or feedback. Keep your response focused and engaging (max 2-3 sentences).`;
      }

      messages.push({
        role: 'user' as const,
        content: [
          {
            type: 'text',
            text: textPrompt
          },
          ...post.mediaUrls.map(url => ({
            type: 'image_url',
            image_url: { url }
          }))
        ],
      });
    } else {
      messages.push({
        role: 'user' as const,
        content: `Initial context: "${post.content}"`,
      });
    }

    // Add previous comments for context
    previousComments.forEach((comment) => {
      messages.push({
        role: comment.type === 'user' ? 'user' as const : 'assistant' as const,
        content: comment.content,
      });
    });

    if (latestUserContent && !post.mediaUrls) {
      messages.push({
        role: 'user' as const,
        content: latestUserContent,
      });
    }

    const completion = await openai.chat.completions.create({
      model: post.type === 'image' ? 'gpt-4o' : 'gpt-4o',
      messages,
      max_tokens: 300,
      temperature: 0.7,
      presence_penalty: 0.6,
      frequency_penalty: 0.6
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('No response received from OpenAI');
    }

    return {
      id: generateUUID(),
      content,
      type: isExpert ? 'expert' : 'user',
      expertiseArea: isExpert ? persona.role : undefined,
      userName: persona.name,
      timestamp: new Date(),
      likes: 0,
      targetLikes: Math.floor(Math.random() * 30) + 1,
      likedBy: [],
      isUserReply: false
    };
  } catch (error) {
    console.error('Error generating comment:', error);
    throw error;
  }
}

// Export the generateComment function
export async function generateComment(
  post: Post,
  isUserReply = false,
  clusterId?: string,
  userContent?: string
): Promise<CommentCluster[] | Comment> {
  if (!import.meta.env.VITE_OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  if (clusterId && userContent) {
    const cluster = post.commentClusters.find((c) => c.id === clusterId);
    if (!cluster) {
      throw new Error('Cluster not found');
    }

    try {
      return await generateSingleComment(
        post,
        cluster.persona,
        cluster.persona.style === 'professional',
        cluster.comments,
        userContent
      );
    } catch (error) {
      console.error('Failed to generate AI reply:', error);
      throw error;
    }
  }

  if (!clusterId) {
    try {
      const clusters: CommentCluster[] = [];

      // Generate expert comment
      const expertType = post.tags.includes('Fitness')
        ? 'FITNESS'
        : post.tags.includes('Food')
        ? 'NUTRITION'
        : 'MENTAL_HEALTH';
      const expert = EXPERTS[expertType];

      const expertComment = await generateSingleComment(post, expert, true);
      clusters.push({
        id: generateUUID(),
        persona: {
          name: expert.name,
          style: 'professional',
          systemRole: expert.systemRole,
        },
        comments: [expertComment],
        timestamp: new Date(),
      });

      // Generate random number of user comments (1-4)
      const numUserComments = Math.floor(Math.random() * 4) + 1;
      const usedNames = new Set<string>([expert.name]);

      for (let i = 0; i < numUserComments; i++) {
        let randomName: string;
        do {
          randomName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
        } while (usedNames.has(randomName));
        usedNames.add(randomName);

        const persona = USER_PERSONAS[Math.floor(Math.random() * USER_PERSONAS.length)];
        const userComment = await generateSingleComment(post, { name: randomName, ...persona });

        clusters.push({
          id: generateUUID(),
          persona: {
            name: randomName,
            style: persona.style,
            systemRole: persona.systemRole,
          },
          comments: [userComment],
          timestamp: new Date(),
        });
      }

      return clusters;
    } catch (error) {
      console.error('Failed to generate initial comments:', error);
      throw error;
    }
  }

  throw new Error('Invalid call to generateComment: missing parameters');
}