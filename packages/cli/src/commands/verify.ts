import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { TaisServiceManager } from '../services/TaisServiceManager';

interface VerificationResult {
  valid: boolean;
  type: 'skill' | 'author' | 'provenance';
  checks: VerificationCheck[];
}

interface VerificationCheck {
  name: string;
  passed: boolean;
  message: string;
  details?: string;
}

export async function verifyCommand(target: string, options: any) {
  const spinner = ora();
  
  try {
    console.log(chalk.blue.bold('🔍 TAIS Verification Tool'));
    console.log(chalk.gray('═'.repeat(50)));

    // Step 1: Determine verification type
    const verificationType = determineVerificationType(target, options);

    // Step 2: Perform verification
    let result: VerificationResult;

    if (options.author) {
      result = await verifyAuthor(target);
    } else if (options.provenance) {
      result = await verifyProvenance(target);
    } else {
      result = await verifySkill(target);
    }

    // Step 3: Display results
    displayVerificationResults(result);

    if (result.valid) {
      console.log(chalk.green('\n✅ Verification Passed'));
      process.exit(0);
    } else {
      console.log(chalk.red('\n❌ Verification Failed'));
      process.exit(1);
    }

  } catch (error: any) {
    spinner.fail('Verification failed');
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

function determineVerificationType(target: string, options: any): string {
  if (options.author) return 'author';
  if (options.provenance) return 'provenance';
  if (target.startsWith('0x') && target.length === 42) return 'author';
  if (target.length === 64 && /^[a-fA-F0-9]+$/.test(target)) return 'skill';
  return 'skill';
}

async function verifySkill(skillHash: string): Promise<VerificationResult> {
  try {
    const serviceManager = new TaisServiceManager();
    const result = await serviceManager.verifySkill(skillHash);
    
    const checks: VerificationCheck[] = [
      {
        name: 'Hash Format',
        passed: isValidHash(skillHash),
        message: isValidHash(skillHash) ? 'Valid SHA-256 hash format' : 'Invalid hash format'
      },
      {
        name: 'Community Safety',
        passed: !result.isBlocked,
        message: result.isBlocked ? 'Flagged as malicious by community' : 'Not flagged as malicious by community'
      },
      {
        name: 'Trust Score',
        passed: result.trustScore > 0.5,
        message: `Trust score: ${(result.trustScore * 100).toFixed(1)}%`,
        details: result.trustScore > 0.5 ? 'Above minimum threshold (50%)' : 'Below minimum threshold'
      },
      {
        name: 'Provenance Chain',
        passed: result.provenance !== undefined,
        message: result.provenance ? 'Provenance chain found' : 'No provenance chain available'
      },
      {
        name: 'Overall Verification',
        passed: result.isValid,
        message: result.isValid ? 'Skill passes all security checks' : 'Skill fails security verification'
      }
    ];

    return {
      valid: result.isValid,
      type: 'skill',
      checks
    };
  } catch (error: any) {
    // Fallback to mock verification if services are not available
    const checks: VerificationCheck[] = [
      {
        name: 'Hash Format',
        passed: isValidHash(skillHash),
        message: isValidHash(skillHash) ? 'Valid SHA-256 hash format' : 'Invalid hash format'
      },
      {
        name: 'Community Safety',
        passed: await checkCommunitySafety(skillHash),
        message: 'Not flagged as malicious by community'
      },
      {
        name: 'Trust Score',
        passed: true,
        message: 'Trust score: 75.0% (mock)',
        details: 'Above minimum threshold (50%)'
      },
      {
        name: 'Service Status',
        passed: false,
        message: 'Core services unavailable - using fallback verification'
      }
    ];

    return {
      valid: checks.every(check => check.passed),
      type: 'skill',
      checks
    };
  }
}

async function verifyAuthor(walletAddress: string): Promise<VerificationResult> {
  try {
    const serviceManager = new TaisServiceManager();
    const result = await serviceManager.verifyAuthor(walletAddress);
    
    const checks: VerificationCheck[] = [
      {
        name: 'Address Format',
        passed: isValidAddress(walletAddress),
        message: isValidAddress(walletAddress) ? 'Valid Ethereum address format' : 'Invalid address format'
      },
      {
        name: 'Publisher NFT',
        passed: result.hasPublisherNft,
        message: result.hasPublisherNft ? 'Publisher NFT ownership verified' : 'No Publisher NFT found'
      },
      {
        name: 'Published Skills',
        passed: result.authorSkills > 0,
        message: `Author has published ${result.authorSkills} skill(s)`,
        details: result.authorSkills > 0 ? 'Active publisher' : 'No skills published yet'
      },
      {
        name: 'Community Reputation',
        passed: result.reputation > 0.7,
        message: `Reputation score: ${(result.reputation * 100).toFixed(1)}%`,
        details: result.reputation > 0.7 ? 'Trusted publisher' : 'New or lower reputation'
      }
    ];

    return {
      valid: result.isValid,
      type: 'author',
      checks
    };
  } catch (error: any) {
    // Fallback to mock verification if services are not available
    const checks: VerificationCheck[] = [
      {
        name: 'Address Format',
        passed: isValidAddress(walletAddress),
        message: isValidAddress(walletAddress) ? 'Valid Ethereum address format' : 'Invalid address format'
      },
      {
        name: 'Publisher NFT',
        passed: await checkPublisherNFT(walletAddress),
        message: 'Publisher NFT ownership verified (mock)'
      },
      {
        name: 'Published Skills',
        passed: true,
        message: 'Author has published 3 skill(s) (mock)',
        details: 'Active publisher'
      },
      {
        name: 'Service Status',
        passed: false,
        message: 'Core services unavailable - using fallback verification'
      }
    ];

    return {
      valid: checks.every(check => check.passed),
      type: 'author',
      checks
    };
  }
}

async function verifyProvenance(skillHash: string): Promise<VerificationResult> {
  try {
    const serviceManager = new TaisServiceManager();
    const result = await serviceManager.verifyProvenance(skillHash);
    
    const checks: VerificationCheck[] = [
      {
        name: 'Chain Exists',
        passed: result.provenance !== undefined,
        message: result.provenance ? 'Provenance chain found' : 'No provenance chain available'
      },
      {
        name: 'Chain Validity',
        passed: result.isValid,
        message: result.isValid ? 'Provenance chain is valid' : 'Provenance chain validation failed'
      },
      {
        name: 'Author Verification',
        passed: result.authorVerified,
        message: result.authorVerified ? 'Author NFT ownership verified' : 'Author verification failed'
      },
      {
        name: 'Auditor Verification',
        passed: result.auditorCount > 0,
        message: `${result.auditorCount} auditor(s) verified`,
        details: result.auditorCount > 0 ? 'Community reviewed' : 'No external audit'
      }
    ];

    return {
      valid: result.isValid,
      type: 'provenance',
      checks
    };
  } catch (error: any) {
    // Fallback to mock verification if services are not available
    const checks: VerificationCheck[] = [
      {
        name: 'Chain Exists',
        passed: await hasProvenanceChain(skillHash),
        message: 'Provenance chain found (mock)'
      },
      {
        name: 'Signature Validity',
        passed: await verifyChainSignatures(skillHash),
        message: 'All signatures in chain are valid (mock)'
      },
      {
        name: 'Author Verification',
        passed: await verifyChainAuthor(skillHash),
        message: 'Author NFT ownership verified (mock)'
      },
      {
        name: 'Service Status',
        passed: false,
        message: 'Core services unavailable - using fallback verification'
      }
    ];

    return {
      valid: checks.every(check => check.passed),
      type: 'provenance',
      checks
    };
  }
}

function isValidHash(hash: string): boolean {
  return hash.length === 64 && /^[a-fA-F0-9]+$/.test(hash);
}

function isValidAddress(address: string): boolean {
  return address.startsWith('0x') && address.length === 42;
}

async function validateHashFormat(hash: string): Promise<boolean> {
  // Would validate SHA-256 hash format
  return hash.length === 64 && /^[a-fA-F0-9]+$/.test(hash);
}

async function checkCommunitySafety(skillHash: string): Promise<boolean> {
  // This would integrate with AuditRegistry
  // For now, assume not malicious
  return true;
}

async function getTrustScore(skillHash: string): Promise<number> {
  // This would integrate with IsnadService
  // For now, return default score
  return 0.75;
}

async function checkManifestIntegrity(skillHash: string): Promise<boolean> {
  // This would verify manifest signature
  // For now, assume valid
  return true;
}

async function checkPermissionsCompliance(skillHash: string): Promise<boolean> {
  // This would check if permissions match security policies
  // For now, assume compliant
  return true;
}

async function checkPublisherNFT(walletAddress: string): Promise<boolean> {
  // This would integrate with IsnadService to check NFT ownership
  // For now, simulate ownership check
  return true;
}

async function getAuthorSkillCount(walletAddress: string): Promise<number> {
  // This would count skills published by author
  // For now, return mock count
  return 3;
}

async function getAuthorReputation(walletAddress: string): Promise<number> {
  // This would calculate author reputation from audits
  // For now, return mock reputation
  return 0.85;
}

async function hasProvenanceChain(skillHash: string): Promise<boolean> {
  // This would check if provenance chain exists
  // For now, assume it exists
  return true;
}

async function verifyChainSignatures(skillHash: string): Promise<boolean> {
  // This would verify all signatures in the chain
  // For now, assume all valid
  return true;
}

async function verifyChainAuthor(skillHash: string): Promise<boolean> {
  // This would verify author NFT ownership
  // For now, assume verified
  return true;
}

async function verifyChainAuditors(skillHash: string): Promise<number> {
  // This would count verified auditors in chain
  // For now, return mock count
  return 2;
}

async function calculateChainTrustScore(skillHash: string): Promise<number> {
  // This would calculate trust score from chain
  // For now, return mock score
  return 0.78;
}

function displayVerificationResults(result: VerificationResult) {
  console.log(chalk.blue(`\n📋 Verification Results (${result.type}):`));
  console.log(chalk.gray('─'.repeat(50)));

  result.checks.forEach((check, index) => {
    const status = check.passed ? '✅' : '❌';
    const statusColor = check.passed ? chalk.green : chalk.red;
    
    console.log(chalk.bold(`\n${status} ${check.name}`));
    console.log(chalk.gray(`   ${check.message}`));
    if (check.details) {
      console.log(chalk.gray(`   ${check.details}`));
    }
  });

  const overallStatus = result.valid ? chalk.green('✅ PASSED') : chalk.red('❌ FAILED');
  console.log(chalk.bold(`\n\nOverall: ${overallStatus}`));
  console.log(chalk.gray('\n' + '═'.repeat(50)));
}