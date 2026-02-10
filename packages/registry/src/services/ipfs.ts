import { create, IPFSHTTPClient } from 'ipfs-http-client';

export function createIPFSClient(): IPFSHTTPClient | null {
  if (process.env.IPFS_ENABLED !== 'true') {
    console.log('ℹ️  IPFS is disabled');
    return null;
  }

  try {
    const client = create({
      host: process.env.IPFS_HOST || 'ipfs.infura.io',
      port: parseInt(process.env.IPFS_PORT || '5001'),
      protocol: (process.env.IPFS_PROTOCOL as 'http' | 'https') || 'https',
      headers: {
        authorization: 'Basic ' + Buffer.from(
          `${process.env.IPFS_PROJECT_ID}:${process.env.IPFS_PROJECT_SECRET}`
        ).toString('base64')
      }
    });

    console.log('✅ IPFS client initialized');
    return client;
  } catch (error) {
    console.error('❌ Failed to create IPFS client:', error);
    return null;
  }
}

// For backward compatibility
export function getIPFSClient(): IPFSHTTPClient | null {
  return createIPFSClient();
}
