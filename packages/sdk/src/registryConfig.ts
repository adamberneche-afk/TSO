/**
 * Registry connection config for the non-Electron path of this SDK
 * (see docs/DOCS_VS_CODEBASE.md row 7). The Electron path talks to the
 * registry through `window.taisAPI`, a desktop IPC bridge that already
 * has its own auth story; a plain web/Node host has no such bridge, so
 * it configures this module directly -- typically with the JWT it
 * already obtained from its own wallet login (see
 * tais_frontend/.../useWallet.ts for that flow) once at startup.
 */

let registryBaseUrl = 'https://registry.tais.ai';
let authToken: string | undefined;

export function configureRegistry(config: { baseUrl?: string; authToken?: string }): void {
  if (config.baseUrl) {
    registryBaseUrl = config.baseUrl.replace(/\/+$/, '');
  }
  if (config.authToken !== undefined) {
    authToken = config.authToken;
  }
}

export function getRegistryBaseUrl(): string {
  return registryBaseUrl;
}

export function getRegistryAuthToken(): string | undefined {
  return authToken;
}
