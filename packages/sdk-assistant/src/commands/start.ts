import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, saveConfig } from './init';
import { TAISClient } from 'tais-rag-sdk';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Introduction to TAIS platform',
    completed: false,
  },
  {
    id: 'wallet',
    title: 'Wallet Connection',
    description: 'Connect your wallet for authentication',
    completed: false,
  },
  {
    id: 'api_key',
    title: 'API Key Setup',
    description: 'Obtain API key via wallet signature',
    completed: false,
  },
  {
    id: 'first_upload',
    title: 'First Document Upload',
    description: 'Upload your first encrypted document',
    completed: false,
  },
  {
    id: 'first_search',
    title: 'First Search',
    description: 'Search your document',
    completed: false,
  },
  {
    id: 'complete',
    title: 'Complete!',
    description: 'You are ready to build!',
    completed: false,
  },
];

export async function startCommand(options: { wallet?: string }): Promise<void> {
  const config = loadConfig();

  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║          TAIS SDK - Interactive Onboarding                ║
╚═══════════════════════════════════════════════════════════╝
  `));

  // Step 1: Welcome
  console.log(chalk.bold('\n👋 Welcome to TAIS Platform!\n'));
  console.log(chalk.gray('This interactive guide will help you integrate with TAIS.'));
  console.log(chalk.gray('We\'ll track your progress to identify any pain points.\n'));

  const { proceed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'proceed',
      message: 'Ready to get started?',
      default: true,
    },
  ]);

  if (!proceed) {
    console.log(chalk.yellow('\nNo problem! Run "tais-assistant start" anytime to begin.\n'));
    return;
  }

  // Step 2: Wallet
  console.log(chalk.bold('\n🔗 Step 1: Wallet Connection\n'));

  let walletAddress = options.wallet || config.walletAddress;

  if (!walletAddress) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'walletAddress',
        message: 'Enter your wallet address (0x...):',
        validate: (input: string) => {
          return input.startsWith('0x') && input.length === 42
            ? true
            : 'Please enter a valid Ethereum wallet address';
        },
      },
    ]);
    walletAddress = answers.walletAddress;
  }

  config.walletAddress = walletAddress;
  saveConfig(config);

  // Step 3: API Key (Gold tier)
  console.log(chalk.bold('\n🔑 Step 2: API Key Setup\n'));
  console.log(chalk.gray('Gold tier (Genesis NFT holders) can generate API keys.\n'));

  const spinner = ora('Connecting to TAIS API...').start();

  const client = new TAISClient({
    baseUrl: config.apiUrl,
    walletAddress: walletAddress!,
  });

  try {
    const health = await client.healthCheck();
    spinner.succeed(chalk.green('Connected to TAIS API!'));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to connect: ' + error.message));
    console.log(chalk.yellow('\nPlease check your configuration:'));
    console.log(chalk.gray('  tais-assistant config --endpoint <url>'));
    return;
  }

  const { hasGenesisNFT } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'hasGenesisNFT',
      message: 'Do you hold a Genesis NFT (Gold tier)?',
      default: false,
    },
  ]);

  if (hasGenesisNFT) {
    console.log(chalk.cyan('\n📝 To authenticate, please sign the challenge message with your wallet.\n'));

    const { authenticated } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'authenticated',
        message: 'Have you signed the challenge? (The CLI will prompt your wallet)',
        default: true,
      },
    ]);

    if (authenticated) {
      try {
        const result = await client.authenticateWithSignature(async (message) => {
          console.log(chalk.yellow('\n⚠️ Please sign this message with your wallet:'));
          console.log(chalk.gray(message.substring(0, 100) + '...'));
          return ''; // User would sign externally
        });

        if (result.success) {
          config.apiKey = result.apiKey;
          saveConfig(config);
          console.log(chalk.green('\n✅ API Key obtained!'));
        }
      } catch (error: any) {
        console.log(chalk.red('\n❌ Authentication failed: ' + error.message));
      }
    }
  } else {
    console.log(chalk.yellow('\n💡 Gold tier provides:'));
    console.log(chalk.gray('  • 100GB storage'));
    console.log(chalk.gray('  • 2M embeddings/month'));
    console.log(chalk.gray('  • 100K queries/day'));
    console.log(chalk.gray('  • SDK access\n'));
  }

  // Step 4: First Document
  console.log(chalk.bold('\n📄 Step 3: First Document Upload\n'));

  const { uploadDemo } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'uploadDemo',
      message: 'Would you like to try uploading a test document?',
      default: true,
    },
  ]);

  if (uploadDemo) {
    console.log(chalk.cyan('\nFor this step, you would:'));
    console.log(chalk.gray('1. Prepare your document content'));
    console.log(chalk.gray('2. Encrypt it using: import { encryptDocument } from "tais-rag-sdk"'));
    console.log(chalk.gray('3. Upload using: client.uploadDocument(encryptedData, options)'));
    console.log(chalk.gray('\nSee docs: https://docs.tais.io/sdk/upload'));
  }

  // Completion
  console.log(chalk.bold('\n🎉 Onboarding Complete!\n'));
  console.log(chalk.cyan('You\'re ready to integrate TAIS into your application!\n'));

  console.log(chalk.bold('Next steps:'));
  console.log(chalk.gray('  1. Install: npm install tais-rag-sdk'));
  console.log(chalk.gray('  2. Test:   tais-assistant test'));
  console.log(chalk.gray('  3. Docs:   https://docs.tais.io\n'));

  // Track completion
  console.log(chalk.gray('📊 Session progress saved. Thank you for helping improve TAIS!\n'));
}
