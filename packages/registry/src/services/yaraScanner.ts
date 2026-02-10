import yara from '@automattic/yara';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface YaraFinding {
  rule: string;
  namespace: string;
  tags: string[];
  meta: Record<string, any>;
  strings: Array<{
    identifier: string;
    instances: Array<{
      offset: number;
      length: number;
      data: string;
    }>;
  }>;
}

export interface SecurityScanResult {
  skillHash: string;
  timestamp: Date;
  findings: YaraFinding[];
  severity: 'safe' | 'suspicious' | 'malicious';
  summary: {
    totalRules: number;
    matchedRules: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  scanDuration: number;
  scannedFiles: number;
  scannedBytes: number;
}

export interface YaraRule {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  content: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class YaraScanner {
  private rules: yara.Rules | null = null;
  private rulesDir: string;
  private initialized: boolean = false;

  constructor(rulesDir: string = path.join(__dirname, '../../yara-rules')) {
    this.rulesDir = rulesDir;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure rules directory exists
      if (!fs.existsSync(this.rulesDir)) {
        fs.mkdirSync(this.rulesDir, { recursive: true });
        await this.createDefaultRules();
      }

      // Compile all YARA rules
      await this.compileRules();
      
      this.initialized = true;
      console.log('✅ YARA scanner initialized');
    } catch (error: any) {
      console.error('❌ Failed to initialize YARA scanner:', error.message);
      throw error;
    }
  }

  private async createDefaultRules(): Promise<void> {
    const defaultRules = [
      this.getCredentialTheftRule(),
      this.getDataExfiltrationRule(),
      this.getMaliciousDomainsRule(),
      this.getProcessInjectionRule(),
      this.getSuspiciousImportsRule(),
      this.getObfuscatedCodeRule(),
    ];

    for (const rule of defaultRules) {
      const rulePath = path.join(this.rulesDir, `${rule.name}.yar`);
      fs.writeFileSync(rulePath, rule.content);
    }

    console.log(`✅ Created ${defaultRules.length} default YARA rules`);
  }

