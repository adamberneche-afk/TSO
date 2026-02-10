import { ethers } from 'ethers';

// ABI for ERC721 NFT (minimal)
const ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
];

interface NFTConfig {
  publisherAddress?: string;
  auditorAddress?: string;
  rpcUrl?: string;
}

class NFTVerificationService {
  private provider: ethers.JsonRpcProvider | null = null;
  private publisherContract: ethers.Contract | null = null;
  private auditorContract: ethers.Contract | null = null;
  private config: NFTConfig;

  constructor(config: NFTConfig) {
    this.config = config;
    this.initialize();
  }

  private initialize() {
    // Initialize provider if RPC URL is available
    if (this.config.rpcUrl) {
      try {
        this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
        console.log('✅ NFT Verification: Provider initialized');
      } catch (error) {
        console.warn('⚠️  NFT Verification: Failed to initialize provider:', error);
      }
    }

    // Initialize publisher contract
    if (this.config.publisherAddress && this.provider) {
      try {
        this.publisherContract = new ethers.Contract(
          this.config.publisherAddress,
          ERC721_ABI,
          this.provider
        );
        console.log('✅ NFT Verification: Publisher contract initialized at', this.config.publisherAddress);
      } catch (error) {
        console.warn('⚠️  NFT Verification: Failed to initialize publisher contract:', error);
      }
    }

    // Initialize auditor contract
    if (this.config.auditorAddress && this.provider) {
      try {
        this.auditorContract = new ethers.Contract(
          this.config.auditorAddress,
          ERC721_ABI,
          this.provider
        );
        console.log('✅ NFT Verification: Auditor contract initialized at', this.config.auditorAddress);
      } catch (error) {
        console.warn('⚠️  NFT Verification: Failed to initialize auditor contract:', error);
      }
    }

    if (!this.provider) {
      console.log('ℹ️  NFT Verification: Running in mock mode (no RPC URL provided)');
    }
  }

  /**
   * Check if wallet owns publisher NFT (THINK Genesis Bundle or custom)
   */
  async isPublisher(walletAddress: string): Promise<boolean> {
    if (!this.publisherContract) {
      console.log('ℹ️  NFT Verification: No publisher contract configured, allowing all');
      return true; // Allow all if no contract configured
    }

    try {
      const balance = await this.publisherContract.balanceOf(walletAddress);
      const hasNFT = balance > 0;
      
      if (hasNFT) {
        console.log(`✅ Wallet ${walletAddress} owns publisher NFT`);
      } else {
        console.log(`❌ Wallet ${walletAddress} does not own publisher NFT`);
      }
      
      return hasNFT;
    } catch (error) {
      console.error('❌ Error checking publisher NFT:', error);
      return false;
    }
  }

  /**
   * Check if wallet owns auditor NFT (THINK Genesis Bundle or custom)
   */
  async isAuditor(walletAddress: string): Promise<boolean> {
    if (!this.auditorContract) {
      console.log('ℹ️  NFT Verification: No auditor contract configured, allowing all');
      return true; // Allow all if no contract configured
    }

    try {
      const balance = await this.auditorContract.balanceOf(walletAddress);
      const hasNFT = balance > 0;
      
      if (hasNFT) {
        console.log(`✅ Wallet ${walletAddress} owns auditor NFT`);
      } else {
        console.log(`❌ Wallet ${walletAddress} does not own auditor NFT`);
      }
      
      return hasNFT;
    } catch (error) {
      console.error('❌ Error checking auditor NFT:', error);
      return false;
    }
  }

  /**
   * Get NFT balance for a wallet
   */
  async getPublisherBalance(walletAddress: string): Promise<number> {
    if (!this.publisherContract) {
      return 0;
    }

    try {
      const balance = await this.publisherContract.balanceOf(walletAddress);
      return Number(balance);
    } catch (error) {
      console.error('❌ Error getting publisher balance:', error);
      return 0;
    }
  }

  /**
   * Check verification status
   */
  getStatus(): {
    publisherConfigured: boolean;
    auditorConfigured: boolean;
    providerConnected: boolean;
  } {
    return {
      publisherConfigured: !!this.publisherContract,
      auditorConfigured: !!this.auditorContract,
      providerConnected: !!this.provider,
    };
  }
}

// Create singleton instance
const config: NFTConfig = {
  publisherAddress: process.env.PUBLISHER_NFT_ADDRESS,
  auditorAddress: process.env.AUDITOR_NFT_ADDRESS,
  rpcUrl: process.env.RPC_URL,
};

export const nftVerification = new NFTVerificationService(config);
export { NFTVerificationService };
