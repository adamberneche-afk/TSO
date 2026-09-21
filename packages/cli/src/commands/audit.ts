import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { AuditReport, YARAFinding } from '@think/types';
import { TaisServiceManager } from '../services/TaisServiceManager';
import { RegistryClient } from '../services/RegistryClient';
import { loadSigningWallet } from '../utils/wallet';

/** Everything about an audit report except the signature -- computed
 * first so its exact serialized form can be signed. */
type UnsignedAuditReport = Omit<AuditReport, 'signature'>;

function signAuditReport(unsigned: UnsignedAuditReport, wallet: ethers.Wallet): AuditReport {
  const payload = `${unsigned.skill_hash}:${unsigned.auditor}:${unsigned.status}:${JSON.stringify(unsigned.findings)}:${unsigned.timestamp}`;
  return { ...unsigned, signature: wallet.signMessageSync(payload) };
}

export async function auditCommand(skill: string, options: any) {
  const spinner = ora();

  try {
    console.log(chalk.blue.bold('🔍 TAIS Skill Security Auditor'));
    console.log(chalk.gray('═'.repeat(50)));

    // The wallet that will sign (and be attributed as the auditor for)
    // this report. Loaded up front so a missing/invalid key fails fast,
    // before the user spends time on an interactive audit they can't
    // submit.
    const wallet = loadSigningWallet();

    // Step 1: Load skill information
    spinner.start('Loading skill information...');
    const { skillHash, skillName, manifest } = await loadSkillInfo(skill);
    spinner.succeed('Skill information loaded');

    // Step 2: Load or create audit report
    let unsignedReport: UnsignedAuditReport;

    if (options.report) {
      spinner.start('Loading YARA report...');
      unsignedReport = await loadYARAReport(options.report, skillHash, wallet.address);
      spinner.succeed('YARA report loaded');
    } else {
      spinner.start('Creating interactive audit...');
      unsignedReport = await createInteractiveAudit(skillHash, wallet.address);
      spinner.succeed('Interactive audit completed');
    }

    const auditReport = signAuditReport(unsignedReport, wallet);

    // Step 3: Display audit summary
    displayAuditSummary(skillName, skillHash, auditReport);

    // Step 4: Confirmation
    if (!options.yes) {
      const { confirmed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirmed',
        message: 'Submit this audit to the community registry?',
        default: false
      }]);

      if (!confirmed) {
        console.log(chalk.yellow('Audit cancelled.'));
        process.exit(0);
      }
    }

    // Step 5: Submit audit
    spinner.start('Submitting audit to community...');
    const result = await submitAudit(auditReport, wallet);

    if (result.success) {
      spinner.succeed('✅ Audit submitted successfully');
      console.log(chalk.green(`🎯 ${skillName} audit is now part of the community record.`));

      displayAuditSubmissionResult(auditReport, result);
    } else {
      spinner.fail('Audit submission failed');
      console.error(chalk.red('Error:'), result.error);
      if (result.localOnly) {
        console.log(chalk.yellow('   (A local record was still saved and will count toward on-device checks.)'));
      }
      process.exit(1);
    }

  } catch (error: any) {
    spinner.fail('Audit failed');
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

async function loadSkillInfo(skill: string): Promise<{ skillHash: string; skillName: string; manifest: any }> {
  // If it's a hash, use it directly
  if (skill.length === 64 && /^[a-fA-F0-9]+$/.test(skill)) {
    return {
      skillHash: skill,
      skillName: `Hash: ${skill.substring(0, 16)}...`,
      manifest: null
    };
  }

  // Try to load as local directory
  if (fs.existsSync(skill)) {
    const manifestPath = path.join(skill, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);
      return {
        skillHash: manifest.skill_hash,
        skillName: manifest.name,
        manifest
      };
    }
  }

  throw new Error(`Skill not found: ${skill}`);
}

async function loadYARAReport(reportPath: string, skillHash: string, auditorWallet: string): Promise<UnsignedAuditReport> {
  if (!fs.existsSync(reportPath)) {
    throw new Error(`YARA report not found: ${reportPath}`);
  }

  const reportContent = fs.readFileSync(reportPath, 'utf8');
  const reportData = JSON.parse(reportContent);

  return {
    skill_hash: skillHash,
    auditor: auditorWallet.toLowerCase(),
    status: reportData.status || 'safe',
    findings: reportData.findings || [],
    timestamp: new Date().toISOString(),
    audit_method: 'yara_scan',
  };
}

async function createInteractiveAudit(skillHash: string, auditorWallet: string): Promise<UnsignedAuditReport> {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'status',
      message: 'What is your audit assessment?',
      choices: [
        { name: '✅ Safe - No security issues found', value: 'safe' },
        { name: '⚠️  Suspicious - Some concerning patterns', value: 'suspicious' },
        { name: '❌ Malicious - Clear security threats', value: 'malicious' }
      ]
    },
    {
      type: 'confirm',
      name: 'addFindings',
      message: 'Do you have specific security findings to report?',
      default: false
    }
  ]);

  let findings: YARAFinding[] = [];

  if (answers.addFindings) {
    findings = await collectFindings();
  }

  return {
    skill_hash: skillHash,
    auditor: auditorWallet.toLowerCase(),
    status: answers.status,
    findings,
    timestamp: new Date().toISOString(),
    audit_method: 'manual_review',
  };
}

