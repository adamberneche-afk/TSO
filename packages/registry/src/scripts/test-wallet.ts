/**
 * Interactive Blockchain Testing
 * Live test with your own wallet
 * 
 * Usage: 
 *   1. Set TEST_WALLET_ADDRESS in .env
 *   2. npx ts-node src/scripts/test-wallet.ts
 */

import { ethers } from 'ethers';
import { nftVerification } from '../services/nftVerification';

const GENESIS_CONTRACT = '0x11B3EfbF04F0bA505F380aC20444B6952970AdA6';

function isValidEthereumAddress(address: string): boolean {
  // Check if it's a valid Ethereum address (42 chars, starts with 0x, hex chars)
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

async function testWalletNFT() {
  const walletAddress = process.env.TEST_WALLET_ADDRESS;
  
  // Check if address is set
  if (!walletAddress) {
    console.log('❌ TEST_WALLET_ADDRESS not set');
    console.log('   Set it in your .env file or environment:');
    console.log('   export TEST_WALLET_ADDRESS=0x1234567890123456789012345678901234567890');
    process.exit(1);
  }
  
  // Check if it's a placeholder
  if (walletAddress.includes('YOUR') || walletAddress.includes('...')) {
    console.log('❌ Invalid wallet address');
    console.log('   You used a placeholder. Please set your actual Ethereum address:');
    console.log('   export TEST_WALLET_ADDRESS=0x1234567890123456789012345678901234567890');
    console.log('\n   Your address should look like: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
    process.exit(1);
  }
  
  // Validate Ethereum address format
  if (!isValidEthereumAddress(walletAddress)) {
    console.log('❌ Invalid Ethereum address format');
    console.log('   Address:', walletAddress);
    console.log('   Expected format: 0x followed by 40 hexadecimal characters');
    console.log('   Example: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
    process.exit(1);
  }

  console.log('🔍 Checking NFT Ownership for:', walletAddress);
  console.log('='.repeat(60));

  try {
    // Direct contract check
    const provider = new ethers.JsonRpcProvider(
      process.env.RPC_URL || 'https://cloudflare-eth.com'
    );
    
    const abi = ['function balanceOf(address owner) view returns (uint256)'];
    const contract = new ethers.Contract(GENESIS_CONTRACT, abi, provider);
    
    console.log('\n📋 Direct Contract Check:');
    const balance = await contract.balanceOf(walletAddress);
    console.log(`  Genesis NFT Balance: ${balance.toString()}`);
    console.log(`  Has Genesis NFT: ${balance > 0 ? '✅ YES' : '❌ NO'}`);

    // Service check
    console.log('\n📋 Service Check:');
    const isPublisher = await nftVerification.isPublisher(walletAddress);
    const isAuditor = await nftVerification.isAuditor(walletAddress);
    
    console.log(`  Is Publisher: ${isPublisher ? '✅ YES' : '❌ NO'}`);
    console.log(`  Is Auditor: ${isAuditor ? '✅ YES' : '❌ NO'}`);

    console.log('\n' + '='.repeat(60));
    
    if (balance > 0) {
      console.log('\n🎉 SUCCESS! You own a THINK Genesis NFT!');
      console.log('   You can publish and audit skills on the registry.');
    } else {
      console.log('\n⚠️  No Genesis NFT found for this wallet.');
      console.log('   You can still browse skills but cannot publish or audit.');
      console.log('   Get a Genesis NFT at: https://opensea.io/collection/think-genesis');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

testWalletNFT();
