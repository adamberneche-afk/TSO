import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';

const CONFIG_FILE = './tais-config.json';

interface SDKConfig {
  apiUrl: string;
  walletAddress?: string;
  apiKey?: string;
  sessionToken?: string;
  analyticsEnabled: boolean;
}

const DEFAULT_CONFIG: SDKConfig = {
  apiUrl: 'https://tso.onrender.com',
  analyticsEnabled: true,
};

export async function initCommand(): Promise<void> {
  const spinner = ora('Initializing TAIS SDK configuration...').start();

  try {
    // Check if config already exists
    if (fs.existsSync(CONFIG_FILE)) {
      spinner.stop();
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'Configuration file already exists. Overwrite?',
          default: false,
        },
      ]);

      if (!overwrite) {
        console.log(chalk.yellow('Initialization cancelled.'));
        return;
      }
    }

    // Collect configuration
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiUrl',
        message: 'API URL:',
        default: DEFAULT_CONFIG.apiUrl,
      },
      {
        type: 'input',
        name: 'walletAddress',
        message: 'Wallet address (optional, for authenticated requests):',
        default: '',
      },
      {
        type: 'confirm',
        name: 'analyticsEnabled',
        message: 'Enable analytics to help improve TAIS platform?',
        default: true,
      },
    ]);

    const config: SDKConfig = {
      ...DEFAULT_CONFIG,
      apiUrl: answers.apiUrl,
      walletAddress: answers.walletAddress || undefined,
      analyticsEnabled: answers.analyticsEnabled,
    };

    // Save configuration
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

    spinner.succeed(chalk.green('Configuration saved to tais-config.json'));
    console.log(chalk.cyan(`
Next steps:
  1. Authenticate: tais-assistant start
  2. Test:        tais-assistant test
  3. Status:      tais-assistant status
    `));
  } catch (error: any) {
    spinner.fail(chalk.red('Initialization failed: ' + error.message));
  }
}

export function loadConfig(): SDKConfig {
  if (fs.existsSync(CONFIG_FILE)) {
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: SDKConfig): void {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}
