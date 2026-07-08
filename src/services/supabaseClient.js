// src/services/supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import SecureStoreAdapter from './SecureStoreAdapter';

// Access Supabase credentials from app.config.js, process.env, or EXPO_PUBLIC_ prefix fallbacks
const SUPABASE_URL = Constants.expoConfig?.extra?.SUPABASE_URL || process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    'CRITICAL ERROR: Supabase URL or Anon Key is missing! ' +
    'Please verify that your .env file exists or environment variables are set in EAS Build / EAS Update. ' +
    `URL: ${SUPABASE_URL}, Anon Key: ${SUPABASE_ANON_KEY ? 'Present' : 'Missing'}`
  );
}

// Export the URL and Key for use in other parts of the app, like the TUS uploader.
export const supabaseUrl = SUPABASE_URL || '';
export const supabaseAnonKey = SUPABASE_ANON_KEY || '';

// Create and export the Supabase client directly.
// We use placeholder values to prevent the app from hard-crashing during module import if variables are missing.
export const supabase = createClient(supabaseUrl || 'https://placeholder-url.supabase.co', supabaseAnonKey || 'placeholder-key', {
  auth: {
    storage: SecureStoreAdapter, // Use our web-compatible SecureStore adapter
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
