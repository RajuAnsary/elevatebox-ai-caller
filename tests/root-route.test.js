const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');

async function run() {
  const server = app.listen(0, '127.0.0.1');

  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    const result = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/`, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => resolve({ statusCode: response.statusCode, body }));
      }).on('error', reject);
    });

    assert.equal(result.statusCode, 200);
    assert.deepEqual(JSON.parse(result.body), {
      name: 'ElevateBox AI Voice Sales Assistant',
      status: 'running',
      description: 'AI voice sales assistant with lead qualification, callback scheduling, and WhatsApp follow-up.',
      health: '/health',
      repository: 'https://github.com/RajuAnsary/elevatebox-ai-caller'
    });
    console.log('Root route tests passed.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
