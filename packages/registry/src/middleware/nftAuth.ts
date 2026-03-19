import { Request, Response, NextFunction } from 'express';
import { NFTVerificationService } from '../services/nftVerification';
import { AuthenticatedRequest } from './auth';
import { safeLog } from '../utils/safeLog';

/**
 * NFT Authorization Middleware
 * Squad Beta - CRITICAL FIX-4: Verify NFT ownership for protected operations
 * Squad Zeta MEDIUM-3 Fix: Safe logging to prevent uncaught promise rejections
 */

export interface NFTAuthConfig {
  publisherContract: string;
  auditorContract: string;
  rpcUrl: string;
}

/**
 * CRITICAL FIX-4: Middleware to verify publisher NFT ownership
 * Required for skill publication
 */
export const requirePublisherNFT = (
  nftService: NFTVerificationService
) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Must be authenticated first
    if (!req.user || !req.user.walletAddress) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Publishing requires authentication'
      });
    }

    const walletAddress = req.user.walletAddress;

     try {
       // Verify publisher NFT ownership
       const hasPublisherNFT = await nftService.verifyPublisherOwnership(walletAddress);

       if (!hasPublisherNFT) {
         return res.status(403).json({
           error: 'Publisher NFT required',
           message: 'Publishing skills requires a THINK Genesis NFT or Publisher NFT'
         });
       }

       // User has publisher NFT, allow to proceed
       next();
     } catch (error) {
       // Squad Zeta MEDIUM-3 Fix: Use safe logging utility
       safeLog(req, 'error', 'Publisher NFT verification error', { error, walletAddress });
       
       return res.status(500).json({
         error: 'NFT verification failed',
         message: 'Unable to verify NFT ownership'
       });
     }
  };
};

/**
 * Middleware to verify auditor NFT ownership
 * Required for audit submission
 */
export const requireAuditorNFT = (
  nftService: NFTVerificationService
) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Must be authenticated first
    if (!req.user || !req.user.walletAddress) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Submitting audits requires authentication'
      });
    }

    const walletAddress = req.user.walletAddress;

     try {
       // Verify auditor NFT ownership
       const hasAuditorNFT = await nftService.verifyAuditorOwnership(walletAddress);

       if (!hasAuditorNFT) {
         return res.status(403).json({
           error: 'Auditor NFT required',
           message: 'Submitting audits requires a THINK Genesis NFT or Auditor NFT'
         });
       }

       // User has auditor NFT, allow to proceed
       next();
     } catch (error) {
       // Squad Zeta MEDIUM-3 Fix: Use safe logging utility
       safeLog(req, 'error', 'Auditor NFT verification error', { error, walletAddress });
       
       return res.status(500).json({
         error: 'NFT verification failed',
         message: 'Unable to verify NFT ownership'
       });
     }
  };
};

/**
 * Middleware to verify either publisher or auditor NFT
 * For operations that allow both roles
 */
export const requireAnyNFT = (
  nftService: NFTVerificationService
) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.walletAddress) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const walletAddress = req.user.walletAddress;

     try {
       const [isPublisher, isAuditor] = await Promise.all([
         nftService.verifyPublisherOwnership(walletAddress),
         nftService.verifyAuditorOwnership(walletAddress)
       ]);

      if (!isPublisher && !isAuditor) {
        return res.status(403).json({
          error: 'NFT required',
          message: 'This operation requires a THINK Genesis NFT'
        });
      }

      next();
    } catch (error) {
      // Squad Zeta MEDIUM-3 Fix: Use safe logging utility
      safeLog(req, 'error', 'NFT verification error', { error, walletAddress });
      
      return res.status(500).json({
        error: 'NFT verification failed'
      });
    }
  };
};

export default requirePublisherNFT;
