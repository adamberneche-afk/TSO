import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { TaisServiceManager } from '../services/TaisServiceManager';

interface InstalledSkill {
  name: string;
  version: string;
  author: string;
  skill_hash: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  trust_score: number;
  installed_at: string;
  permissions: {
    network?: { domains: string[] };
    filesystem?: { read: string[]; write: string[] };
    env_vars?: string[];
    modules?: string[];
  };
}

export async function listCommand(options: any) {
  const spinner = ora();
  
  try {
    console.log(chalk.blue.bold('📋 Installed Skills'));
    console.log(chalk.gray('═'.repeat(50)));

    // Step 1: Load installed skills
    spinner.start('Loading installed skills...');
    const skills = await getInstalledSkills();
    spinner.succeed(`Found ${skills.length} installed skill(s)`);

    // Step 2: Display based on options
    if (options.risk) {
      displayRiskOnly(skills);
    } else if (options.verbose) {
      displayVerbose(skills);
    } else {
      displayBasic(skills);
    }

    // Step 3: Show summary
    displaySummary(skills);

  } catch (error: any) {
    spinner.fail('Failed to list skills');
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

async function getInstalledSkills(): Promise<InstalledSkill[]> {
  try {
    const serviceManager = new TaisServiceManager();
    const skills = await serviceManager.listInstalledSkills();
    return skills;
  } catch (error: any) {
    // Fallback to local storage if services are not available
    const skillsPath = path.join(process.cwd(), '.tais', 'skills.json');
    
    if (fs.existsSync(skillsPath)) {
      const content = fs.readFileSync(skillsPath, 'utf8');
      return JSON.parse(content);
    }

    // Return empty array if no skills file exists
    return [];
  }
}

function displayBasic(skills: InstalledSkill[]) {
  if (skills.length === 0) {
    console.log(chalk.yellow('\n   No skills installed yet.'));
    console.log(chalk.gray('   Install a skill with: tais install <skill-path>'));
    return;
  }

  console.log(chalk.blue('\n   Skills:'));
  
  skills.forEach((skill, index) => {
    const riskColor = getRiskColor(skill.risk_level);
    const trustPercent = (skill.trust_score * 100).toFixed(0);
    
    console.log(chalk.gray(`\n   ${index + 1}. ${chalk.bold(skill.name)} v${skill.version}`));
    console.log(`      Author: ${skill.author.substring(0, 10)}...`);
    console.log(`      Risk: ${riskColor(skill.risk_level.toUpperCase())} | Trust: ${trustPercent}%`);
    console.log(`      Hash: ${skill.skill_hash.substring(0, 16)}...`);
  });
}

function displayVerbose(skills: InstalledSkill[]) {
  if (skills.length === 0) {
    console.log(chalk.yellow('\n   No skills installed yet.'));
    console.log(chalk.gray('   Install a skill with: tais install <skill-path>'));
    return;
  }

  skills.forEach((skill, index) => {
    const riskColor = getRiskColor(skill.risk_level);
    const trustPercent = (skill.trust_score * 100).toFixed(0);
    
    console.log(chalk.blue(`\n   ${index + 1}. ${chalk.bold(skill.name)} v${skill.version}`));
    console.log(`   ${chalk.gray('─'.repeat(40))}`);
    console.log(`   Author: ${skill.author}`);
    console.log(`   Hash: ${skill.skill_hash}`);
    console.log(`   Risk Level: ${riskColor(skill.risk_level.toUpperCase())}`);
    console.log(`   Trust Score: ${trustPercent}%`);
    console.log(`   Installed: ${new Date(skill.installed_at).toLocaleDateString()}`);
    
    console.log(chalk.blue('\n   Permissions:'));
    
    if (skill.permissions.network && skill.permissions.network.domains.length > 0) {
      console.log(`   🌐 Network: ${skill.permissions.network.domains.join(', ')}`);
    }
    
    if (skill.permissions.filesystem) {
      console.log(`   📁 Read: ${skill.permissions.filesystem.read.join(', ') || 'None'}`);
      console.log(`   ✏️  Write: ${skill.permissions.filesystem.write.join(', ') || 'None'}`);
    }
    
    if (skill.permissions.env_vars && skill.permissions.env_vars.length > 0) {
      console.log(`   🔧 Env Vars: ${skill.permissions.env_vars.join(', ')}`);
    }
    
    if (skill.permissions.modules && skill.permissions.modules.length > 0) {
      console.log(`   📦 Modules: ${skill.permissions.modules.join(', ')}`);
    }
    
    console.log(chalk.gray('\n   ' + '═'.repeat(40)));
  });
}

function displayRiskOnly(skills: InstalledSkill[]) {
  if (skills.length === 0) {
    console.log(chalk.yellow('\n   No skills installed yet.'));
    return;
  }

  console.log(chalk.blue('\n   Risk Assessment:'));
  console.log(chalk.gray('   ' + '─'.repeat(40)));
  
  const riskLevels = ['critical', 'high', 'medium', 'low'] as const;
  
  riskLevels.forEach(level => {
    const skillsAtLevel = skills.filter(s => s.risk_level === level);
    
    if (skillsAtLevel.length > 0) {
      const riskColor = getRiskColor(level);
      console.log(chalk.bold(`\n   ${riskColor(level.toUpperCase())} (${skillsAtLevel.length}):`));
      
      skillsAtLevel.forEach(skill => {
        const trustPercent = (skill.trust_score * 100).toFixed(0);
        console.log(`      • ${skill.name} - Trust: ${trustPercent}%`);
      });
    }
  });
  
  console.log(chalk.gray('\n   ' + '═'.repeat(40)));
}

function displaySummary(skills: InstalledSkill[]) {
  if (skills.length === 0) return;

  const criticalSkills = skills.filter(s => s.risk_level === 'critical').length;
  const highSkills = skills.filter(s => s.risk_level === 'high').length;
  const mediumSkills = skills.filter(s => s.risk_level === 'medium').length;
  const lowSkills = skills.filter(s => s.risk_level === 'low').length;
  
  const avgTrust = skills.reduce((sum, s) => sum + s.trust_score, 0) / skills.length;
  
  console.log(chalk.blue('\n   Summary:'));
  console.log(chalk.red(`      🚨 Critical: ${criticalSkills}`));
  console.log(chalk.redBright(`      ⚠️  High: ${highSkills}`));
  console.log(chalk.yellow(`      ⚠️  Medium: ${mediumSkills}`));
  console.log(chalk.green(`      ✅ Low: ${lowSkills}`));
  console.log(chalk.blue(`      📊 Avg Trust: ${(avgTrust * 100).toFixed(1)}%`));
  
  console.log(chalk.gray('\n   ' + '═'.repeat(50)));
  console.log(chalk.gray(`   Manage skills: ${chalk.bold('tais remove <skill>')}`));
  console.log(chalk.gray(`   Verify security: ${chalk.bold('tais verify <skill>')}`));
  console.log(chalk.gray(`   Submit audit: ${chalk.bold('tais audit <skill>')}`));
}

function getRiskColor(risk: string) {
  switch (risk) {
    case 'low': return chalk.green;
    case 'medium': return chalk.yellow;
    case 'high': return chalk.redBright;
    case 'critical': return chalk.red;
    default: return chalk.gray;
  }
}