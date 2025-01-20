import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token'
  }
});

// Initialize auth state with better error handling
supabase.auth.onAuthStateChange((event, session) => {
  try {
    if (event === 'SIGNED_IN') {
      console.log('User signed in:', session?.user?.email);
    } else if (event === 'SIGNED_OUT') {
      console.log('User signed out');
    } else if (event === 'TOKEN_REFRESHED') {
      console.log('Token refreshed successfully');
    }
  } catch (error) {
    console.error('Auth state change error:', error);
  }
});