import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const demoInstructorPassword = process.env.DEMO_INSTRUCTOR_PASSWORD || '';
if (!supabaseUrl || !secretKey || !demoInstructorPassword) {
  throw new Error('Set VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DEMO_INSTRUCTOR_PASSWORD in environment.');
}
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
    password: demoInstructorPassword,
    email_confirm: true,
    user_metadata: {
      full_name: 'Prof. Alan Turing',
      role: 'instructor'
    }
  });

  console.log('Instructor user creation:', { user: user?.user?.email, uErr: uErr?.message });
}

setup();

