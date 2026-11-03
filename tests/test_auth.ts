import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fmydejwnqxwiimvjuyno.supabase.co';
const publishableKey = 'sb_publishable_Z7SmcfqvxqKiSIz4qIeP5g_TFUBz89O';
const client = createClient(supabaseUrl, publishableKey);

async function testAuthLogin() {
  console.log('Testing student/instructor login with Publishable Key...');
  const { data, error } = await client.auth.signInWithPassword({
    email: 'instructor@compiler.edu',
    password: 'admin123',
  });

  console.log('Sign in result:', {
    user: data?.user?.email,
    sessionToken: data?.session?.access_token ? 'VALID_JWT_TOKEN_RECEIVED' : null,
    error: error?.message,
  });
}

testAuthLogin();

