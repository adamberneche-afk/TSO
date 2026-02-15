/**
 * Test configuration save endpoint
 * Run: node test-save.js
 */

const API_URL = 'https://tso.onrender.com';

// Test wallet with Genesis NFT (from logs)
const TEST_WALLET = '0x0b70e049e5e0d1e7e8e8f947a2f2574290f89a89';

console.log('Testing Configuration Save Flow\n');
console.log('API URL:', API_URL);
console.log('Test Wallet:', TEST_WALLET);
console.log('');

async function testSave() {
  console.log('1. Getting nonce...');
  const nonceResponse = await fetch(`${API_URL}/api/v1/auth/nonce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress: TEST_WALLET }),
  });
  
  if (!nonceResponse.ok) {
    console.error('❌ Failed to get nonce:', await nonceResponse.text());
    return;
  }
  
  const { nonce, message } = await nonceResponse.json();
  console.log('✅ Nonce received:', nonce.substring(0, 20) + '...');
  console.log('');
  
  console.log('2. Testing configuration status...');
  // Note: We can't sign without the private key, but we can check if the endpoint works
  const statusResponse = await fetch(`${API_URL}/api/v1/configurations/status`);
  console.log('Status endpoint:', statusResponse.status, statusResponse.status === 401 ? '(Expected - needs auth)' : '');
  console.log('');
  
  console.log('3. Checking recent saves in logs...');
  console.log('Please check Render logs for "[SAVE CONFIG]" messages');
  console.log('');
  
  console.log('Analysis:');
  console.log('- If you see "[SAVE CONFIG] ✅ Limits check passed" -> Save should work');
  console.log('- If you see "[SAVE CONFIG] ❌ Save blocked" -> NFT verification failing');
  console.log('- If no "[SAVE CONFIG]" logs -> Save request not reaching backend');
}

testSave().catch(console.error);
