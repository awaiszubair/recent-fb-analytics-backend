const { createClient } = require('@supabase/supabase-js');

let supabase = null;

const connectDB = async () => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_KEY in environment');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase connected successfully');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    process.exit(1);
  }
};

const getDB = () => {
  if (!supabase) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return supabase;
};

module.exports = { connectDB, getDB };
