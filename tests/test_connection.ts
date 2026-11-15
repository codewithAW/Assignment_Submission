import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseUrl || !publishableKey || !secretKey) {
  throw new Error('Set VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY in environment.');
}

async function testConnection() {
  console.log('Testing connection to Supabase:', supabaseUrl);

  // 1. Test with publishable / anon key
  console.log('\n--- 1. Testing with Publishable Key ---');
  const clientPub = createClient(supabaseUrl, publishableKey);
  try {
    const { data, error } = await clientPub.from('submissions').select('count', { count: 'exact', head: true });
    console.log('Publishable client response:', { data, error });
  } catch (err) {
    console.error('Publishable client error:', err);
  }

  // 2. Test with Secret Key
  console.log('\n--- 2. Testing with Secret Key ---');
  const clientSecret = createClient(supabaseUrl, secretKey);
  try {
    const { data, error } = await clientSecret.from('submissions').select('count', { count: 'exact', head: true });
    console.log('Secret client response:', { data, error });
  } catch (err) {
    console.error('Secret client error:', err);
  }

  // 3. Check storage buckets
  console.log('\n--- 3. Checking Storage Buckets with Secret Key ---');
  try {
    const { data: buckets, error: bErr } = await clientSecret.storage.listBuckets();
    console.log('Storage buckets:', { buckets, bErr });
  } catch (err) {
    console.error('Bucket list error:', err);
  }

  // 4. Check auth/user
  console.log('\n--- 4. Checking Auth / Users with Secret Key ---');
  try {
    const { data: users, error: uErr } = await clientSecret.auth.admin.listUsers();
    console.log('Admin users list:', { userCount: users?.users?.length, uErr });
  } catch (err) {
    console.error('Auth check error:', err);
  }
}

testConnection();

