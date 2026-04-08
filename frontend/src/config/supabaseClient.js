import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase frontend keys. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your frontend/.env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
