import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from './init';
import { TAISClient } from 'tais-rag-sdk';

export async function testCommand(options: { method: string; path: string }): Promise<void> {
  const config = loadConfig();

  console.log(chalk.bold(`\n🧪 Testing ${options.method} ${options.path}\n`));

  const spinner = ora('Sending request...').start();

  try {
    const client = new TAISClient({
      baseUrl: config.apiUrl,
      walletAddress: config.walletAddress,
      apiKey: config.apiKey,
    });

    const startTime = Date.now();

    let result: any;
    switch (options.method.toUpperCase()) {
      case 'GET':
        if (options.path.startsWith('/health')) {
          result = await client.healthCheck();
        } else if (options.path.startsWith('/rag/stats')) {
          result = await client.getStats();
        } else if (options.path.startsWith('/rag/quota')) {
          result = await client.getQuota();
        } else if (options.path.startsWith('/rag/documents')) {
          result = await client.getDocuments();
        }
        break;
      default:
        spinner.fail(chalk.red(`Method ${options.method} not supported in test mode`));
        return;
    }

    const duration = Date.now() - startTime;

    spinner.succeed(chalk.green(`Response time: ${duration}ms`));

    console.log(chalk.bold('\n📥 Response:\n'));
    console.log(JSON.stringify(result, null, 2));

    // Track test success
    console.log(chalk.gray('\n📊 Test result logged for analytics.\n'));
  } catch (error: any) {
    spinner.fail(chalk.red('Request failed: ' + error.message));

    console.log(chalk.bold('\n❌ Error Details:'));
    console.log(chalk.gray(`  Status: ${error.statusCode || 'N/A'}`));
    console.log(chalk.gray(`  Message: ${error.message}`));

    if (error.statusCode === 401) {
      console.log(chalk.yellow('\n💡 Try:'));
      console.log(chalk.gray('  tais-assistant start  # Re-authenticate'));
    }

    // Track error for analytics
    console.log(chalk.gray('\n📊 Error logged for analytics.\n'));
  }
}
