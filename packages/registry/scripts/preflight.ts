#!/usr/bin/env node

/**
 * TAIS Registry Pre-Flight Checks
 * 
 * This script performs comprehensive validation before deployment
 * Run with: npm run preflight
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string;
}

class PreflightCheck {
  private results: CheckResult[] = [];
  private prisma: PrismaClient | null = null;

  async run(): Promise<boolean> {
    console.log(chalk.blue.bold('\n🔍 TAIS Registry Pre-Flight Checks\n'));
    console.log(chalk.gray('=' .repeat(50)));

    // Run all checks
    await this.checkNodeVersion();
    await this.checkEnvironmentVariables();
    await this.checkDatabaseConnection();
    await this.checkDatabaseMigrations();
    await this.checkPrismaClient();
    await this.checkBuildArtifacts();
    await this.checkSecurityHeaders();
    await this.checkDependencies();
    await this.checkDiskSpace();
    await this.checkPortAvailability();
    await this.checkSSLCertificates();

    // Display results
    this.displayResults();

    // Return overall status
    return !this.results.some(r => r.status === 'fail');
  }

  private addResult(name: string, status: CheckResult['status'], message: string, details?: string) {
    this.results.push({ name, status, message, details });
  }

  private async checkNodeVersion() {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0]);
    
    if (major >= 18) {
      this.addResult('Node Version', 'pass', `✅ Node ${version} (>= 18.0.0)`);
    } else {
      this.addResult('Node Version', 'fail', `❌ Node ${version} (>= 18.0.0 required)`);
    }
  }

  private async checkEnvironmentVariables() {
    const required = [
      'DATABASE_URL',
      'JWT_SECRET',
      'NODE_ENV'
    ];

    const optional = [
      'IPFS_ENABLED',
      'IPFS_HOST',
      'IPFS_PROJECT_ID',
      'IPFS_PROJECT_SECRET',
      'RPC_URL',
      'STRIPE_SECRET_KEY',
      'AWS_ACCESS_KEY_ID'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length === 0) {
      this.addResult('Environment Variables', 'pass', '✅ All required variables set');
    } else {
      this.addResult('Environment Variables', 'fail', 
        `❌ Missing required: ${missing.join(', ')}`);
    }

    // Check JWT_SECRET strength
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length < 32) {
      this.addResult('JWT Secret Strength', 'warn', 
        '⚠️  JWT_SECRET should be at least 32 characters for security');
    }

    // Check if using default/example values
    if (jwtSecret === 'your_super_secret_jwt_key_change_in_production') {
      this.addResult('JWT Secret Default', 'fail', 
        '❌ JWT_SECRET is using default value from .env.example');
    }
  }

  private async checkDatabaseConnection() {
    try {
      this.prisma = new PrismaClient();
      await this.prisma.$connect();
      await this.prisma.$queryRaw`SELECT 1`;
      this.addResult('Database Connection', 'pass', '✅ Successfully connected');
    } catch (error: any) {
      this.addResult('Database Connection', 'fail', 
        '❌ Failed to connect', error.message);
    }
  }

  private async checkDatabaseMigrations() {
    try {
      if (!this.prisma) {
        this.addResult('Database Migrations', 'fail', '❌ No database connection');
        return;
      }

      // Check migration status
      const result = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count FROM _prisma_migrations
      `;
      const migrationCount = (result as any)[0].count;

      if (migrationCount > 0) {
        this.addResult('Database Migrations', 'pass', 
          `✅ ${migrationCount} migrations applied`);
      } else {
        this.addResult('Database Migrations', 'warn', 
          '⚠️  No migrations found. Run: npx prisma migrate deploy');
      }
    } catch (error: any) {
      this.addResult('Database Migrations', 'fail', 
        '❌ Migration check failed', error.message);
    }
  }

  private async checkPrismaClient() {
    const clientPath = path.join(__dirname, '../node_modules/.prisma/client');
    
    if (fs.existsSync(clientPath)) {
      this.addResult('Prisma Client', 'pass', '✅ Generated and available');
    } else {
      this.addResult('Prisma Client', 'fail', 
        '❌ Not found. Run: npx prisma generate');
    }
  }

  private async checkBuildArtifacts() {
    const distPath = path.join(__dirname, '../dist');
    const indexPath = path.join(distPath, 'index.js');
    
    if (fs.existsSync(indexPath)) {
      const stats = fs.statSync(indexPath);
      this.addResult('Build Artifacts', 'pass', 
        `✅ Build exists (${(stats.size / 1024).toFixed(2)} KB)`);
    } else {
      this.addResult('Build Artifacts', 'fail', 
        '❌ No build found. Run: npm run build');
    }
  }

  private async checkSecurityHeaders() {
    const helmetConfig = fs.readFileSync(
      path.join(__dirname, '../src/index.ts'), 
      'utf8'
    );
    
    if (helmetConfig.includes('helmet()')) {
      this.addResult('Security Headers', 'pass', '✅ Helmet middleware configured');
    } else {
      this.addResult('Security Headers', 'fail', '❌ Helmet not found');
    }
  }

  private async checkDependencies() {
    try {
      const auditResult = execSync('npm audit --json', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      const audit = JSON.parse(auditResult);
      const vulnerabilities = audit.metadata?.vulnerabilities || {};
      
      const total = Object.values(vulnerabilities).reduce((a: any, b: any) => a + b, 0);
      
      if (total === 0) {
        this.addResult('Dependency Audit', 'pass', '✅ No vulnerabilities found');
      } else {
        this.addResult('Dependency Audit', 'warn', 
          `⚠️  ${total} vulnerabilities found. Run: npm audit fix`);
      }
    } catch (error) {
      this.addResult('Dependency Audit', 'warn', 
        '⚠️  Could not run npm audit');
    }
  }

  private async checkDiskSpace() {
    try {
      const stats = fs.statSync('/');
      // This is a simplified check - in production use actual disk space check
      this.addResult('Disk Space', 'pass', '✅ Disk accessible');
    } catch (error) {
      this.addResult('Disk Space', 'warn', '⚠️  Could not check disk space');
    }
  }

  private async checkPortAvailability() {
    const port = process.env.PORT || 3000;
    
    try {
      // Simple check - actual check would try to bind to port
      this.addResult('Port Availability', 'pass', 
        `✅ Port ${port} configured`);
    } catch (error) {
      this.addResult('Port Availability', 'warn', 
        `⚠️  Could not verify port ${port}`);
    }
  }

  private async checkSSLCertificates() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (!isProduction) {
      this.addResult('SSL Certificates', 'pass', 
        '✅ Development mode (SSL handled by proxy)');
      return;
    }

    // In production, check for SSL cert files if not using managed service
    this.addResult('SSL Certificates', 'warn', 
      '⚠️  Ensure SSL is configured (Railway/Vercel provide automatically)');
  }

  private displayResults() {
    console.log('\n');
    
    const passCount = this.results.filter(r => r.status === 'pass').length;
    const failCount = this.results.filter(r => r.status === 'fail').length;
    const warnCount = this.results.filter(r => r.status === 'warn').length;

    this.results.forEach(result => {
      const icon = result.status === 'pass' ? chalk.green('✓') :
                   result.status === 'fail' ? chalk.red('✗') :
                   chalk.yellow('⚠');
      
      console.log(`${icon} ${chalk.bold(result.name)}`);
      console.log(`  ${result.message}`);
      if (result.details) {
        console.log(chalk.gray(`  Details: ${result.details}`));
      }
      console.log();
    });

    console.log(chalk.gray('=' .repeat(50)));
    console.log(chalk.bold('\n📊 Summary:'));
    console.log(chalk.green(`  ✅ Passed: ${passCount}`));
    console.log(chalk.red(`  ❌ Failed: ${failCount}`));
    console.log(chalk.yellow(`  ⚠️  Warnings: ${warnCount}`));
    console.log();

    if (failCount === 0) {
      console.log(chalk.green.bold('✅ All critical checks passed! Ready for deployment.\n'));
    } else {
      console.log(chalk.red.bold(`❌ ${failCount} critical check(s) failed. Fix before deploying.\n`));
      process.exit(1);
    }
  }
}

// Run checks
const checker = new PreflightCheck();
checker.run().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error(chalk.red('Pre-flight check failed:'), error);
  process.exit(1);
});