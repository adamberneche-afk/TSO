import chalk from 'chalk';
import { loadConfig, saveConfig } from './init';

export async function configCommand(options: { apiKey?: string; endpoint?: string }): Promise<void> {
  const config = loadConfig();

  if (options.endpoint) {
    config.apiUrl = options.endpoint;
    saveConfig(config);
    console.log(chalk.green(`✅ API endpoint updated to: ${options.endpoint}`));
  }

  if (options.apiKey) {
    config.apiKey = options.apiKey;
    saveConfig(config);
    console.log(chalk.green('✅ API key updated'));
  }

  // Display current config
  console.log(chalk.bold('\n📋 Current Configuration:\n'));
  console.log(chalk.gray(`  API URL:      ${config.apiUrl}`));
  console.log(chalk.gray(`  Wallet:       ${config.walletAddress || '(not set)'}`));
  console.log(chalk.gray(`  API Key:      ${config.apiKey ? '***' + config.apiKey.slice(-4) : '(not set)'}`));
  console.log(chalk.gray(`  Analytics:    ${config.analyticsEnabled ? 'enabled' : 'disabled'}\n`));
}
