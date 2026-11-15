import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const adminEmail = process.env.ADMIN_EMAIL || '';
const adminPassword = process.env.ADMIN_PASSWORD || '';
if (!supabaseUrl || !publishableKey || !adminEmail || !adminPassword) {
  throw new Error('Set VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, ADMIN_EMAIL, and ADMIN_PASSWORD in environment.');
}
const client = createClient(supabaseUrl, publishableKey);

async function testAuthLogin() {
  console.log('Testing student/instructor login with Publishable Key...');
  const { data, error } = await client.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });

  console.log('Sign in result:', {
    user: data?.user?.email,
    sessionToken: data?.session?.access_token ? 'VALID_JWT_TOKEN_RECEIVED' : null,
    error: error?.message,
  });
}

testAuthLogin();

