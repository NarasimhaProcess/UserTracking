// src/services/supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store'; // Import SecureStore

// Access Supabase credentials from app.config.js
const SUPABASE_URL = Constants.expoConfig.extra.SUPABASE_URL;
const SUPABASE_ANON_KEY = Constants.expoConfig.extra.SUPABASE_ANON_KEY;

// Export the URL and Key for use in other parts of the app, like the TUS uploader.
export const supabaseUrl = SUPABASE_URL;
export const supabaseAnonKey = SUPABASE_ANON_KEY;

// Custom storage object for Supabase to use SecureStore
const ExpoSecureStoreAdapter = {
  getItem: (key) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key, value) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key) => {
    SecureStore.deleteItemAsync(key);
  },
};

// Create and export the Supabase client directly.
// This client connects directly to your main Supabase project.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter, // Use our custom SecureStore adapter
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
