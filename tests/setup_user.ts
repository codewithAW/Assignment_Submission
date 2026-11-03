import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fmydejwnqxwiimvjuyno.supabase.co';
const secretKey = 'sb_secret_4IFGnMdIC_8nD9cBw0ViDA_Hp7pkWFO';
const client = createClient(supabaseUrl, secretKey);

async function setupNewAdmin() {
  const email = 'shahmproject@gmail.com';
  const password = 'shah@8844!';

  console.log(`Setting up admin user: ${email}...`);

  // Check if user already exists
  const { data: userList } = await client.auth.admin.listUsers();
  const existing = userList?.users?.find(u => u.email === email);

  if (existing) {
    console.log('User already exists, updating password...');
    const { data, error } = await client.auth.admin.updateUserById(existing.id, {
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Administrator',
        role: 'admin',
      }
    });
    console.log('Update result:', { email: data?.user?.email, error: error?.message });
  } else {
    console.log('Creating new user in Supabase Auth...');
    const { data, error } = await client.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Administrator',
        role: 'admin',
      }
    });
    console.log('Create result:', { email: data?.user?.email, error: error?.message });
  }

  // Now test logging in with the publishable key
  console.log('\nTesting sign-in with publishable key...');
  const pubClient = createClient(supabaseUrl, 'sb_publishable_Z7SmcfqvxqKiSIz4qIeP5g_TFUBz89O');
  const { data: signInData, error: signInErr } = await pubClient.auth.signInWithPassword({
    email,
    password,
  });

  console.log('Sign in test:', {
    user: signInData?.user?.email,
    sessionReceived: Boolean(signInData?.session?.access_token),
    error: signInErr?.message,
  });
}

setupNewAdmin();

