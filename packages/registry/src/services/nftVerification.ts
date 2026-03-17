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

// Squad Zeta Fix: Circuit Breaker pattern for blockchain resilience
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime?: number;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 minute
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - (this.lastFailureTime || 0);
      if (timeSinceLastFailure < this.timeout) {
        throw new Error('Circuit breaker is OPEN - NFT verification temporarily unavailable');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await Promise.race([
        fn(),
        new Promise<T>((_, reject) => 
          setTimeout(() => reject(new Error('Blockchain call timeout')), 10000)
        )
      ]);
      
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
  
  getState(): string {
    return this.state;
  }
}

class NFTVerificationService {
  private provider: ethers.JsonRpcProvider | null = null;
  private publisherContract: ethers.Contract | null = null;
  private auditorContract: ethers.Contract | null = null;
  private config: NFTConfig;
  private logger: any;
  private circuitBreaker: CircuitBreaker;

  // Squad Zeta Fix: Added logger parameter and circuit breaker
  constructor(config: NFTConfig, logger?: any) {
    this.config = config;
    this.logger = logger || console;
    this.circuitBreaker = new CircuitBreaker();
    this.initialize();
  }

  private initialize() {
    // Initialize provider if RPC URL is available
    console.log('[NFT Verify] nftVerification initialize - RPC_URL:', this.config.rpcUrl);
    if (this.config.rpcUrl) {
      try {
        // Provide chainId (1 for Ethereum mainnet) to skip network detection and prevent infinite retry
        this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl, { chainId: 1, name: 'Ethereum' });
        this.logger.info('✅ NFT Verification: Provider initialized with URL:', this.config.rpcUrl);
      } catch (error: any) {
        this.logger.warn({ error: error.message }, '⚠️  NFT Verification: Failed to initialize provider');
        this.provider = null;
      }
    } else {
      this.logger.warn('⚠️  NFT Verification: No RPC URL provided');
    }

    // Initialize publisher contract
    if (this.config.publisherAddress && this.provider) {
      try {
        this.publisherContract = new ethers.Contract(
          this.config.publisherAddress,
          ERC721_ABI,
          this.provider
        );
        this.logger.info({ address: this.config.publisherAddress }, '✅ NFT Verification: Publisher contract initialized');
      } catch (error) {
        this.logger.warn({ error }, '⚠️  NFT Verification: Failed to initialize publisher contract');
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
        this.logger.info({ address: this.config.auditorAddress }, '✅ NFT Verification: Auditor contract initialized');
      } catch (error) {
        this.logger.warn({ error }, '⚠️  NFT Verification: Failed to initialize auditor contract');
      }
    }

    if (!this.provider) {
      this.logger.info('ℹ️  NFT Verification: Running in mock mode (no RPC URL provided)');
    }
  }

  /**
   * Check if wallet owns publisher NFT (THINK Genesis Bundle or custom)
   * Squad Zeta CRITICAL-2 Fix: Fail-closed behavior - throws error if contract not configured
   */
  async isPublisher(walletAddress: string): Promise<boolean> {
    // Squad Zeta CRITICAL-2 Fix: Fail-closed instead of fail-open
    if (!this.publisherContract) {
      this.logger.error('NFT Verification: Publisher contract not configured');
      throw new Error('NFT verification service unavailable - publisher contract not configured');
    }

    try {
      // Squad Zeta Fix: Use circuit breaker for resilience
      const balance = await this.circuitBreaker.execute(async () => {
        return await this.publisherContract!.balanceOf(walletAddress);
      });
      
      const hasNFT = balance > 0n;
      
      if (hasNFT) {
        this.logger.info({ walletAddress }, `✅ Wallet owns publisher NFT`);
      } else {
        this.logger.info({ walletAddress }, `❌ Wallet does not own publisher NFT`);
      }
      
      return hasNFT;
    } catch (error) {
      this.logger.error({ error, walletAddress }, '❌ Error checking publisher NFT');
      // Squad Zeta Fix: Fail-closed - throw error instead of returning false
      throw new Error('Unable to verify NFT ownership - blockchain verification failed');
    }
  }

  /**
   * Check if wallet owns auditor NFT (THINK Genesis Bundle or custom)
   * Squad Zeta CRITICAL-2 Fix: Fail-closed behavior - throws error if contract not configured
   */
  async isAuditor(walletAddress: string): Promise<boolean> {
    // Squad Zeta CRITICAL-2 Fix: Fail-closed instead of fail-open
    if (!this.auditorContract) {
      this.logger.error('NFT Verification: Auditor contract not configured');
      throw new Error('NFT verification service unavailable - auditor contract not configured');
    }

    try {
      // Squad Zeta Fix: Use circuit breaker for resilience
      const balance = await this.circuitBreaker.execute(async () => {
        return await this.auditorContract!.balanceOf(walletAddress);
      });
      
      const hasNFT = balance > 0n;
      
      if (hasNFT) {
        this.logger.info({ walletAddress }, `✅ Wallet owns auditor NFT`);
      } else {
        this.logger.info({ walletAddress }, `❌ Wallet does not own auditor NFT`);
      }
      
      return hasNFT;
    } catch (error) {
      this.logger.error({ error, walletAddress }, '❌ Error checking auditor NFT');
      // Squad Zeta Fix: Fail-closed - throw error instead of returning false
      throw new Error('Unable to verify NFT ownership - blockchain verification failed');
    }
  }

  /**
   * Get circuit breaker state for health monitoring
   */
  getCircuitBreakerState(): string {
    return this.circuitBreaker.getState();
  }

  /**
   * Check if service is healthy
   */
  isHealthy(): boolean {
    return this.provider !== null && 
           this.publisherContract !== null && 
           this.circuitBreaker.getState() !== 'OPEN';
  }
}

export { NFTVerificationService, CircuitBreaker };
export default NFTVerificationService;

export * from './genesisConfigLimits';
