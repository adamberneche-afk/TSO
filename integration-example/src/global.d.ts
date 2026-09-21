import type { TaisApi } from '@think/core';

declare global {
  interface Window {
    taisAPI: TaisApi;
  }
}

export {};
