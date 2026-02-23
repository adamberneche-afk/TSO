#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { startCommand } from './commands/start';
import { configCommand } from './commands/config';
import { testCommand } from './commands/test';
import { initCommand } from './commands/init';
import { statusCommand } from './commands/status';
import { analyticsCommand } from './commands/analytics';

const program = new Command();

program
  .name('tais-assistant')
  .description('TAIS SDK Assistant - CLI tool for integrating with TAIS platform')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize SDK configuration')
  .action(initCommand);

program
  .command('start')
  .description('Start interactive onboarding session')
  .option('-w, --wallet <address>', 'Wallet address')
  .action(startCommand);

program
  .command('config')
  .description('View or update SDK configuration')
  .option('--api-key <key>', 'Set API key')
  .option('--endpoint <url>', 'Set API endpoint')
  .action(configCommand);

program
  .command('test')
  .description('Test your SDK integration')
  .option('-m, --method <method>', 'HTTP method to test', 'GET')
  .option('-p, --path <path>', 'API path to test', '/health')
  .action(testCommand);

program
  .command('status')
  .description('Check SDK and API status')
  .action(statusCommand);

program
  .command('analytics')
  .description('View integration analytics')
  .option('--period <period>', 'Time period (day, week, month)', 'week')
  .action(analyticsCommand);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║          Welcome to TAIS SDK Assistant CLI               ║
║                                                           ║
║  Get started:                                           ║
║    tais-assistant init        # Initialize config        ║
║    tais-assistant start       # Start onboarding         ║
║    tais-assistant test        # Test your integration   ║
║                                                           ║
║  Documentation: https://docs.tais.io/sdk                ║
╚═══════════════════════════════════════════════════════════╝
  `));
  program.help();
}
