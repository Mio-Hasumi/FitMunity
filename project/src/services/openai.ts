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

// Calorie calculation function for food posts
async function calculateCalories(post: Post): Promise<number> {
  if (!post.tags.includes('Food')) return 0;

  try {
    const messages = [
      {
        role: 'system',
        content: 'You are a precise calorie calculator. Respond only with a number representing the estimated calories. No explanations or additional text.'
      },
      {
        role: 'user',
        content: post.type === 'image' && post.mediaUrl
          ? [
              {
                type: 'text',
                text: 'Calculate the total calories in this food. Respond with only the number.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: post.mediaUrl
                }
              }
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

const EXPERTS = {
  FITNESS: {
    name: 'Alex Thompson',
    role: 'Fitness Trainer',
    systemRole:
      'You are a certified fitness trainer with 10 years of experience. You provide professional advice while being encouraging.',
    imagePrompts: [
      'Analyze this workout or fitness-related image and provide specific tips or observations.',
      'Share your professional perspective on the form or technique shown in this image.',
      'Suggest how this exercise or activity could be modified for different fitness levels.'
    ]
  },
  NUTRITION: {
    name: 'Sarah Chen',
    role: 'Dietary Specialist',
    systemRole:
      'You are a registered dietitian with expertise in balanced nutrition. Focus on providing insights about nutritional value, health benefits, and dietary recommendations. Do not mention calorie counts as these are handled separately.',
    imagePrompts: [
      'Analyze this dish and share insights about its nutritional benefits and potential health impacts.',
      'Examine the nutritional balance of this meal and suggest any beneficial modifications.',
      'Share professional insights about the nutritional value and health benefits of this dish.'
    ]
  },
  MENTAL_HEALTH: {
    name: 'Dr. Emma Parker',
    role: 'Mental Health Specialist',
    systemRole:
      'You are a licensed therapist specializing in mental wellness. You provide empathetic support and professional guidance.',
    imagePrompts: [
      'Reflect on the mood or emotional atmosphere captured in this image.',
      'Share how this scene or activity might impact mental well-being.',
      'Suggest ways to incorporate similar positive elements into daily routines.'
    ]
  },
};

export const USER_PERSONAS = [
  {
    style: 'enthusiastic',
    prompt: 'As an enthusiastic and supportive person, share an uplifting response',
    systemRole: 'You are an energetic and positive person who loves encouraging others',
    imagePrompts: [
      'Share your excitement about what you see in this image!',
      'What inspiring elements catch your eye in this photo?',
      'Express your enthusiasm about the potential impact of what\'s shown here!'
    ]
  },
  {
    style: 'empathetic',
    prompt: 'As someone who deeply relates to others, share a compassionate response',
    systemRole: 'You are an empathetic person who connects with others through shared experiences',
    imagePrompts: [
      'How does this image make you feel? Share your emotional connection.',
      'What relatable moments or feelings does this image evoke?',
      'Share a compassionate perspective about what you observe.'
    ]
  },
  {
    style: 'practical',
    prompt: 'As a practical person, share a down-to-earth perspective or helpful tip',
    systemRole: 'You are a pragmatic person who likes to share useful insights',
    imagePrompts: [
      'What practical observations can you share about this image?',
      'Offer some realistic advice based on what you see.',
      'Share a useful tip related to what\'s shown here.'
    ]
  }
];

const RANDOM_NAMES = [
  'Jamie Smith',
  'Jordan Lee',
  'Taylor Kim',
  'Casey Brown',
  'Morgan Wright',
  'Riley Johnson',
  'Quinn Martinez',
  'Avery Wilson',
  'Sam Rodriguez',
  'Drew Garcia',
];

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
        role: 'system',
        content: `${persona.systemRole}. IMPORTANT: Always respond directly to the most recent message. Never repeat previous responses.`,
      },
    ];

    if (post.type === 'image' && post.mediaUrl) {
      let textPrompt: string;
      
      if (persona.imagePrompts) {
        textPrompt = persona.imagePrompts[Math.floor(Math.random() * persona.imagePrompts.length)];
      } else {
        textPrompt = post.content
          ? `Please analyze this image and respond to: "${post.content}". Keep your response focused and engaging (max 2-3 sentences).`
          : `Please analyze this image and provide your thoughts or feedback. Keep your response focused and engaging (max 2-3 sentences).`;
      }

      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: textPrompt
          },
          {
            type: 'image_url',
            image_url: {
              url: post.mediaUrl
            }
          }
        ],
      });
    } else {
      messages.push({
        role: 'user',
        content: `Initial context: "${post.content}"`,
      });
    }

    previousComments.forEach((comment) => {
      messages.push({
        role: comment.type === 'user' ? 'user' : 'assistant',
        content: comment.content,
      });
    });

    if (latestUserContent) {
      messages.push({
        role: 'user',
        content: latestUserContent,
      });
    }

    const completion = await openai.chat.completions.create({
      model: post.type === 'image' ? 'gpt-4o' : 'gpt-4o',
      messages,
      max_tokens: 300,
      temperature: 0.7,
      presence_penalty: 0.6,
      frequency_penalty: 0.6,
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
    };
  } catch (error) {
    console.error('Error generating comment:', error);
    throw error;
  }
}

export async function generateComment(
  post: Post,
  isUserReply = false,
  clusterId?: string,
  userContent?: string
): Promise<CommentCluster[] | Comment> {
  if (!import.meta.env.VITE_OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  // Calculate calories for food posts
  if (post.tags.includes('Food') && !post.calories) {
    post.calories = await calculateCalories(post);
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

      const numUserComments = Math.floor(Math.random() * 2) + 1;
      const usedNames = new Set<string>();

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