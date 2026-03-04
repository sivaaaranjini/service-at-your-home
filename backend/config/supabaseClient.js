const { createClient } = require('@supabase/supabase-js');
const fetch = require('cross-fetch');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Anon Key. Please set them in your .env file.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false
    },
    global: {
        fetch: fetch
    }
});

module.exports = supabase;
