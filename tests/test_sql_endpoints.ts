const url = 'https://fmydejwnqxwiimvjuyno.supabase.co';
const secret = 'sb_secret_4IFGnMdIC_8nD9cBw0ViDA_Hp7pkWFO';

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
