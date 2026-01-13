import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL || 'https://tpudllgxtbewiyeqebiu.supabase.co'; 
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwdWRsbGd4dGJld2l5ZXFlYml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzc1ODAsImV4cCI6MjA4MzgxMzU4MH0.weRxgDa_HqpCnekvrW1KEioVhiwB4z4TtdFMWqcOd2c';
console.log(supabaseUrl)
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

