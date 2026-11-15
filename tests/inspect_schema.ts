import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseUrl || !secretKey) {
  throw new Error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment.');
}
const client = createClient(supabaseUrl, secretKey);

async function inspectSchema() {
  const tables = ['submissions', 'submission_files', 'admin_users', 'student_roster'];

  for (const table of tables) {
    const { data, error } = await client.from(table).select('*').limit(2);
    console.log(`Table '${table}':`, { count: data?.length, error: error ? error.message : null });
  }

  // Also check buckets
  const { data: buckets, error: bErr } = await client.storage.listBuckets();
  console.log('Buckets:', buckets, bErr ? bErr.message : null);
}

inspectSchema();

