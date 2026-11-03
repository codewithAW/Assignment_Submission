import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fmydejwnqxwiimvjuyno.supabase.co';
const publishableKey = 'sb_publishable_Z7SmcfqvxqKiSIz4qIeP5g_TFUBz89O';
const secretKey = 'sb_secret_4IFGnMdIC_8nD9cBw0ViDA_Hp7pkWFO';

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
