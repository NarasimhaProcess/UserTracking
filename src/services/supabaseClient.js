
// src/services/supabaseClient.js

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants'; // Import Constants

let supabase = null; // This will hold your initialized Supabase client instance

// Access Supabase credentials from app.config.js via Constants
const SUPABASE_URL = Constants.expoConfig.extra.SUPABASE_URL;
const SUPABASE_ANON_KEY = Constants.expoConfig.extra.SUPABASE_ANON_KEY;

// This variable will store the tenant code for the current user.
// Initialize it to a default value so it's never null when customSupabaseFetch is called.
let currentTenantCode = 'initial_app_tenant'; // A default tenant code for initial app operations

/**
 * Sets the tenant code for the current session.
 * This should be called after a user logs in and their tenant is identified.
 * @param {string} tenantCode - The tenant code for the current user.
 */
export function setTenantCode(tenantCode) {
  currentTenantCode = tenantCode;
  console.log('Current tenant code set to:', currentTenantCode);
}

/**
 * Custom fetch function to route all Supabase requests through the proxy Edge Function.
 * This function will be passed to the Supabase client's global fetch option.
 */
async function customSupabaseFetch(input, init) {
  // currentTenantCode will always have a value now (either the actual tenant or 'initial_app_tenant')
  if (!currentTenantCode) { // This check should theoretically not be hit now
    console.error('Tenant code is unexpectedly null. Cannot make proxied Supabase request.');
    throw new Error('Tenant code is unexpectedly null.');
  }

  const mainSupabaseUrl = SUPABASE_URL; // Base URL for the proxy Edge Function
  const originalUrl = new URL(input);
  const originalPathAndQuery = `${originalUrl.pathname}${originalUrl.search}`;

  const proxyUrl = `${mainSupabaseUrl}/functions/v1/proxy-request${originalPathAndQuery}`;

  const headers = new Headers(init?.headers);
  headers.set('X-Tenant-Code', currentTenantCode); // Crucial header for the proxy

  const session = await supabase.auth.getSession();
  if (session?.data?.session?.access_token) {
    headers.set('Authorization', `Bearer ${session.data.session.access_token}`);
  } else {
    console.warn('No active session found for proxied request. RLS might restrict access on tenant DB.');
  }

  return fetch(proxyUrl, {
    ...init,
    headers: headers,
  });
}

/**
 * Initializes the Supabase client for your main project.
 * This function also configures the client to use the custom fetch function
 * for all database-related requests, routing them through the proxy Edge Function.
 * Call this once at your app's startup.
 */
export async function initializeSupabaseClient() {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        fetch: customSupabaseFetch, // All database requests will now go through this custom fetch
      },
    });
    console.log('Supabase client initialized successfully with proxy fetch configuration!');
    return supabase;
  } catch (error) {
    console.error('Error initializing client:', error);
    return null;
  }
}

// Export the supabase instance and the tenant setter for use throughout your app
export { supabase };
