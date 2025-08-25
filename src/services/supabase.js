import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
let Storage;
if (Platform.OS === 'web') {
  Storage = {
    getItem: async (key) => window.localStorage.getItem(key),
    setItem: async (key, value) => window.localStorage.setItem(key, value),
    removeItem: async (key) => window.localStorage.removeItem(key),
  };
} else {
  Storage = require('@react-native-async-storage/async-storage').default;
}

let supabase;

const initializeSupabase = async () => {
  console.log('Initializing Supabase...');
  try {
    const tenantId = await Storage.getItem('tenant_id');
    let config;

    if (tenantId) {
      console.log(`Found tenant_id: ${tenantId}`);
      const response = await fetch(`https://wtcxhhbigmqrmqdyhzcz.supabase.co/functions/v1/get-tenant-config?tenant_id=${tenantId}`);
      config = await response.json();
      console.log('Tenant config received:', config);
    } else {
      console.log('No tenant_id found, fetching default config.');
      const response = await fetch('https://wtcxhhbigmqrmqdyhzcz.supabase.co/functions/v1/get-supabase-config');
      config = await response.json();
      console.log('Default config received:', config);
    }

    if (!config.supabase_url || !config.supabase_anon_key) {
      throw new Error("Supabase config is missing");
    }

    supabase = createClient(config.supabase_url, config.supabase_anon_key, {
      auth: {
        storage: Storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    console.log('Supabase client created.');

  } catch (error) {
    console.error("Failed to initialize Supabase:", error);
    // Handle the error appropriately, maybe show a message to the user
  }
};

const reinitializeSupabase = async (tenantId) => {
  try {
    const response = await fetch(`https://wtcxhhbigmqrmqdyhzcz.supabase.co/functions/v1/get-tenant-config?tenant_id=${tenantId}`);
    const config = await response.json();

    if (!config.supabase_url || !config.supabase_anon_key) {
      throw new Error("Supabase config is missing for tenant");
    }

    supabase = createClient(config.supabase_url, config.supabase_anon_key, {
      auth: {
        storage: Storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    await Storage.setItem('tenant_id', tenantId);

  } catch (error) {
    console.error("Failed to re-initialize Supabase for tenant:", error);
  }
};

export { supabase, initializeSupabase, reinitializeSupabase };

export async function fetchCustomerPaymentStatusForCSV() {
  if (!supabase) {
    console.error("Supabase not initialized");
    return null;
  }
  const { data, error } = await supabase.rpc('get_customer_payment_status_for_csv');

  if (error) {
    console.error('Error fetching customer payment status for CSV:', error);
    return null;
  }
  return data;
} 