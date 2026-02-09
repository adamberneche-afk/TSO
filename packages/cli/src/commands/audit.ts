import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { TaisServiceManager } from '../services/TaisServiceManager';

interface YARAFinding {
  rule_name: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  evidence: string;
  tags: string[];
}

interface AuditReport {
  skill_hash: string;
  auditor_wallet: string;
  status: 'safe' | 'suspicious' | 'malicious';
  findings: YARAFinding[];
  timestamp: string;
  signature: string;
}

export async function auditCommand(skill: string, options: any) {
  const spinner = ora();
  
  try {
    console.log(chalk.blue.bold('🔍 TAIS Skill Security Auditor'));
    console.log(chalk.gray('═'.repeat(50)));

    // Step 1: Load skill information
    spinner.start('Loading skill information...');
    const { skillHash, skillName, manifest } = await loadSkillInfo(skill);
    spinner.succeed('Skill information loaded');

    // Step 2: Load or create audit report
    let auditReport: AuditReport;
    
    if (options.report) {
      spinner.start('Loading YARA report...');
      auditReport = await loadYARAReport(options.report, skillHash);
      spinner.succeed('YARA report loaded');
    } else {
      spinner.start('Creating interactive audit...');
      auditReport = await createInteractiveAudit(skillHash);
      spinner.succeed('Interactive audit completed');
    }

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
    const result = await submitAudit(auditReport);
    
    if (result.success) {
      spinner.succeed('✅ Audit submitted successfully');
      console.log(chalk.green(`🎯 ${skillName} audit is now part of the community record.`));
      
      displayAuditSubmissionResult(auditReport, result);
    } else {
      spinner.fail('Audit submission failed');
      console.error(chalk.red('Error:'), result.error);
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

async function loadYARAReport(reportPath: string, skillHash: string): Promise<AuditReport> {
  if (!fs.existsSync(reportPath)) {
    throw new Error(`YARA report not found: ${reportPath}`);
  }

  const reportContent = fs.readFileSync(reportPath, 'utf8');
  const reportData = JSON.parse(reportContent);

  return {
    skill_hash: skillHash,
    auditor_wallet: '0x0000000000000000000000000000000000000000', // Would get from config
    status: reportData.status || 'safe',
    findings: reportData.findings || [],
    timestamp: new Date().toISOString(),
    signature: '0x0000000000000000000000000000000000000000000000000000000000000000' // Would sign
  };
}

async function createInteractiveAudit(skillHash: string): Promise<AuditReport> {
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
    auditor_wallet: '0x0000000000000000000000000000000000000000', // Would get from config
    status: answers.status,
    findings,
    timestamp: new Date().toISOString(),
    signature: '0x0000000000000000000000000000000000000000000000000000000000000000' // Would sign
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
        choices: ['info', 'low', 'medium', 'high', 'critical']
      },
      {
        type: 'input',
        name: 'evidence',
        message: 'Evidence (code snippet, file path, etc.):',
        validate: (input: string) => input.length > 0 || 'Evidence is required'
      },
      {
        type: 'input',
        name: 'tags',
        message: 'Tags (comma-separated):'
      }
    ]);

    findings.push({
      rule_name: finding.rule_name,
      description: finding.description,
      severity: finding.severity,
      evidence: finding.evidence,
      tags: finding.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
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
      if (finding.tags.length > 0) {
        console.log(`      Tags: ${finding.tags.join(', ')}`);
      }
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

async function submitAudit(auditReport: AuditReport) {
  // This would integrate with the AuditRegistry service
  // For now, simulate successful submission
  console.log(chalk.blue('📝 Submitting audit to community registry...'));
  console.log(`   Auditor: ${auditReport.auditor_wallet}`);
  console.log(`   Skill: ${auditReport.skill_hash.substring(0, 16)}...`);
  console.log(`   Status: ${auditReport.status}`);
  console.log(`   Findings: ${auditReport.findings.length}`);
  
  return { success: true, auditId: `audit_${Date.now()}`, error: undefined };
}

function displayAuditSubmissionResult(auditReport: AuditReport, result: any) {
  console.log(chalk.green('\n✅ Audit Submission Summary:'));
  console.log(`   🆔 Audit ID: ${result.auditId}`);
  console.log(`   📊 Status: ${getStatusColor(auditReport.status)(auditReport.status)}`);
  console.log(`   🔗 View Audit: ${chalk.bold('tais verify ' + auditReport.skill_hash)}`);
  console.log(`   🛡️  Check Safety: ${chalk.bold('tais check-malicious ' + auditReport.skill_hash)}`);
  console.log(chalk.gray('\n' + '═'.repeat(50)));
}