async function collectFindings(): Promise<YARAFinding[]> {
  const findings: YARAFinding[] = [];
  let addMore = true;

  while (addMore) {
    const finding = await inquirer.prompt([
      {
        type: 'input',
        name: 'rule_name',
        message: 'Finding rule name:',
        validate: (input: string) => input.length > 0 || 'Rule name is required'
      },
      {
        type: 'input',
        name: 'description',
        message: 'Detailed description:',
        validate: (input: string) => input.length > 0 || 'Description is required'
      },
      {
        type: 'list',
        name: 'severity',
        message: 'Severity level:',
        choices: ['low', 'medium', 'high', 'critical']
      },
      {
        type: 'input',
        name: 'evidence',
        message: 'Evidence (code snippet, file path, etc.):',
        validate: (input: string) => input.length > 0 || 'Evidence is required'
      }
    ]);

    findings.push({
      rule_name: finding.rule_name,
      description: finding.description,
      severity: finding.severity,
      evidence: finding.evidence
    });

    const { addMore: shouldAddMore } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addMore',
        message: 'Add another finding?',
        default: false
      }
    ]);

    addMore = shouldAddMore;
  }

  return findings;
}

function displayAuditSummary(skillName: string, skillHash: string, auditReport: AuditReport) {
  console.log(chalk.blue('\n📋 Audit Summary:'));
  console.log(`   Skill: ${chalk.bold(skillName)}`);
  console.log(`   Hash: ${chalk.gray(skillHash.substring(0, 16))}...`);
  console.log(`   Status: ${getStatusColor(auditReport.status)(auditReport.status.toUpperCase())}`);
  console.log(`   Findings: ${auditReport.findings.length}`);

  if (auditReport.findings.length > 0) {
    console.log(chalk.blue('\n🔍 Security Findings:'));
    auditReport.findings.forEach((finding, index) => {
      const severityColor = getSeverityColor(finding.severity);
      console.log(`\n   ${index + 1}. ${chalk.bold(finding.rule_name)}`);
      console.log(`      Severity: ${severityColor(finding.severity.toUpperCase())}`);
      console.log(`      Description: ${finding.description}`);
      console.log(`      Evidence: ${finding.evidence}`);
    });
  }

  console.log(chalk.gray('\n' + '─'.repeat(50)));
}

function getStatusColor(status: string) {
  switch (status) {
    case 'safe': return chalk.green;
    case 'suspicious': return chalk.yellow;
    case 'malicious': return chalk.red;
    default: return chalk.gray;
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'info': return chalk.blue;
    case 'low': return chalk.green;
    case 'medium': return chalk.yellow;
    case 'high': return chalk.redBright;
    case 'critical': return chalk.red;
    default: return chalk.gray;
  }
}

interface AuditSubmissionOutcome {
  success: boolean;
  auditId?: string;
  trustScore?: number;
  isBlocked?: boolean;
  error?: string;
  /** Set when the local on-device record was saved but the real
   * community registry could not be reached/did not accept it -- so the
   * caller can tell the user their audit did NOT actually become part
   * of the community record, only of their own local cache. */
  localOnly?: boolean;
}

async function submitAudit(auditReport: AuditReport, wallet: ethers.Wallet): Promise<AuditSubmissionOutcome> {
  console.log(chalk.blue('📝 Submitting audit to community registry...'));
  console.log(`   Auditor: ${auditReport.auditor}`);
  console.log(`   Skill: ${auditReport.skill_hash.substring(0, 16)}...`);
  console.log(`   Status: ${auditReport.status}`);
  console.log(`   Findings: ${auditReport.findings.length}`);

  // Always keep a local record too: it's what powers offline
  // `checkMalicious`/`list` checks on this device, independent of
  // whether the network round trip below succeeds.
  const serviceManager = new TaisServiceManager();
  const localResult = await serviceManager.submitAudit(auditReport).catch((error: any) => ({
    success: false,
    error: error?.message ?? String(error),
  }));

  // The real "community registry" this message has always claimed is
  // the remote server -- previously nothing here ever called it (see
  // docs/DOCS_VS_CODEBASE.md row 9), so "part of the community record"
  // was true only of this device's own local cache.
  try {
    const registryClient = new RegistryClient();
    const token = await registryClient.loginWithWallet(wallet);
    const remoteResult = await registryClient.submitAudit(auditReport, token);

    if (!remoteResult.success) {
      return { ...remoteResult, localOnly: localResult.success };
    }
    return remoteResult;
  } catch (error: any) {
    return {
      success: false,
      error: `Could not reach the community registry: ${error.message}`,
      localOnly: localResult.success,
    };
  }
}

function displayAuditSubmissionResult(auditReport: AuditReport, result: AuditSubmissionOutcome) {
  console.log(chalk.green('\n✅ Audit Submission Summary:'));
  console.log(`   🆔 Audit ID: ${result.auditId}`);
  console.log(`   📊 Status: ${getStatusColor(auditReport.status)(auditReport.status)}`);
  if (typeof result.trustScore === 'number') {
    console.log(`   🌐 Skill Trust Score: ${(result.trustScore * 100).toFixed(1)}%${result.isBlocked ? chalk.red(' (BLOCKED)') : ''}`);
  }
  console.log(`   🔗 View Audit: ${chalk.bold('tais verify ' + auditReport.skill_hash)}`);
  console.log(`   🛡️  Check Safety: ${chalk.bold('tais check-malicious ' + auditReport.skill_hash)}`);
  console.log(chalk.gray('\n' + '═'.repeat(50)));
}