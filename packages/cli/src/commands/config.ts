import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';

interface TaisConfig {
  default_wallet?: string;
  registry_url?: string;
  network?: string;
  auto_approve_low_risk?: boolean;
  max_risk_level?: string;
  audit_mode?: boolean;
}

const CONFIG_PATH = path.join(process.cwd(), '.tais', 'config.json');

export async function configCommand(options: any) {
  try {
    console.log(chalk.blue.bold('⚙️  TAIS Configuration'));
    console.log(chalk.gray('═'.repeat(50)));

    if (options.list) {
      displayConfig();
      return;
    }

    if (options.get) {
      getConfigValue(options.get);
      return;
    }

    if (options.set) {
      setConfigValue(options.set);
      return;
    }

    // Interactive configuration
    await interactiveConfig();

  } catch (error: any) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

function loadConfig(): TaisConfig {
  if (fs.existsSync(CONFIG_PATH)) {
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(content);
  }
  return {};
}

function saveConfig(config: TaisConfig) {
  const configDir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function displayConfig() {
  const config = loadConfig();
  
  console.log(chalk.blue('\n📋 Current Configuration:'));
  console.log(chalk.gray('─'.repeat(40)));

  if (Object.keys(config).length === 0) {
    console.log(chalk.yellow('   No configuration set.'));
    console.log(chalk.gray('   Use "tais config --set key=value" to set values.'));
    return;
  }

  Object.entries(config).forEach(([key, value]) => {
    const displayValue = typeof value === 'boolean' ? (value ? '✅ Yes' : '❌ No') : value;
    console.log(`   ${chalk.bold(key)}: ${displayValue}`);
  });

  console.log(chalk.gray('\n' + '═'.repeat(40)));
  console.log(chalk.gray('   Set values: tais config --set <key=value>'));
  console.log(chalk.gray('   Get value:  tais config --get <key>'));
}

function getConfigValue(key: string) {
  const config = loadConfig();
  const value = config[key as keyof TaisConfig];

  if (value === undefined) {
    console.log(chalk.yellow(`   Configuration key "${key}" not found.`));
    console.log(chalk.gray('   Available keys: default_wallet, registry_url, network, auto_approve_low_risk, max_risk_level, audit_mode'));
    return;
  }

  const displayValue = typeof value === 'boolean' ? (value ? '✅ Yes' : '❌ No') : value;
  console.log(chalk.blue(`   ${chalk.bold(key)}: ${displayValue}`));
}

function setConfigValue(setValue: string) {
  const [key, value] = setValue.split('=');
  
  if (!key || value === undefined) {
    console.error(chalk.red('❌ Invalid format. Use: --set key=value'));
    process.exit(1);
  }

  const config = loadConfig();
  const parsedValue = parseConfigValue(key, value);
  
  config[key as keyof TaisConfig] = parsedValue;
  saveConfig(config);

  const displayValue = typeof parsedValue === 'boolean' ? (parsedValue ? '✅ Yes' : '❌ No') : parsedValue;
  console.log(chalk.green(`✅ Set ${chalk.bold(key)}: ${displayValue}`));
}

function parseConfigValue(key: string, value: string): any {
  // Boolean values
  if (['auto_approve_low_risk', 'audit_mode'].includes(key)) {
    return value.toLowerCase() === 'true';
  }

  // Validate specific keys
  switch (key) {
    case 'max_risk_level':
      const validLevels = ['low', 'medium', 'high', 'critical'];
      if (!validLevels.includes(value)) {
        throw new Error(`Invalid risk level. Must be one of: ${validLevels.join(', ')}`);
      }
      return value;
    
    case 'network':
      const validNetworks = ['mainnet', 'sepolia', 'goerli', 'polygon'];
      if (!validNetworks.includes(value)) {
        throw new Error(`Invalid network. Must be one of: ${validNetworks.join(', ')}`);
      }
      return value;
    
    case 'default_wallet':
      if (!value.startsWith('0x') || value.length !== 42) {
        throw new Error('Invalid wallet address format');
      }
      return value;
    
    case 'registry_url':
      try {
        new URL(value);
        return value;
      } catch {
        throw new Error('Invalid URL format');
      }
    
    default:
      return value;
  }
}

async function interactiveConfig() {
  const config = loadConfig();

  console.log(chalk.blue('\n🔧 Interactive Configuration'));
  console.log(chalk.gray('─'.repeat(40)));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'default_wallet',
      message: 'Default wallet address:',
      default: config.default_wallet || '',
      validate: (input: string) => {
        if (!input) return true; // Optional
        if (!input.startsWith('0x') || input.length !== 42) {
          return 'Invalid wallet address format';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'registry_url',
      message: 'Skill registry URL:',
      default: config.registry_url || 'https://registry.tais.ai',
      validate: (input: string) => {
        try {
          new URL(input);
          return true;
        } catch {
          return 'Invalid URL format';
        }
      }
    },
    {
      type: 'list',
      name: 'network',
      message: 'Blockchain network:',
      default: config.network || 'sepolia',
      choices: [
        { name: '🟢 Mainnet', value: 'mainnet' },
        { name: '🧪 Sepolia Testnet', value: 'sepolia' },
        { name: '🧪 Goerli Testnet', value: 'goerli' },
        { name: '🟣 Polygon', value: 'polygon' }
      ]
    },
    {
      type: 'list',
      name: 'max_risk_level',
      message: 'Maximum allowed risk level:',
      default: config.max_risk_level || 'medium',
      choices: [
        { name: '🟢 Low Only', value: 'low' },
        { name: '🟡 Medium and below', value: 'medium' },
        { name: '🟠 High and below', value: 'high' },
        { name: '🔴 All levels', value: 'critical' }
      ]
    },
    {
      type: 'confirm',
      name: 'auto_approve_low_risk',
      message: 'Auto-approve low risk skills?',
      default: config.auto_approve_low_risk || false
    },
    {
      type: 'confirm',
      name: 'audit_mode',
      message: 'Enable audit mode (require manual review)?',
      default: config.audit_mode || false
    }
  ]);

  // Save configuration
  Object.assign(config, answers);
  saveConfig(config);

  console.log(chalk.green('\n✅ Configuration saved successfully!'));
  console.log(chalk.gray('\n' + '═'.repeat(40)));
  
  // Show summary
  console.log(chalk.blue('📋 Configuration Summary:'));
  Object.entries(answers).forEach(([key, value]) => {
    const displayValue = typeof value === 'boolean' ? (value ? '✅ Yes' : '❌ No') : value;
    console.log(`   ${chalk.bold(key)}: ${displayValue}`);
  });
}