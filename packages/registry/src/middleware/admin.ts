import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

/**
 * Admin Authorization Middleware
 * Squad Alpha - CRITICAL FIX-3: Requires JWT verification before admin check
 */

export interface AdminConfig {
  adminWallets: string[];
}

/**
 * CRITICAL FIX-3: Admin middleware now requires valid JWT before checking admin status
 * Previous vulnerability: Trusted X-Wallet-Address header directly
 */
export const requireAdmin = (
  adminWallets: string[]
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // First check if user is authenticated (req.user set by authenticateToken middleware)
    if (!req.user || !req.user.walletAddress) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Admin access requires valid authentication'
      });
    }

    // Now check if authenticated user is an admin
    const userWallet = req.user.walletAddress.toLowerCase();
    const normalizedAdminWallets = adminWallets.map(w => w.toLowerCase());

    if (!normalizedAdminWallets.includes(userWallet)) {
      (req as any).log?.warn({ userWallet }, 'Unauthorized admin access attempt') || console.warn(`Unauthorized admin access attempt from ${userWallet}`);
      return res.status(403).json({ 
        error: 'Admin access required',
        message: 'Your wallet is not authorized for admin operations'
      });
    }

    // User is authenticated and is an admin
    next();
  };
};

/**
 * Middleware factory for admin routes
 * Usage: router.use('/admin', createAdminMiddleware());
 */
export const createAdminMiddleware = () => {
  const adminWallets = process.env.ADMIN_WALLET_ADDRESSES?.split(',').map(w => w.trim()) || [];
  
  if (adminWallets.length === 0 && process.env.NODE_ENV === 'production') {
    // Squad Gamma: Use console for startup warnings (no req object available)
    console.warn('WARNING: No admin wallets configured in production');
  }

  return requireAdmin(adminWallets);
};

export default requireAdmin;
