import type { PlatformType, PlatformConfig } from '../../types/rag-enhanced';

/**
 * Detect current platform type
 */
export function detectPlatform(): PlatformType {
  // Check for Capacitor/Cordova (mobile app)
  if ((window as any).Capacitor || (window as any).cordova) {
    return 'mobile';
  }
  
  // Check for Electron (desktop app)
  if ((window as any).electron || (window as any).process?.versions?.electron) {
    return 'desktop';
  }
  
  // Check if running in a secure context with file system access
  if ('showOpenFilePicker' in window) {
    // Has File System Access API - could be desktop PWA
    return 'desktop';
  }
  
  // Check user agent for mobile
  const userAgent = navigator.userAgent.toLowerCase();
  if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
    return 'mobile';
  }
  
  // Default to web
  return 'web';
}

/**
 * Check if current platform supports local storage
 */
export function supportsLocalStorage(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Check if current platform supports IndexedDB
 */
export function supportsIndexedDB(): boolean {
  return 'indexedDB' in window;
}

/**
 * Check if current platform supports File System Access API
 */
export function supportsFileSystem(): boolean {
  return 'showOpenFilePicker' in window;
}

/**
 * Check if Web Crypto API is available
 */
export function supportsEncryption(): boolean {
  return 'crypto' in window && 'subtle' in window.crypto;
}

/**
 * Check if Secure Context (required for crypto and some APIs)
 */
export function isSecureContext(): boolean {
  return window.isSecureContext;
}

/**
 * Get platform capabilities
 */
export function getPlatformCapabilities() {
  return {
    localStorage: supportsLocalStorage(),
    indexedDB: supportsIndexedDB(),
    fileSystem: supportsFileSystem(),
    encryption: supportsEncryption() ? 'web-crypto-api' : 'none',
    secureContext: isSecureContext(),
    serviceWorker: 'serviceWorker' in navigator,
    backgroundSync: 'sync' in (navigator as any).serviceWorker?.registration || false
  };
}

/**
 * Get platform constraints based on detected platform
 */
export function getPlatformConstraints(platform: PlatformType): {
  maxFileSize: number;
  maxStorageSize: number;
  supportsBackgroundSync: boolean;
} {
  const capabilities = getPlatformCapabilities();
  
  switch (platform) {
    case 'desktop':
      return {
        maxFileSize: 100 * 1024 * 1024, // 100MB
        maxStorageSize: 500 * 1024 * 1024, // 500MB
        supportsBackgroundSync: capabilities.backgroundSync
      };
      
    case 'mobile':
      return {
        maxFileSize: 20 * 1024 * 1024, // 20MB
        maxStorageSize: 100 * 1024 * 1024, // 100MB
        supportsBackgroundSync: capabilities.backgroundSync
      };
      
    case 'web':
    default:
      return {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxStorageSize: 50 * 1024 * 1024, // 50MB
        supportsBackgroundSync: capabilities.backgroundSync
      };
  }
}

/**
 * Get complete platform configuration
 */
export function getPlatformConfig(): PlatformConfig {
  const platform = detectPlatform();
  const capabilities = getPlatformCapabilities();
  const constraints = getPlatformConstraints(platform);
  
  return {
    current: platform,
    capabilities,
    constraints
  };
}

/**
 * Check if a context source is available on current platform
 */
export function isSourceAvailableOnPlatform(
  sourcePlatforms: PlatformType[],
  currentPlatform: PlatformType
): boolean {
  // Direct match
  if (sourcePlatforms.includes(currentPlatform)) {
    return true;
  }
  
  // Desktop apps can access local storage
  if (currentPlatform === 'desktop' && sourcePlatforms.includes('local')) {
    return true;
  }
  
  // Web can access platform RAG
  if (currentPlatform === 'web' && sourcePlatforms.includes('web')) {
    return true;
  }
  
  return false;
}

/**
 * Determine which RAG sources to use based on context
 * Implements the dynamic selection logic from the architecture review
 */
export function selectRAGSources(
  platform: PlatformType,
  userAuth: boolean,
  appId?: string
): string[] {
  const sources: string[] = [];
  
  // Private RAG only on local platforms or desktop
  if (platform === 'desktop' || platform === 'local') {
    sources.push('private-local-rag');
  }
  
  // Platform RAG when authenticated and on supported platforms
  if (userAuth && ['web', 'mobile', 'desktop'].includes(platform)) {
    sources.push('tais-platform-rag');
  }
  
  // App-specific RAG when in app context
  if (appId && platform === 'app-integration') {
    sources.push('app-specific-rag');
  }
  
  return sources;
}

/**
 * Storage estimation for current platform
 */
export async function estimateStorage(): Promise<{
  used: number;
  available: number;
  total: number;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      available: (estimate.quota || 0) - (estimate.usage || 0),
      total: estimate.quota || 0
    };
  }
  
  // Fallback
  return {
    used: 0,
    available: 50 * 1024 * 1024, // Assume 50MB
    total: 50 * 1024 * 1024
  };
}
