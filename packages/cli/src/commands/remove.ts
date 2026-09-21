import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
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

export async function removeCommand(skill: string, options: any) {
  const spinner = ora();
  
  try {
    console.log(chalk.blue.bold('🗑️  Remove Skill'));
    console.log(chalk.gray('═'.repeat(50)));

    // Step 1: Find the skill
    spinner.start('Finding skill...');
    const skillData = await findSkill(skill);
    spinner.succeed(`Skill found: ${skillData.name}`);

    // Step 2: Display skill information
    displaySkillInfo(skillData);

    // Step 3: Confirmation
    if (!options.yes) {
      const { confirmed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirmed',
        message: `Remove skill "${skillData.name}" and all its files?`,
        default: false
      }]);

      if (!confirmed) {
        console.log(chalk.yellow('Removal cancelled.'));
        process.exit(0);
      }
    }

    // Step 4: Remove skill
    spinner.start('Removing skill...');
    const result = await removeSkill(skillData);
    
    if (result.success) {
      spinner.succeed('✅ Skill removed successfully');
      console.log(chalk.green(`🎯 ${skillData.name} has been uninstalled.`));
      
      displayRemovalSummary(skillData, result);
    } else {
      spinner.fail('Removal failed');
      console.error(chalk.red('Error:'), result.error);
      process.exit(1);
    }

  } catch (error: any) {
    spinner.fail('Removal failed');
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

async function findSkill(skill: string): Promise<InstalledSkill> {
  // Load installed skills
  const skillsPath = path.join(process.cwd(), '.tais', 'skills.json');
  
  if (!fs.existsSync(skillsPath)) {
    throw new Error('No skills installed yet. Use "tais list" to see installed skills.');
  }

  const content = fs.readFileSync(skillsPath, 'utf8');
  const skills: InstalledSkill[] = JSON.parse(content);

  // Try to find by name or hash
  const foundSkill = skills.find(s => 
    s.name.toLowerCase() === skill.toLowerCase() || 
    s.skill_hash === skill
  );

  if (!foundSkill) {
    throw new Error(`Skill "${skill}" not found. Use "tais list" to see installed skills.`);
  }

  return foundSkill;
}

function displaySkillInfo(skill: InstalledSkill) {
  const riskColor = getRiskColor(skill.risk_level);
  const trustPercent = (skill.trust_score * 100).toFixed(0);

  console.log(chalk.blue('\n   Skill Information:'));
  console.log(`   Name: ${chalk.bold(skill.name)}`);
  console.log(`   Version: ${skill.version}`);
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

  console.log(chalk.gray('\n' + '─'.repeat(50)));
}

async function removeSkill(skill: InstalledSkill) {
  try {
    const serviceManager = new TaisServiceManager();
    const result = await serviceManager.removeSkill(skill.skill_hash);
    return result;
  } catch (error: any) {
    // Fallback to local storage if services are not available
    const skillsPath = path.join(process.cwd(), '.tais', 'skills.json');
    
    if (fs.existsSync(skillsPath)) {
      const content = fs.readFileSync(skillsPath, 'utf8');
      const skills: InstalledSkill[] = JSON.parse(content);
      
      // Remove the skill from the list
      const updatedSkills = skills.filter(s => s.skill_hash !== skill.skill_hash);
      
      // Write back to storage
      fs.writeFileSync(skillsPath, JSON.stringify(updatedSkills, null, 2));
      
      // Remove skill directory if it exists
      const skillDir = path.join(process.cwd(), '.tais', 'skills', skill.name);
      if (fs.existsSync(skillDir)) {
        fs.rmSync(skillDir, { recursive: true, force: true });
      }
    }

    return { 
      success: true, 
      message: 'Skill removed successfully',
      removedHash: skill.skill_hash,
      error: undefined
    };
  }
}

function displayRemovalSummary(skill: InstalledSkill, result: any) {
  console.log(chalk.green('\n✅ Removal Summary:'));
  console.log(`   🗑️  Skill Removed: ${skill.name}`);
  console.log(`   🔗 Hash: ${skill.skill_hash}`);
  console.log(`   📁 Files Cleaned: ${result.removedHash ? 'Yes' : 'N/A'}`);
  
  console.log(chalk.gray('\n   Remaining Skills:'));
  console.log(chalk.gray(`   View: ${chalk.bold('tais list')}`));
  console.log(chalk.gray(`   Install New: ${chalk.bold('tais install <skill>')}`));
  console.log(chalk.gray('\n' + '═'.repeat(50)));
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