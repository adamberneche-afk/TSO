/**
 * Sprint 1: API Test Suite
 * Run with: node sprint1-api-tests.js
 */

const API_BASE = 'https://tso.onrender.com';
const FRONTEND_URL = 'https://taisplatform.vercel.app';

console.log('========================================');
console.log('Sprint 1: API Test Suite');
console.log('========================================\n');

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

async function test(name, fn) {
  console.log(`\n📝 ${name}`);
  try {
    await fn();
    console.log(`   ✅ PASS`);
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
  }
}

// Test 1: Health Check
await test('Health endpoint returns 200', async () => {
  const response = await fetch(`${API_BASE}/health`);
  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}`);
  }
  const data = await response.json();
  if (data.status !== 'healthy') {
    throw new Error('Status not healthy');
  }
});

// Test 2: CORS Headers
await test('CORS headers present', async () => {
  const response = await fetch(`${API_BASE}/api/v1/skills`, {
    method: 'OPTIONS',
    headers: {
      'Origin': FRONTEND_URL,
      'Access-Control-Request-Method': 'GET'
    }
  });
  const allowOrigin = response.headers.get('access-control-allow-origin');
  if (!allowOrigin || !allowOrigin.includes('taisplatform.vercel.app')) {
    throw new Error(`CORS not configured for frontend: ${allowOrigin}`);
  }
});

// Test 3: Skills endpoint
await test('Skills endpoint returns data', async () => {
  const response = await fetch(`${API_BASE}/api/v1/skills`);
  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}`);
  }
  const data = await response.json();
  if (!data.skills || !Array.isArray(data.skills)) {
    throw new Error('Invalid skills response format');
  }
  console.log(`   Found ${data.skills.length} skills`);
});

// Test 4: Configuration status without auth
await test('Config status requires authentication', async () => {
  const response = await fetch(`${API_BASE}/api/v1/configurations/status`);
  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`);
  }
  const data = await response.json();
  if (!data.error || !data.error.includes('Authentication')) {
    throw new Error('Error message not descriptive');
  }
});

// Test 5: NFT verify without auth
await test('NFT verify requires authentication', async () => {
  const response = await fetch(`${API_BASE}/api/v1/configurations/nft/verify`);
  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`);
  }
});

// Test 6: Create config without auth
await test('Create config requires authentication', async () => {
  const response = await fetch(`${API_BASE}/api/v1/configurations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test', configData: {} })
  });
  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`);
  }
});

// Test 7: API response time
await test('API response time < 500ms', async () => {
  const start = Date.now();
  await fetch(`${API_BASE}/api/v1/skills`);
  const duration = Date.now() - start;
  console.log(`   Response time: ${duration}ms`);
  if (duration > 500) {
    throw new Error(`Response too slow: ${duration}ms`);
  }
});

// Test 8: Security headers
await test('Security headers present', async () => {
  const response = await fetch(`${API_BASE}/health`);
  const headers = response.headers;
  const required = ['x-api-version'];
  for (const header of required) {
    if (!headers.get(header)) {
      throw new Error(`Missing header: ${header}`);
    }
  }
});

// Summary
console.log('\n========================================');
console.log('Test Summary');
console.log('========================================');
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`📊 Total: ${results.passed + results.failed}`);

if (results.failed > 0) {
  console.log('\nFailed Tests:');
  results.tests.filter(t => t.status === 'FAIL').forEach(t => {
    console.log(`  - ${t.name}: ${t.error}`);
  });
}

console.log('\n========================================');
console.log(results.failed === 0 ? '🎉 All tests passed!' : '⚠️ Some tests failed');
console.log('========================================');

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);
