// IPFS client with dynamic import for ESM compatibility
let ipfsClient: any = null;

export async function getIPFSClient(): Promise<any> {
  if (process.env.IPFS_ENABLED !== 'true') {
    return null;
  }

  if (ipfsClient) {
    return ipfsClient;
  }

  try {
    const { create } = await import('ipfs-http-client');
    ipfsClient = create({
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
    return ipfsClient;
  } catch (error) {
    console.error('❌ Failed to create IPFS client:', error);
    return null;
  }
}

// For backward compatibility - returns null immediately, client loads async
export function createIPFSClient(): any {
  if (process.env.IPFS_ENABLED !== 'true') {
    console.log('ℹ️  IPFS is disabled');
    return null;
  }
  
  // Initialize async but return null for now
  getIPFSClient().catch(console.error);
  return null;
}
