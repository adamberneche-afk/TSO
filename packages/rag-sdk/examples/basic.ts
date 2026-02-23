import { TAISClient, generateKeyPair, encryptDocument, decryptContent, generateEmbeddingHash, createChunks, encryptChunks } from '../src/index';

async function main() {
  const client = new TAISClient({
    baseUrl: 'https://tso.onrender.com',
    walletAddress: '0x8f49701734bfe3f3331c6f8ffeb814f73e4f5102',
  });

  console.log('=== TAIS RAG SDK Example ===\n');

  // 1. Health check
  console.log('1. Health Check');
  const health = await client.healthCheck();
  console.log('   Status:', health.status);
  console.log();

  // 2. Get stats
  console.log('2. RAG Statistics');
  const stats = await client.getStats();
  console.log('   Total Documents:', stats.totalDocuments);
  console.log('   My Documents:', stats.myDocuments);
  console.log('   Public Documents:', stats.publicDocuments);
  console.log();

  // 3. Get quota
  console.log('3. Quota Status');
  try {
    const quota = await client.getQuota();
    console.log('   Tier:', quota.tier);
    console.log('   Storage:', quota.storage.used, '/', quota.storage.quota, 'bytes');
    console.log('   Queries:', quota.queries.used, '/', quota.queries.limit);
  } catch (error: any) {
    console.log('   Error:', error.message);
  }
  console.log();

  // 4. List documents
  console.log('4. My Documents');
  const docs = await client.getDocuments();
  console.log('   Found:', docs.length, 'documents');
  docs.forEach((doc, i) => {
    console.log(`   ${i + 1}. ${doc.title} (${doc.size} bytes, ${doc.chunkCount} chunks)`);
  });
  console.log();

  // 5. Browse community
  console.log('5. Community Documents');
  const community = await client.getCommunityDocuments(5);
  console.log('   Found:', community.length, 'public documents');
  community.forEach((doc, i) => {
    console.log(`   ${i + 1}. ${doc.title} by ${doc.author}`);
  });
  console.log();

  // 6. Encryption demo (local)
  console.log('6. E2EE Demo (Local Encryption)');
  const keyPair = await generateKeyPair();
  console.log('   Generated key pair');
  console.log('   Public key:', keyPair.publicKey.slice(0, 20) + '...');

  const testContent = 'This is a secret document that will be encrypted end-to-end.';
  const { encryptedData, iv, salt } = await encryptDocument(testContent, {} as CryptoKey);
  console.log('   Encrypted content length:', encryptedData.length, 'chars');

  const embeddingHash = await generateEmbeddingHash(testContent);
  console.log('   Embedding hash:', embeddingHash.slice(0, 20) + '...');

  const chunks = createChunks(testContent, 20, 5);
  console.log('   Created', chunks.length, 'chunks');
  console.log();

  console.log('=== Example Complete ===');
}

main().catch(console.error);
