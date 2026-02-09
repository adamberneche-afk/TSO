import { VM } from 'vm2';
import fs from 'fs/promises';
import { Permission } from '@think/types';

interface SecurityViolation {
  type: 'filesystem' | 'network' | 'env' | 'module' | 'timeout';
  operation: string;
  resource: string;
  blocked: boolean;
}

export class SandboxService {
  private manifest: Permission;
  private allowedEnvVars: Set<string>;
  private allowedDomains: Set<string>;
  private allowedReadPaths: Set<string>;
  private allowedWritePaths: Set<string>;
  private allowedModules: Set<string>;
  private violationLog: SecurityViolation[] = [];

  constructor(permissions: Permission) {
    this.manifest = permissions;
    this.allowedEnvVars = new Set(permissions.env_vars || []);
    this.allowedDomains = new Set(permissions.network?.domains || []);
    this.allowedReadPaths = new Set(permissions.filesystem?.read || []);
    this.allowedWritePaths = new Set(permissions.filesystem?.write || []);
    this.allowedModules = new Set(permissions.modules || []);
  }

  async executeSkill(skillCode: string, timeoutMs: number = 5000): Promise<any> {
    const violations: SecurityViolation[] = [];

    const sandbox = this.createRestrictedSandbox(violations);

    try {
      const vm = new VM({
        timeout: timeoutMs,
        sandbox,
        allowAsync: true,
        eval: false,
        wasm: false,
        fixAsync: true,
      });

      const wrappedCode = `
        (async function() {
          ${skillCode}
        })()
      `;

      const result = await vm.run(wrappedCode);
      return { success: true, result, violations };
    } catch (error: any) {
      if (error.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
        violations.push({
          type: 'timeout',
          operation: 'execution',
          resource: 'skill',
          blocked: true,
        });
      }
      return { success: false, error: error.message, violations };
    } finally {
      this.violationLog.push(...violations);
    }
  }

  private createRestrictedSandbox(violations: SecurityViolation[]): any {
    const safeFs = this.createRestrictedFs(violations);
    const safeFetch = this.createRestrictedFetch(violations);
    const safeRequire = this.createRestrictedRequire(violations);

    return {
      console: {
        log: (...args: any[]) => console.log('[Skill]', ...args),
        error: (...args: any[]) => console.error('[Skill]', ...args),
      },

      require: safeRequire,

      setTimeout: setTimeout,
      setInterval: setInterval,
      clearTimeout: clearTimeout,
      clearInterval: clearInterval,

      Promise: Promise,
      Array: Array,
      Object: Object,
      String: String,
      Number: Number,
      Boolean: Boolean,
      Math: Math,
      JSON: JSON,

      fetch: safeFetch,

      fs: safeFs,

      process: {
        env: this.createRestrictedEnv(violations),
        cwd: () => process.cwd(),
      },

      Buffer: Buffer,
    };
  }

  private createRestrictedEnv(violations: SecurityViolation[]): any {
    const self = this;
    const proxyEnv = new Proxy(process.env, {
      get(target, prop: string) {
        if (typeof prop === 'string' && !self.allowedEnvVars.has(prop)) {
          violations.push({
            type: 'env',
            operation: 'READ',
            resource: prop,
            blocked: true,
          });
          return undefined;
        }
        return target[prop];
      },

      set(target, prop: string, value: any) {
        if (typeof prop === 'string' && !self.allowedEnvVars.has(prop)) {
          violations.push({
            type: 'env',
            operation: 'WRITE',
            resource: prop,
            blocked: true,
          });
          return true;
        }
        target[prop] = value;
        return true;
      },
    });

    return proxyEnv;
  }

  private createRestrictedFs(violations: SecurityViolation[]): any {
    return {
      readFile: async (filePath: string, options?: any) => {
        if (!this.isPathAllowed(filePath, this.allowedReadPaths)) {
          violations.push({
            type: 'filesystem',
            operation: 'READ',
            resource: filePath,
            blocked: true,
          });
          throw new Error(`Security: File read not permitted for ${filePath}`);
        }
        return fs.readFile(filePath, options);
      },

      writeFile: async (filePath: string, data: any, options?: any) => {
        if (!this.isPathAllowed(filePath, this.allowedWritePaths)) {
          violations.push({
            type: 'filesystem',
            operation: 'WRITE',
            resource: filePath,
            blocked: true,
          });
          throw new Error(`Security: File write not permitted for ${filePath}`);
        }
        return fs.writeFile(filePath, data, options);
      },

      readDir: async (filePath: string, options?: any) => {
        if (!this.isPathAllowed(filePath, this.allowedReadPaths)) {
          violations.push({
            type: 'filesystem',
            operation: 'READDIR',
            resource: filePath,
            blocked: true,
          });
          throw new Error(`Security: File read not permitted for ${filePath}`);
        }
        return fs.readdir(filePath, options);
      },
    };
  }

  private createRestrictedFetch(violations: SecurityViolation[]): any {
    return async (url: string, options?: RequestInit) => {
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        if (!this.isDomainAllowed(hostname)) {
          violations.push({
            type: 'network',
            operation: 'FETCH',
            resource: url,
            blocked: true,
          });
          throw new Error(`Security: Network request to ${url} not permitted`);
        }

        return await fetch(url, options);
      } catch (error: any) {
        if (error.message.includes('Security:')) {
          throw error;
        }
        throw new Error(`Security: Invalid URL or network error`);
      }
    };
  }

  private createRestrictedRequire(violations: SecurityViolation[]): any {
    const forbiddenModules = [
      'child_process', 'fs', 'path', 'os', 'net', 'http', 'https',
      'dns', 'cluster', 'worker_threads', 'dgram', 'tls'
    ];

    return (moduleName: string) => {
      if (forbiddenModules.includes(moduleName)) {
        violations.push({
          type: 'module',
          operation: 'REQUIRE',
          resource: moduleName,
          blocked: true,
        });
        throw new Error(`Security: Module '${moduleName}' not permitted in skill sandbox`);
      }

      if (this.allowedModules.size > 0 && !this.allowedModules.has(moduleName)) {
        violations.push({
          type: 'module',
          operation: 'REQUIRE',
          resource: moduleName,
          blocked: true,
        });
        throw new Error(`Security: Module '${moduleName}' not in permitted modules list`);
      }

      try {
        return require(moduleName);
      } catch (error) {
        throw new Error(`Module '${moduleName}' not found or not permitted`);
      }
    };
  }

  private isPathAllowed(filePath: string, allowedPaths: Set<string>): boolean {
    if (allowedPaths.size === 0) return false;

    for (const allowedPath of allowedPaths) {
      if (filePath.startsWith(allowedPath)) {
        return true;
      }
    }
    return false;
  }

  private isDomainAllowed(hostname: string): boolean {
    if (this.allowedDomains.size === 0) return false;

    for (const allowedDomain of this.allowedDomains) {
      if (hostname === allowedDomain || hostname.endsWith('.' + allowedDomain)) {
        return true;
      }
    }
    return false;
  }

  getViolations(): SecurityViolation[] {
    return [...this.violationLog];
  }

  clearViolations(): void {
    this.violationLog = [];
  }

  hasCriticalViolations(): boolean {
    return this.violationLog.some(v => v.blocked && v.type !== 'env');
  }
}
