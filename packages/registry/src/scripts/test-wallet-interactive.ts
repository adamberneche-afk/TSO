/**
 * Interactive Wallet Test
 * Guides user through entering their wallet address
 * 
 * Usage: npx ts-node src/scripts/test-wallet-interactive.ts
 */

import { ethers } from 'ethers';
import * as readline from 'readline';

const GENESIS_CONTRACT = '0x11B3EfbF04F0bA505F380aC20444B6952970AdA6';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

async function testWallet(address: string) {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 Checking THINK Genesis NFT Ownership');
  console.log('Wallet:', address);
  console.log('='.repeat(60));

  try {
    const provider = new ethers.JsonRpcProvider(
      process.env.RPC_URL || 'https://cloudflare-eth.com'
    );
    
    const abi = ['function balanceOf(address owner) view returns (uint256)'];
    const contract = new ethers.Contract(GENESIS_CONTRACT, abi, provider);
    
    console.log('\n📋 Checking Genesis NFT Contract:');
    console.log('  Contract:', GENESIS_CONTRACT);
    console.log('  Network: Ethereum Mainnet');
    
    const balance = await contract.balanceOf(address);
    
    console.log(`\n✅ Query Successful!`);
    console.log(`  Genesis NFT Balance: ${balance.toString()}`);
    console.log(`  Has Genesis NFT: ${balance > 0 ? '✅ YES' : '❌ NO'}`);

    console.log('\n' + '='.repeat(60));
    
    if (balance > 0) {
      console.log('\n🎉 Congratulations! You own a THINK Genesis NFT!');
      console.log('   You can:');
      console.log('   • Publish skills to the registry');
      console.log('   • Submit security audits');
      console.log('   • Participate in governance');
    } else {
      console.log('\n⚠️  No Genesis NFT found for this wallet.');
      console.log('   You can still:');
      console.log('   • Browse and download skills');
      console.log('   • View public skill registry');
      console.log('\n   To get full access, acquire a Genesis NFT:');
      console.log('   https://opensea.io/collection/think-genesis');
    }

  } catch (error) {
    console.error('\n❌ Error querying blockchain:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('🧪 TAIS Blockchain Live Testing\n');
  
  // Check environment first
  const envAddress = process.env.TEST_WALLET_ADDRESS;
  
  if (envAddress && isValidAddress(envAddress)) {
    console.log('✅ Found TEST_WALLET_ADDRESS in environment');
    await testWallet(envAddress);
  } else {
    console.log('Enter your Ethereum wallet address to test Genesis NFT ownership.');
    console.log('(Your address should look like: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045)\n');
    
    const address = await question('Wallet Address: ');
    
    if (!isValidAddress(address)) {
      console.log('\n❌ Invalid address format');
      console.log('   Expected: 0x followed by 40 hexadecimal characters');
      console.log('   Example: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
      process.exit(1);
    }
    
    await testWallet(address);
  }
  
  rl.close();
}

main().catch(console.error);
