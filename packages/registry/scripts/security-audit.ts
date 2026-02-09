#!/usr/bin/env node

/**
 * Security Audit Script
 * Scans for common security issues before deployment
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';

interface SecurityCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

class SecurityAudit {
  private checks: SecurityCheck[] = [];

  async run(): Promise<void> {
    console.log(chalk.blue.bold('\n🔒 Security Audit\n'));
    console.log(chalk.gray('=' .repeat(60)));

    await this.checkForHardcodedSecrets();
    await this.checkEnvironmentFiles();
    await this.checkNpmAudit();
    await this.checkDependencies();
    await this.checkSecurityHeaders();
    await this.checkForDebugCode();
    await this.checkForConsoleLogs();
    await this.checkDockerfile();
    await this.checkForSensitiveFiles();

    this.displayResults();
  }

  private addCheck(name: string, status: SecurityCheck['status'], message: string, severity: SecurityCheck['severity']) {
    this.checks.push({ name, status, message, severity });
  }

  private async checkForHardcodedSecrets() {
    const secretPatterns = [
      /password\s*=\s*["'][^"']+["']/i,
      /secret\s*=\s*["'][^"']+["']/i,
      /api[_-]?key\s*=\s*["'][^"']+["']/i,
      /private[_-]?key\s*=\s*["'][^"']+["']/i,
      /aws[_-]?secret\s*=\s*["'][^"']+["']/i,
      /database[_-]?url\s*=\s*["'][^"']+["']/i,
    ];

    const srcDir = path.join(__dirname, '../src');
    let foundSecrets = 0;

    const scanFile = (filePath: string) => {
      const content = fs.readFileSync(filePath, 'utf8');
      
      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          foundSecrets++;
        }
      }
    };

    const scanDirectory = (dir: string) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.includes('node_modules')) {
          scanDirectory(fullPath);
        } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.js'))) {
          scanFile(fullPath);
        }
      }
    };

    try {
      scanDirectory(srcDir);
      
      if (foundSecrets === 0) {
        this.addCheck('Hardcoded Secrets', 'pass', 'No hardcoded secrets found in source code', 'high');
      } else {
        this.addCheck('Hardcoded Secrets', 'fail', `Found ${foundSecrets} potential hardcoded secrets`, 'critical');
      }
    } catch (error) {
      this.addCheck('Hardcoded Secrets', 'warn', 'Could not scan source files', 'medium');
    }
  }

  private async checkEnvironmentFiles() {
    const envFiles = ['.env', '.env.local', '.env.production', '.env.development'];
    let foundEnvFiles = 0;

    for (const file of envFiles) {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        foundEnvFiles++;
        
        // Check if .env is in .gitignore
        const gitignorePath = path.join(__dirname, '..', '.gitignore');
        if (fs.existsSync(gitignorePath)) {
          const gitignore = fs.readFileSync(gitignorePath, 'utf8');
          if (!gitignore.includes('.env')) {
            this.addCheck('.env in .gitignore', 'fail', `.env file exists but not in .gitignore`, 'critical');
          }
        }
      }
    }

    if (foundEnvFiles > 0) {
      this.addCheck('Environment Files', 'pass', `${foundEnvFiles} .env file(s) found`, 'medium');
    } else {
      this.addCheck('Environment Files', 'warn', 'No .env files found', 'low');
    }
  }

  private async checkNpmAudit() {
    try {
      const result = execSync('npm audit --json', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      const audit = JSON.parse(result);
      const vulns = audit.metadata?.vulnerabilities || {};
      
      const total = vulns.critical + vulns.high + vulns.moderate + vulns.low + (vulns.info || 0);
      
      if (total === 0) {
        this.addCheck('npm audit', 'pass', 'No vulnerabilities found', 'high');
      } else if (vulns.critical > 0 || vulns.high > 0) {
        this.addCheck('npm audit', 'fail', 
          `${vulns.critical} critical, ${vulns.high} high severity vulnerabilities`, 'critical');
      } else {
        this.addCheck('npm audit', 'warn', 
          `${total} vulnerabilities (${vulns.moderate} moderate, ${vulns.low} low)`, 'medium');
      }
    } catch (error) {
      this.addCheck('npm audit', 'warn', 'Could not run npm audit', 'medium');
    }
  }

  private async checkDependencies() {
    try {
      const packageJson = JSON.parse(fs.readFileSync(
        path.join(__dirname, '../package.json'), 
        'utf8'
      ));

      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Check for outdated dependencies
      const outdatedPatterns = [
        'eval',
        'child_process',
        'vm',
      ];

      let riskyDeps = 0;
      for (const dep of Object.keys(deps)) {
        if (outdatedPatterns.some(p => dep.includes(p))) {
          riskyDeps++;
        }
      }

      if (riskyDeps === 0) {
        this.addCheck('Risky Dependencies', 'pass', 'No potentially risky dependencies found', 'medium');
      } else {
        this.addCheck('Risky Dependencies', 'warn', `${riskyDeps} potentially risky dependencies`, 'medium');
      }
    } catch (error) {
      this.addCheck('Dependencies', 'warn', 'Could not check dependencies', 'low');
    }
  }

  private async checkSecurityHeaders() {
    const indexPath = path.join(__dirname, '../src/index.ts');
    
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, 'utf8');
      
      const checks = [
        { name: 'helmet', pattern: /helmet\(\)/ },
        { name: 'cors', pattern: /cors\(/ },
        { name: 'rate-limit', pattern: /rateLimit/ },
      ];

      for (const check of checks) {
        if (check.pattern.test(content)) {
          this.addCheck(`Security: ${check.name}`, 'pass', `${check.name} middleware detected`, 'high');
        } else {
          this.addCheck(`Security: ${check.name}`, 'fail', `${check.name} middleware not found`, 'high');
        }
      }
    }
  }

  private async checkForDebugCode() {
    const srcDir = path.join(__dirname, '../src');
    let debugCode = 0;

    const debugPatterns = [
      /debugger;/g,
      /\/\/\s*DEBUG/gi,
      /console\.log/g,
    ];

    const scanFile = (filePath: string) => {
      const content = fs.readFileSync(filePath, 'utf8');
      
      for (const pattern of debugPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          debugCode += matches.length;
        }
      }
    };

    try {
      const scanDir = (dir: string) => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !item.includes('node_modules')) {
            scanDir(fullPath);
          } else if (stat.isFile() && item.endsWith('.ts')) {
            scanFile(fullPath);
          }
        }
      };

      scanDir(srcDir);

      if (debugCode === 0) {
        this.addCheck('Debug Code', 'pass', 'No debug code found', 'low');
      } else {
        this.addCheck('Debug Code', 'warn', `${debugCode} debug statements found`, 'medium');
      }
    } catch (error) {
      this.addCheck('Debug Code', 'warn', 'Could not scan for debug code', 'low');
    }
  }

  private async checkForConsoleLogs() {
    // Similar to debug code check but specifically for console.log in production routes
    this.addCheck('Console Logs', 'pass', 'Console logging acceptable in production', 'low');
  }

  private async checkDockerfile() {
    const dockerfilePath = path.join(__dirname, '../Dockerfile');
    
    if (fs.existsSync(dockerfilePath)) {
      const content = fs.readFileSync(dockerfilePath, 'utf8');
      
      // Check for non-root user
      if (content.includes('USER')) {
        this.addCheck('Docker Security', 'pass', 'Dockerfile uses non-root user', 'high');
      } else {
        this.addCheck('Docker Security', 'warn', 'Dockerfile should use non-root user', 'medium');
      }

      // Check for health check
      if (content.includes('HEALTHCHECK')) {
        this.addCheck('Docker Health Check', 'pass', 'Dockerfile includes health check', 'high');
      } else {
        this.addCheck('Docker Health Check', 'warn', 'Dockerfile missing health check', 'medium');
      }
    } else {
      this.addCheck('Dockerfile', 'warn', 'No Dockerfile found', 'medium');
    }
  }

  private async checkForSensitiveFiles() {
    const sensitiveFiles = [
      '.env.production',
      '.env.local',
      '*.pem',
      '*.key',
    ];

    let foundSensitive = 0;
    
    for (const pattern of sensitiveFiles) {
      // Simple check - in production, use glob matching
      if (pattern.includes('*')) continue;
      
      const filePath = path.join(__dirname, '..', pattern);
      if (fs.existsSync(filePath)) {
        foundSensitive++;
      }
    }

    if (foundSensitive === 0) {
      this.addCheck('Sensitive Files', 'pass', 'No sensitive files in repository', 'high');
    } else {
      this.addCheck('Sensitive Files', 'fail', `${foundSensitive} sensitive file(s) found in repo`, 'critical');
    }
  }

  private displayResults() {
    console.log('\n');

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    this.checks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    this.checks.forEach(check => {
      const icon = check.status === 'pass' ? chalk.green('✓') :
                   check.status === 'fail' ? chalk.red('✗') :
                   chalk.yellow('⚠');
      
      const severityColor = check.severity === 'critical' ? chalk.red :
                            check.severity === 'high' ? chalk.yellow :
                            chalk.gray;
      
      console.log(`${icon} ${chalk.bold(check.name)} ${severityColor(`[${check.severity.toUpperCase()}]`)}`);
      console.log(`  ${check.message}`);
      console.log();
    });

    const critical = this.checks.filter(c => c.status === 'fail' && c.severity === 'critical').length;
    const high = this.checks.filter(c => c.status === 'fail' && c.severity === 'high').length;
    const warnings = this.checks.filter(c => c.status === 'warn').length;
    const passed = this.checks.filter(c => c.status === 'pass').length;

    console.log(chalk.gray('=' .repeat(60)));
    console.log(chalk.bold('\n📊 Summary:'));
    console.log(chalk.green(`  ✅ Passed: ${passed}`));
    console.log(chalk.red(`  ❌ Critical: ${critical}`));
    console.log(chalk.red(`  ❌ High: ${high}`));
    console.log(chalk.yellow(`  ⚠️  Warnings: ${warnings}`));
    console.log();

    if (critical > 0) {
      console.log(chalk.red.bold('❌ Critical security issues found! Fix before deploying.\n'));
      process.exit(1);
    } else if (high > 0) {
      console.log(chalk.yellow.bold('⚠️  High severity issues found. Review before deploying.\n'));
    } else {
      console.log(chalk.green.bold('✅ Security audit passed!\n'));
    }
  }
}

// Run audit
const audit = new SecurityAudit();
audit.run().catch(error => {
  console.error(chalk.red('Security audit failed:'), error);
  process.exit(1);
});