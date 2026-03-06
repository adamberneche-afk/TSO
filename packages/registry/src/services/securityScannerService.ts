export interface SecurityScanResult {
  safe: boolean;
  threats: Threat[];
  score: number;
}

export interface Threat {
  type: 'malware' | 'exploit' | 'pii' | 'injection' | 'suspicious';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
}

export class SecurityScannerService {
  private exploitPatterns = [
    { pattern: /<script[^>]*>.*?<\/script>/gi, type: 'exploit', severity: 'high' as const, desc: 'XSS script tag detected' },
    { pattern: /javascript:/gi, type: 'exploit', severity: 'medium' as const, desc: 'JavaScript protocol detected' },
    { pattern: /on\w+\s*=/gi, type: 'exploit', severity: 'high' as const, desc: 'Inline event handler detected' },
    { pattern: /eval\s*\(/gi, type: 'exploit', severity: 'high' as const, desc: 'Eval function detected' },
    { pattern: /<iframe/gi, type: 'exploit', severity: 'medium' as const, desc: 'Iframe element detected' },
    { pattern: /SELECT.*FROM.*WHERE/gi, type: 'injection', severity: 'high' as const, desc: 'SQL injection pattern detected' },
    { pattern: /UNION\s+SELECT/gi, type: 'injection', severity: 'critical' as const, desc: 'SQL UNION injection detected' },
    { pattern: /\$\{.*\}/g, type: 'injection', severity: 'medium' as const, desc: 'Template injection pattern detected' },
    { pattern: /\$\(/g, type: 'injection', severity: 'medium' as const, desc: 'Command injection pattern detected' },
    { pattern: /rm\s+-rf/gi, type: 'exploit', severity: 'critical' as const, desc: 'Destructive command detected' },
    { pattern: /curl\s+.*\|\s*sh/gi, type: 'exploit', severity: 'critical' as const, desc: 'Pipe to shell detected' },
    { pattern: /wget.*\|\s*sh/gi, type: 'exploit', severity: 'critical' as const, desc: 'Remote command execution detected' },
  ];

  private malwarePatterns = [
    { pattern: /base64_decode\s*\(/gi, type: 'malware', severity: 'high' as const, desc: 'Base64 decode detected' },
    { pattern: /shell_exec\s*\(/gi, type: 'malware', severity: 'critical' as const, desc: 'Shell execution detected' },
    { pattern: /system\s*\(/gi, type: 'malware', severity: 'critical' as const, desc: 'System command detected' },
    { pattern: /exec\s*\(/gi, type: 'malware', severity: 'critical' as const, desc: 'Exec function detected' },
    { pattern: /passthru\s*\(/gi, type: 'malware', severity: 'critical' as const, desc: 'Passthru detected' },
    { pattern: /proc_open\s*\(/gi, type: 'malware', severity: 'high' as const, desc: 'Process open detected' },
    { pattern: /pfsockopen\s*\(/gi, type: 'malware', severity: 'high' as const, desc: 'Socket connection detected' },
    { pattern: /fsockopen\s*\(/gi, type: 'malware', severity: 'medium' as const, desc: 'FSockopen detected' },
  ];

  private piiPatterns = [
    { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, type: 'pii', severity: 'medium' as const, desc: 'SSN pattern detected' },
    { pattern: /\b\d{16}\b/g, type: 'pii', severity: 'high' as const, desc: 'Credit card number detected' },
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, type: 'pii', severity: 'low' as const, desc: 'Email address detected' },
    { pattern: /\b\d{10}\b/g, type: 'pii', severity: 'medium' as const, desc: 'Phone number detected' },
  ];

  async scanContent(content: string): Promise<SecurityScanResult> {
    const threats: Threat[] = [];
    
    // Check for exploits
    for (const { pattern, type, severity, desc } of this.exploitPatterns) {
      if (pattern.test(content)) {
        threats.push({ type, severity, description: desc });
      }
    }

    // Check for malware patterns
    for (const { pattern, type, severity, desc } of this.malwarePatterns) {
      if (pattern.test(content)) {
        threats.push({ type, severity, description: desc });
      }
    }

    // Check for PII
    for (const { pattern, type, severity, desc } of this.piiPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        threats.push({ type, severity, description: `${desc} (${matches.length} occurrences)` });
      }
    }

    // Calculate safety score
    const score = this.calculateScore(threats);
    const safe = threats.filter(t => t.severity === 'critical' || t.severity === 'high').length === 0;

    return { safe, threats, score };
  }

  private calculateScore(threats: Threat[]): number {
    if (threats.length === 0) return 100;

    let deduction = 0;
    for (const threat of threats) {
      switch (threat.severity) {
        case 'critical':
          deduction += 40;
          break;
        case 'high':
          deduction += 25;
          break;
        case 'medium':
          deduction += 10;
          break;
        case 'low':
          deduction += 5;
          break;
      }
    }

    return Math.max(0, 100 - deduction);
  }

  async detectExploits(content: string): Promise<Threat[]> {
    const threats: Threat[] = [];
    
    for (const { pattern, type, severity, desc } of this.exploitPatterns) {
      if (pattern.test(content)) {
        threats.push({ type, severity, description: desc });
      }
    }

    return threats;
  }

  async detectMalware(content: string): Promise<Threat[]> {
    const threats: Threat[] = [];
    
    for (const { pattern, type, severity, desc } of this.malwarePatterns) {
      if (pattern.test(content)) {
        threats.push({ type, severity, description: desc });
      }
    }

    return threats;
  }

  async detectPII(content: string): Promise<Threat[]> {
    const threats: Threat[] = [];
    
    for (const { pattern, type, severity, desc } of this.piiPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        threats.push({ type, severity, description: `${desc} (${matches.length} occurrences)` });
      }
    }

    return threats;
  }

  // Quarantine content if unsafe
  async quarantineContent(content: string, result: SecurityScanResult): Promise<{ quarantined: boolean; reason?: string }> {
    if (!result.safe) {
      const critical = result.threats.filter(t => t.severity === 'critical' || t.severity === 'high');
      if (critical.length > 0) {
        return {
          quarantined: true,
          reason: `Content blocked due to: ${critical.map(t => t.description).join(', ')}`
        };
      }
    }
    return { quarantined: false };
  }
}

export const securityScannerService = new SecurityScannerService();
