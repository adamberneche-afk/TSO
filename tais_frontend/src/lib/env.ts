/// <reference types="vite/client" />

function getEnvVar(key: string): string {
  const value = import.meta.env[key];
  if (value === undefined || value === '') {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export const env = {
  registryUrl: getEnvVar('VITE_REGISTRY_URL'),
  rpcUrl: getEnvVar('VITE_RPC_URL'),
  genesisContract: getEnvVar('VITE_GENESIS_CONTRACT'),
  appUrl: getEnvVar('VITE_APP_URL'),
  publicRagApiUrl: import.meta.env.VITE_PUBLIC_RAG_API_URL ?? undefined,
  isFeatureEnabled: (flag: string): boolean => {
    const val = import.meta.env[`VITE_FEATURE_${flag.toUpperCase()}`];
    return val === 'true' || val === '1';
  },
};