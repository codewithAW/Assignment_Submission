const url = process.env.VITE_SUPABASE_URL || '';
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!url || !secret) {
  throw new Error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment.');
}

async function testSqlEndpoints() {
  const endpoints = [
    '/pg/query',
    '/v1/query',
    '/rest/v1/rpc/exec_sql',
    '/database/query'
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${url}${ep}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secret}`,
          'apikey': secret,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: 'SELECT 1;' }),
      });
      console.log(`${ep}: status ${res.status}`);
    } catch (e: any) {
      console.log(`${ep}: error ${e.message}`);
    }
  }
}

testSqlEndpoints();