  private async compileRules(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Load all .yar files from rules directory
        const ruleFiles = fs.readdirSync(this.rulesDir)
          .filter(f => f.endsWith('.yar'))
          .map(f => path.join(this.rulesDir, f));

        if (ruleFiles.length === 0) {
          console.warn('⚠️  No YARA rules found');
          resolve();
          return;
        }

        // Compile rules
        yara.compile({
          sources: ruleFiles.map(file => ({
            filename: file,
            content: fs.readFileSync(file, 'utf8'),
          })),
        }, (error: any, rules: yara.Rules) => {
          if (error) {
            reject(new Error(`YARA compilation failed: ${error.message}`));
          } else {
            this.rules = rules;
            console.log(`✅ Compiled ${ruleFiles.length} YARA rules`);
            resolve();
          }
        });
      } catch (error: any) {
        reject(error);
      }
    });
  }

  async scanFile(filePath: string, skillHash: string): Promise<SecurityScanResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.rules) {
      throw new Error('YARA rules not compiled');
    }

    const startTime = Date.now();
    const stats = fs.statSync(filePath);

    return new Promise((resolve, reject) => {
      this.rules!.scanFile(filePath, {}, (error: any, result: any) => {
        if (error) {
          reject(new Error(`Scan failed: ${error.message}`));
          return;
        }

        const findings = this.processFindings(result);
        const severity = this.calculateSeverity(findings);
        const summary = this.calculateSummary(findings);

        resolve({
          skillHash,
          timestamp: new Date(),
          findings,
          severity,
          summary,
          scanDuration: Date.now() - startTime,
          scannedFiles: 1,
          scannedBytes: stats.size,
        });
      });
    });
  }

  async scanBuffer(buffer: Buffer, skillHash: string, filename: string = 'buffer'): Promise<SecurityScanResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.rules) {
      throw new Error('YARA rules not compiled');
    }

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      this.rules!.scanBuffer(buffer, {}, (error: any, result: any) => {
        if (error) {
          reject(new Error(`Scan failed: ${error.message}`));
          return;
        }

        const findings = this.processFindings(result);
        const severity = this.calculateSeverity(findings);
        const summary = this.calculateSummary(findings);

        resolve({
          skillHash,
          timestamp: new Date(),
          findings,
          severity,
          summary,
          scanDuration: Date.now() - startTime,
          scannedFiles: 1,
          scannedBytes: buffer.length,
        });
      });
    });
  }

  async scanDirectory(dirPath: string, skillHash: string): Promise<SecurityScanResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const allFindings: YaraFinding[] = [];
    let totalFiles = 0;
    let totalBytes = 0;

    const scanFiles = async (dir: string): Promise<void> => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await scanFiles(fullPath);
        } else if (entry.isFile()) {
          // Only scan relevant files
          if (this.shouldScanFile(entry.name)) {
            try {
              const stats = fs.statSync(fullPath);
              const result = await this.scanFile(fullPath, skillHash);
              allFindings.push(...result.findings);
              totalFiles++;
              totalBytes += stats.size;
            } catch (error) {
              // Skip files that can't be scanned
              console.warn(`⚠️  Could not scan ${fullPath}`);
            }
          }
        }
      }
    };

    await scanFiles(dirPath);

    const severity = this.calculateSeverity(allFindings);
    const summary = this.calculateSummary(allFindings);

    return {
      skillHash,
      timestamp: new Date(),
      findings: allFindings,
      severity,
      summary,
      scanDuration: Date.now() - startTime,
      scannedFiles: totalFiles,
      scannedBytes: totalBytes,
    };
  }

  private shouldScanFile(filename: string): boolean {
    const extensions = ['.js', '.ts', '.json', '.md', '.txt', '.yaml', '.yml'];
    const ext = path.extname(filename).toLowerCase();
    return extensions.includes(ext) || filename === 'manifest.json';
  }

  private processFindings(result: any): YaraFinding[] {
    if (!result || !result.rules) return [];

    return result.rules.map((rule: any) => ({
      rule: rule.rule,
      namespace: rule.namespace || 'default',
      tags: rule.tags || [],
      meta: rule.meta || {},
      strings: (rule.strings || []).map((str: any) => ({
        identifier: str.identifier,
        instances: (str.instances || []).map((inst: any) => ({
          offset: inst.offset,
          length: inst.length,
          data: inst.data.toString('utf8').substring(0, 100), // Limit data size
        })),
      })),
    }));
  }

  private calculateSeverity(findings: YaraFinding[]): SecurityScanResult['severity'] {
    const severities = findings.map(f => f.meta.severity || 'low');

    if (severities.includes('critical')) return 'malicious';
    if (severities.includes('high')) return 'malicious';
    if (severities.includes('medium')) return 'suspicious';
    if (severities.includes('low')) return 'suspicious';
    return 'safe';
  }

  private calculateSummary(findings: YaraFinding[]) {
    const summary = {
      totalRules: 0, // Would need to track this
      matchedRules: findings.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const finding of findings) {
      const severity = finding.meta.severity || 'low';
      if (severity === 'critical') summary.critical++;
      else if (severity === 'high') summary.high++;
      else if (severity === 'medium') summary.medium++;
      else summary.low++;
    }

    return summary;
  }

  // Default YARA Rules
  private getCredentialTheftRule(): { name: string; content: string } {
    return {
      name: 'credential_theft',
      content: `
rule Credential_Theft {
  meta:
    description = "Detects attempts to access credential files"
    severity = "critical"
    category = "credential_access"
    author = "TAIS Security Team"
    date = "2024-02-05"
  
  strings:
    $env_file = ".env" nocase
    $env_pattern = /process\.env\.[A-Z_]+/
    $key_pattern = /api[_-]?key|secret|password|token|private[_-]?key/i
    $file_access = /readFileSync|readFile|fs\.read/i
    $webhook = /webhook\.site|requestbin|pastebin/i
  
  condition:
    ($env_file or $env_pattern) and ($key_pattern or $file_access) or
    ($file_access and $webhook)
}
`,
    };
  }

  private getDataExfiltrationRule(): { name: string; content: string } {
    return {
      name: 'data_exfiltration',
      content: `
rule Data_Exfiltration {
  meta:
    description = "Detects potential data exfiltration attempts"
    severity = "high"
    category = "exfiltration"
    author = "TAIS Security Team"
    date = "2024-02-05"
  
  strings:
    $suspicious_domains = /webhook\.site|requestbin\.com|ngrok\.io|pastebin\.com|bin\.sshh/i
    $fetch = /fetch\(|axios\.|request\(/i
    $post = /method:\s*["']post["']/i
    $data_transfer = /JSON\.stringify|Buffer\.from|btoa|atob/i
  
  condition:
    $suspicious_domains and ($fetch or $post) and $data_transfer
}
`,
    };
  }

  private getMaliciousDomainsRule(): { name: string; content: string } {
    return {
      name: 'malicious_domains',
      content: `
rule Malicious_Domains {
  meta:
    description = "Detects connections to known malicious domains"
    severity = "critical"
    category = "network"
    author = "TAIS Security Team"
    date = "2024-02-05"
  
  strings:
    $domain1 = "webhook.site"
    $domain2 = "requestbin.com"
    $domain3 = "ngrok.io"
    $domain4 = "pastebin.com"
    $domain5 = "bin.sshh"
    $domain6 = "api.telegram.org"
    $http = /https?:\/\//
  
  condition:
    $http and any of ($domain*)
}
`,
    };
  }

  private getProcessInjectionRule(): { name: string; content: string } {
    return {
      name: 'process_injection',
      content: `
rule Process_Injection {
  meta:
    description = "Detects potential process injection techniques"
    severity = "high"
    category = "process_manipulation"
    author = "TAIS Security Team"
    date = "2024-02-05"
  
  strings:
    $child_process = /require\(["']child_process["']\)/
    $exec = /exec\(|execSync\(|spawn\(/i
    $eval = /eval\(|Function\(|setTimeout\(.*,.*\)/i
    $vm = /require\(["']vm["']\)|vm\.runInContext/i
  
  condition:
    $child_process and $exec or $eval or $vm
}
`,
    };
  }

  private getSuspiciousImportsRule(): { name: string; content: string } {
    return {
      name: 'suspicious_imports',
      content: `
rule Suspicious_Imports {
  meta:
    description = "Detects suspicious module imports"
    severity = "medium"
    category = "imports"
    author = "TAIS Security Team"
    date = "2024-02-05"
  
  strings:
    $dangerous = /require\(["'](child_process|fs|net|http|https|vm|cluster|dgram)["']\)/
    $obfuscated = /require\(["'][^"']{50,}["']\)/
    $dynamic = /require\s*\(\s*[^"']+\s*\)/
  
  condition:
    $dangerous or $obfuscated or $dynamic
}
`,
    };
  }

  private getObfuscatedCodeRule(): { name: string; content: string } {
    return {
      name: 'obfuscated_code',
      content: `
rule Obfuscated_Code {
  meta:
    description = "Detects potentially obfuscated or encoded code"
    severity = "medium"
    category = "obfuscation"
    author = "TAIS Security Team"
    date = "2024-02-05"
  
  strings:
    $base64 = /atob\(|btoa\(|Buffer\.from\(.*['"]base64['"]\)/i
    $hex = /\\x[0-9a-fA-F]{2}/
    $unicode = /\\u[0-9a-fA-F]{4}/
    $long_strings = /["'][a-zA-Z0-9+/]{100,}["']/
    $eval_encoded = /eval\(.*atob|eval\(.*Buffer\.from/i
  
  condition:
    ($base64 or $hex or $unicode) and $long_strings or $eval_encoded
}
`,
    };
  }

  // Public methods for rule management
  async reloadRules(): Promise<void> {
    this.initialized = false;
    await this.initialize();
  }

  getRulesDirectory(): string {
    return this.rulesDir;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export default YaraScanner;