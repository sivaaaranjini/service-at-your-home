require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

console.log("Connecting to Supabase...");
supabase.from('users').select('*').limit(1).then(({ data, error }) => {
    if (error) {
        console.error("SUPABASE ERROR:", error);
    } else {
        console.log("SUCCESS:", data);
    }
}).catch(err => {
    console.error("FATAL PROMISE ERROR:", err);
});
