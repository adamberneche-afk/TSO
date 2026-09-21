import { ethers } from 'ethers';

/**
 * Loads the wallet used to sign audit reports and isnad-chain links from
 * the TAIS_PRIVATE_KEY environment variable. There is currently no
 * interactive key-management flow (keystore, hardware wallet, etc.) in
 * the CLI -- this is the minimal real alternative to the placeholder
 * all-zeros signature that used to be sent instead, which the server
 * doesn't (and shouldn't) accept as proof of wallet ownership.
 */
export function loadSigningWallet(): ethers.Wallet {
  const privateKey = process.env.TAIS_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error(
      'No signing wallet configured. Set the TAIS_PRIVATE_KEY environment variable to the private key of the wallet you want to sign with.'
    );
  }

  try {
    return new ethers.Wallet(privateKey);
  } catch (error) {
    throw new Error('TAIS_PRIVATE_KEY is not a valid private key.');
  }
}
