import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from './init';
import { TAISClient } from 'tais-rag-sdk';

export async function statusCommand(): Promise<void> {
  const config = loadConfig();

  console.log(chalk.bold('\n📊 TAIS SDK Status\n'));

  // Config status
  console.log(chalk.bold('Configuration:'));
  console.log(chalk.gray(`  API URL:      ${config.apiUrl}`));
  console.log(chalk.gray(`  Wallet:       ${config.walletAddress || chalk.yellow('not set')}`));
  console.log(chalk.gray(`  API Key:      ${config.apiKey ? chalk.green('set') : chalk.yellow('not set')}`));
  console.log(chalk.gray(`  Analytics:    ${config.analyticsEnabled ? chalk.green('enabled') : chalk.red('disabled')}`));

  // API status
  const spinner = ora('Checking API...').start();

  try {
    const client = new TAISClient({
      baseUrl: config.apiUrl,
      walletAddress: config.walletAddress,
      apiKey: config.apiKey,
    });

    const health = await client.healthCheck();
    spinner.succeed(chalk.green('API Status: Connected'));

    console.log(chalk.bold('\n🌐 API Health:'));
    console.log(chalk.gray(`  Status:  ${health.status}`));
    console.log(chalk.gray(`  Timestamp: ${health.timestamp}`));

    // Check quotas if authenticated
    if (config.walletAddress && config.apiKey) {
      try {
        const quota = await client.getQuota();
        console.log(chalk.bold('\n💰 Quota Status:'));
        console.log(chalk.gray(`  Tier:        ${quota.tier}`));
        console.log(chalk.gray(`  Storage:     ${formatBytes(quota.storage.used)} / ${formatBytes(quota.storage.quota)}`));
        console.log(chalk.gray(`  Queries:     ${quota.queries.used} / ${quota.queries.limit}`));
      } catch (e) {
        // Quota check might fail, that's okay
      }
    }
  } catch (error: any) {
    spinner.fail(chalk.red('API Status: Disconnected'));
    console.log(chalk.red(`  Error: ${error.message}`));
  }

  console.log('');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
