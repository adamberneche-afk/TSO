/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REGISTRY_URL: string;
  readonly VITE_RPC_URL: string;
  readonly VITE_GENESIS_CONTRACT: string;
  readonly VITE_APP_URL: string;
  readonly VITE_PUBLIC_RAG_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

export {};
