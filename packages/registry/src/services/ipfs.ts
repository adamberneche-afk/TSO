import type { IPFSHTTPClient } from 'ipfs-http-client';

// ipfs-http-client@60.x (bumped from 55.x by Dependabot) is pure ESM --
// `"type": "module"`, no CommonJS build at all. This package compiles to
// CommonJS (see tsconfig.json's `module: "commonjs"`), and TypeScript
// always downlevels a plain `await import(...)` to
// `Promise.resolve().then(() => require(...))` under that target
// regardless of source syntax -- so even a *dynamic* import here would
// still hit Node's CJS `require()`, which throws `ERR_REQUIRE_ESM` for a
// pure-ESM package just as surely as the static import this replaced did.
// A static top-level import made it worse: every test that merely loaded
// index.ts (transitively, via skills.ts) crashed immediately, even though
// IPFS is disabled by default and this function's body was never reached.
//
// The fix is to perform a genuine native ESM dynamic import, invisible to
// tsc's static transform -- constructing the `import()` call via `new
// Function` so TypeScript never sees the specifier at compile time and
// has nothing to downlevel.
const importIpfsHttpClient = new Function(
  'specifier',
  'return import(specifier)'
) as (specifier: string) => Promise<typeof import('ipfs-http-client')>;

export async function createIPFSClient(): Promise<IPFSHTTPClient | null> {
  if (process.env.IPFS_ENABLED !== 'true') {
    console.log('ℹ️  IPFS is disabled');
    return null;
  }

  try {
    const { create } = await importIpfsHttpClient('ipfs-http-client');
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
export async function getIPFSClient(): Promise<IPFSHTTPClient | null> {
  return createIPFSClient();
}
