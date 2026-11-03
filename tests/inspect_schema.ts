import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fmydejwnqxwiimvjuyno.supabase.co';
const secretKey = 'sb_secret_4IFGnMdIC_8nD9cBw0ViDA_Hp7pkWFO';
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
