import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { ethers } from 'ethers';
import { VouchRequest } from '@think/types';
import { RegistryClient } from '../services/RegistryClient';
import { loadSigningWallet } from '../utils/wallet';

/**
 * Adds a "voucher" link to a skill's community provenance chain
 * (docs/DOCS_VS_CODEBASE.md row 6) -- the lightest-weight endorsement
 * tier, open to any wallet (no Auditor NFT required, unlike `tais
 * audit`). See routes/provenance.ts for the exact signed-payload
 * convention this mirrors.
 */
function signVouch(skillHash: string, wallet: ethers.Wallet, timestamp: string): string {
  const payload = `${skillHash}:${wallet.address.toLowerCase()}:voucher:${timestamp}`;
  return wallet.signMessageSync(payload);
}

export async function vouchCommand(skillHash: string, options: any) {
  const spinner = ora();

  try {
    console.log(chalk.blue.bold('🤝 TAIS Skill Vouch'));
    console.log(chalk.gray('═'.repeat(50)));

    const wallet = loadSigningWallet();

    console.log(`   Skill: ${chalk.gray(skillHash.substring(0, 16))}...`);
    console.log(`   Wallet: ${wallet.address}`);

    let notes: string | undefined = options.notes;
    if (!notes && !options.yes) {
      const answers = await inquirer.prompt([{
        type: 'input',
        name: 'notes',
        message: 'Optional note for this vouch (e.g. why you trust this skill):',
      }]);
      notes = answers.notes || undefined;
    }

    if (!options.yes) {
      const { confirmed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirmed',
        message: 'Vouch for this skill on the community registry?',
        default: false
      }]);

      if (!confirmed) {
        console.log(chalk.yellow('Vouch cancelled.'));
        process.exit(0);
      }
    }

    spinner.start('Submitting vouch to community registry...');

    const timestamp = new Date().toISOString();
    const vouch: VouchRequest = {
      wallet: wallet.address.toLowerCase(),
      signature: signVouch(skillHash, wallet, timestamp),
      timestamp,
      notes,
    };

    const registryClient = new RegistryClient();
    const token = await registryClient.loginWithWallet(wallet);
    const result = await registryClient.submitVouch(skillHash, vouch, token);

    if (result.success) {
      spinner.succeed('✅ Vouch submitted successfully');
      if (typeof result.provenanceScore === 'number') {
        console.log(`   🌐 Skill Provenance Score: ${(result.provenanceScore * 100).toFixed(1)}%`);
      }
      console.log(`   🔗 View: ${chalk.bold('tais verify --provenance ' + skillHash)}`);
    } else {
      spinner.fail('Vouch submission failed');
      console.error(chalk.red('Error:'), result.error);
      process.exit(1);
    }
  } catch (error: any) {
    spinner.fail('Vouch failed');
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}
