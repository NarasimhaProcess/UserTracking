import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
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

const supabaseUrl = Constants.expoConfig.extra.SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig.extra.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function fetchCustomerPaymentStatusForCSV(areaId) {
  console.log('Sending areaId to Supabase RPC:', areaId);
  const { data, error } = await supabase.rpc('get_customer_payment_status_for_csv', { p_area_id: areaId });

  if (error) {
    console.error('Error fetching customer payment status for CSV:', error);
    return null;
  }
  return data;
} 