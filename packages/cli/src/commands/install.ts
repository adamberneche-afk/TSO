import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { SkillManifest } from '@think/types';
import { TaisServiceManager } from '../services/TaisServiceManager';

export async function installCommand(skill: string, options: any) {
  const spinner = ora();
  const serviceManager = new TaisServiceManager();
  
  try {
    console.log(chalk.blue.bold('🔍 TAIS Skill Security Installer'));
    console.log(chalk.gray('═'.repeat(50)));

    // Step 1: Load and analyze skill using real services
    spinner.start('Loading and analyzing skill...');
    const analysisResult = await serviceManager.installSkill(skill);
    spinner.succeed('Skill analysis complete');

    // Step 2: Display risk assessment
    displayRiskAssessment(analysisResult.manifest, analysisResult.analysis);

    // Step 3: Check for malicious status
    if (analysisResult.isBlocked) {
      spinner.fail('❌ SKILL BLOCKED BY COMMUNITY');
      console.error(chalk.red('This skill has been flagged as malicious by community.'));
      process.exit(1);
    }
    spinner.succeed('✅ Skill is safe according to community');

    // Step 4: Trust score verification
    spinner.succeed(`Trust score: ${(analysisResult.trustScore * 100).toFixed(1)}%`);

    // Step 6: User confirmation
    if (!options.yes && !options.force) {
      const { confirmed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirmed',
        message: 'Install this skill?',
        default: false
      }]);

      if (!confirmed) {
        console.log(chalk.yellow('Installation cancelled.'));
        process.exit(0);
      }
    }

    // Step 5: User confirmation
    if (!options.yes && !options.force) {
      const { confirmed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirmed',
        message: 'Install this skill?',
        default: false
      }]);

      if (!confirmed) {
        console.log(chalk.yellow('Installation cancelled.'));
        process.exit(0);
      }
    }

    // Step 6: Install skill
    spinner.start('Installing skill...');
    const result = await serviceManager.completeInstallation(skill, analysisResult.manifest);
    
    if (result.success) {
      spinner.succeed('✅ Skill installed successfully');
      console.log(chalk.green(`🎯 ${analysisResult.manifest.name} v${analysisResult.manifest.version} is now ready to use.`));
      
      // Display installation summary
      displayInstallationSummary(analysisResult.manifest, analysisResult.trustScore, skill);
    } else {
      spinner.fail('Installation failed');
      console.error(chalk.red('Error:'), result.error);
      process.exit(1);
    }

  } catch (error: any) {
    spinner.fail('Installation failed');
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

async function loadSkill(skill: string): Promise<{ manifest: SkillManifest; code: string; source: string }> {
  let source: string;
  let manifestPath: string;
  let codePath: string;

  if (skill.startsWith('http')) {
    // Remote skill
    source = skill;
    const response = await fetch(skill);
    if (!response.ok) {
      throw new Error(`Failed to fetch skill from ${skill}`);
    }
    
    // For now, assume it's a GitHub URL with manifest.json
    // In production, this would integrate with the skill registry
    throw new Error('Remote skill installation not yet implemented. Use local path.');
    
  } else if (fs.existsSync(skill)) {
    // Local skill directory
    source = path.resolve(skill);
    manifestPath = path.join(source, 'manifest.json');
    codePath = path.join(source, 'index.js');
    
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest not found: ${manifestPath}`);
    }
    if (!fs.existsSync(codePath)) {
      throw new Error(`Skill code not found: ${codePath}`);
    }
  } else {
    throw new Error(`Skill not found: ${skill}`);
  }

  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  const code = fs.readFileSync(codePath, 'utf8');
  
  try {
    const manifest = JSON.parse(manifestContent);
    return { manifest, code, source };
  } catch (error) {
    throw new Error(`Invalid manifest format: ${error}`);
  }
}

// Display functions for UI

function displayRiskAssessment(manifest: SkillManifest, analysis: any) {
  console.log(chalk.blue('\n📋 Skill Information:'));
  console.log(`   Name: ${chalk.bold(manifest.name)}`);
  console.log(`   Version: ${manifest.version}`);
  console.log(`   Author: ${manifest.author}`);
  console.log(`   Hash: ${chalk.gray(manifest.skill_hash.substring(0, 16))}...`);

  console.log(chalk.blue('\n🛡️  Security Assessment:'));
  
  const riskColor: any = {
    low: chalk.green,
    medium: chalk.yellow,
    high: chalk.redBright,
    critical: chalk.red
  };

  console.log(`   Risk Level: ${riskColor[analysis.riskLevel](analysis.riskLevel.toUpperCase())}`);
  
  if (analysis.risks.length > 0) {
    console.log(chalk.yellow('\n⚠️  Warnings:'));
    analysis.risks.forEach((risk: string) => {
      console.log(`   ${risk}`);
    });
  }

  console.log(chalk.blue('\n📄 Requested Permissions:'));
  
  if (manifest.permissions.network) {
    console.log(`   🌐 Network: ${manifest.permissions.network.domains.join(', ') || 'None'}`);
  }
  
  if (manifest.permissions.filesystem) {
    console.log(`   📁 Read: ${manifest.permissions.filesystem.read?.join(', ') || 'None'}`);
    console.log(`   ✏️  Write: ${manifest.permissions.filesystem.write?.join(', ') || 'None'}`);
  }
  
  console.log(`   🔧 Env Vars: ${manifest.permissions.env_vars?.join(', ') || 'None'}`);
  console.log(`   📦 Modules: ${manifest.permissions.modules?.join(', ') || 'None'}`);

  console.log(chalk.gray('\n' + '─'.repeat(50)));
}

async function checkMaliciousStatus(skillHash: string): Promise<boolean> {
  // This would integrate with the AuditRegistry service
  // For now, return false (not malicious)
  return false;
}

// Remove old mocked functions - now using real services

function displayInstallationSummary(manifest: SkillManifest, trustScore: number, source: string) {
  console.log(chalk.green('\n✅ Installation Summary:'));
  console.log(`   📍 Location: ${source}`);
  console.log(`   🛡️  Trust Score: ${(trustScore * 100).toFixed(1)}%`);
  console.log(`   🔗 Installed Skills: ${chalk.bold('tais list')}`);
  console.log(`   🔍 Verify Security: ${chalk.bold(`tais verify ${manifest.skill_hash}`)}`);
  console.log(chalk.gray('\n' + '═'.repeat(50)));
}