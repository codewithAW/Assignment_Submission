import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fmydejwnqxwiimvjuyno.supabase.co';
const secretKey = 'sb_secret_4IFGnMdIC_8nD9cBw0ViDA_Hp7pkWFO';
const client = createClient(supabaseUrl, secretKey);

async function setup() {
  console.log('1. Creating private storage bucket "assignments"...');
  const { data: bucketData, error: bErr } = await client.storage.createBucket('assignments', {
    public: false,
    fileSizeLimit: 15728640,
    allowedMimeTypes: ['application/pdf', 'application/x-pdf'],
  });

  console.log('Bucket creation result:', { bucketData, bErr });

  // List buckets again
  const { data: buckets } = await client.storage.listBuckets();
  console.log('Active Buckets:', buckets);

  // Check if instructor user exists in auth
  console.log('\n2. Creating demo instructor user in Supabase Auth...');
  const { data: user, error: uErr } = await client.auth.admin.createUser({
    email: 'instructor@compiler.edu',
    password: 'admin123',
    email_confirm: true,
    user_metadata: {
      full_name: 'Prof. Alan Turing',
      role: 'instructor'
    }
  });

  console.log('Instructor user creation:', { user: user?.user?.email, uErr: uErr?.message });
}

setup();

