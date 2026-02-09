#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { installCommand } from './commands/install';
import { auditCommand } from './commands/audit';
import { listCommand } from './commands/list';
import { removeCommand } from './commands/remove';
import { verifyCommand } from './commands/verify';
import { configCommand } from './commands/config';

const program = new Command();

program
  .name('tais')
  .description('TAIS Skill Security CLI - Install and manage secure agent skills')
  .version('1.0.0');

// Install command
program
  .command('install')
  .description('Install a skill with security checks')
  .argument('<skill>', 'Skill name, URL, or local path')
  .option('-f, --force', 'Force installation despite warnings')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(installCommand);

// Audit command
program
  .command('audit')
  .description('Submit security audit for a skill')
  .argument('<skill>', 'Skill name or hash')
  .option('-r, --report <file>', 'YARA report file path')
  .option('-s, --status <status>', 'Audit status (safe/suspicious/malicious)', 'safe')
  .action(auditCommand);

// List command
program
  .command('list')
  .description('List installed skills')
  .option('-v, --verbose', 'Show detailed information')
  .option('-r, --risk', 'Show risk levels only')
  .action(listCommand);

// Remove command
program
  .command('remove')
  .description('Remove an installed skill')
  .argument('<skill>', 'Skill name')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(removeCommand);

// Verify command
program
  .command('verify')
  .description('Verify skill security or author identity')
  .argument('<target>', 'Skill hash, author address, or skill name')
  .option('-a, --author', 'Verify author NFT ownership')
  .option('-p, --provenance', 'Verify skill provenance chain')
  .action(verifyCommand);

// Config command
program
  .command('config')
  .description('Manage CLI configuration')
  .option('-s, --set <key=value>', 'Set configuration value')
  .option('-g, --get <key>', 'Get configuration value')
  .option('-l, --list', 'List all configuration')
  .action(configCommand);

// Error handling
program.configureOutput({
  writeErr: (str: string) => process.stderr.write(chalk.red(str)),
  writeOut: (str: string) => process.stdout.write(str)
});

// Global error handler
process.on('unhandledRejection', (error: any) => {
  console.error(chalk.red('❌ Unexpected error:'), error.message);
  process.exit(1);
});

program.parse();