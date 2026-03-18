// Billing routes for Cross-App Agent Portability
// Phase 5: Revenue & Billing

import { Router, Request, Response } from 'express';
import { verifyNFTOwnership } from '../services/genesisConfigLimits';
import { normalizeWalletAddress, walletAddressesEqual } from '../utils/wallet';

const COST_PER_1K_INTERACTIONS = 0.10;
const FREE_TIER_LIMIT = 1000;
const VERIFIED_TIER_LIMIT = 50000;

interface AuthenticatedRequest extends Request {
  user?: {
    walletAddress: string;
  };
}

export function createBillingRoutes(prisma: any, logger: any): Router {
  const router = Router();

  // Get usage for a specific app
  router.get('/usage', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authenticatedWallet = req.user?.walletAddress;
      const { wallet, app_id, start_date, end_date } = req.query;

// IDOR Fix: Verify user can only access their own data
       if (!authenticatedWallet) {
         return res.status(401).json({ error: 'Authentication required' });
       }

       if (!wallet || typeof wallet !== 'string') {
         return res.status(400).json({ error: 'wallet is required' });
       }

       const normalizedWallet = normalizeWalletAddress(wallet);
       const normalizedAuthenticatedWallet = normalizeWalletAddress(authenticatedWallet);
       
       if (!normalizedWallet || !normalizedAuthenticatedWallet) {
         return res.status(400).json({ error: 'Invalid wallet address format' });
       }

       // IDOR Fix: Users can only access their own wallet's data
       if (!walletAddressesEqual(wallet, authenticatedWallet)) {
         return res.status(403).json({ error: 'Access denied to this wallet\'s data' });
       }

      const nftResult = await verifyNFTOwnership(wallet);
      const tier = nftResult.isHolder ? (nftResult.tokenCount >= 3 ? 'gold' : 'silver') : 'free';
      
      const where: any = {
        walletAddress: wallet.toLowerCase(),
      };

      if (app_id) {
        where.appId = app_id as string;
      }

      if (start_date || end_date) {
        where.timestamp = {};
        if (start_date) {
          where.timestamp.gte = new Date(start_date as string);
        }
        if (end_date) {
          where.timestamp.lte = new Date(end_date as string);
        }
      }

      const metrics = await prisma.appUsageMetric.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: 1000, // Limit to prevent excessive memory usage
      });

      // Aggregate by app
      const byApp: Record<string, { interactions: number; tokens: number; cost: number }> = {};
      const byDay: Record<string, { interactions: number; tokens: number; cost: number }> = {};
      let totalInteractions = 0;
      let totalTokens = 0;
      let totalCost = 0;

      for (const m of metrics) {
        const appName = m.appId;
        const day = m.timestamp.toISOString().split('T')[0];

        if (!byApp[appName]) {
          byApp[appName] = { interactions: 0, tokens: 0, cost: 0 };
        }
        if (!byDay[day]) {
          byDay[day] = { interactions: 0, tokens: 0, cost: 0 };
        }

        byApp[appName].interactions += 1;
        byApp[appName].tokens += m.tokensUsed;
        byApp[appName].cost += m.cost;

        byDay[day].interactions += 1;
        byDay[day].tokens += m.tokensUsed;
        byDay[day].cost += m.cost;

        totalInteractions += 1;
        totalTokens += m.tokensUsed;
        totalCost += m.cost;
      }

      // Calculate billing
      const freeLimit = tier !== 'free' ? VERIFIED_TIER_LIMIT : FREE_TIER_LIMIT;
      const billableInteractions = Math.max(0, totalInteractions - freeLimit);
      const estimatedCost = (billableInteractions / 1000) * COST_PER_1K_INTERACTIONS;

      res.json({
        wallet,
        tier,
        summary: {
          totalInteractions,
          totalTokens,
          totalCost,
          freeLimit,
          billableInteractions,
          estimatedCost,
          currency: 'USD',
        },
        byApp: Object.entries(byApp).map(([appId, data]) => ({
          appId,
          ...data,
        })),
        byDay: Object.entries(byDay)
          .sort(([a], [b]) => b.localeCompare(a))
          .slice(0, 30)
          .map(([date, data]) => ({
            date,
            ...data,
          })),
        period: {
          start: start_date || null,
          end: end_date || null,
        },
      });
    } catch (error) {
      logger.error('Billing usage error:', error);
      res.status(500).json({ error: 'Failed to fetch usage' });
    }
  });

  // Get invoices
  router.get('/invoices', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authenticatedWallet = req.user?.walletAddress;
      const { wallet } = req.query;

      // IDOR Fix: Verify authenticated user
      if (!authenticatedWallet) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'wallet is required' });
      }

      // IDOR Fix: Users can only access their own data
      if (wallet.toLowerCase() !== authenticatedWallet.toLowerCase()) {
        return res.status(403).json({ error: 'Access denied to this wallet\'s data' });
      }

      const nftResult = await verifyNFTOwnership(wallet);
      const tier = nftResult.isHolder ? (nftResult.tokenCount >= 3 ? 'gold' : 'silver') : 'free';
      
      // Get usage for current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const metrics = await prisma.appUsageMetric.findMany({
        where: {
          walletAddress: wallet.toLowerCase(),
          timestamp: { gte: startOfMonth },
        },
      });

      const totalInteractions = metrics.length;
      const totalTokens = metrics.reduce((sum: number, m: any) => sum + m.tokensUsed, 0);
      const totalCost = metrics.reduce((sum: number, m: any) => sum + m.cost, 0);

      const freeLimit = tier !== 'free' ? VERIFIED_TIER_LIMIT : FREE_TIER_LIMIT;
      const billableInteractions = Math.max(0, totalInteractions - freeLimit);
      const amountDue = (billableInteractions / 1000) * COST_PER_1K_INTERACTIONS;

      // Current invoice
      const currentInvoice = {
        id: `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`,
        period: {
          start: startOfMonth.toISOString(),
          end: now.toISOString(),
        },
        status: amountDue > 0 ? 'pending' : 'paid',
        lineItems: [
          {
            description: `Agent interactions (${totalInteractions} total)`,
            quantity: totalInteractions,
            unitPrice: 0,
            amount: 0,
          },
          {
            description: `Free tier allocation`,
            quantity: freeLimit,
            unitPrice: 0,
            amount: 0,
          },
        ],
        subtotal: amountDue,
        tax: 0,
        total: amountDue,
        currency: 'USD',
        createdAt: now.toISOString(),
        dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
      };

      // Generate mock historical invoices
      const invoices = [currentInvoice];

      res.json({
        wallet,
        tier,
        invoices,
        currentInvoice,
      });
    } catch (error) {
      logger.error('Billing invoices error:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  // Get billing summary/dashboard
  router.get('/summary', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authenticatedWallet = req.user?.walletAddress;
      const { wallet } = req.query;

      // IDOR Fix: Verify authenticated user
      if (!authenticatedWallet) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'wallet is required' });
      }

      // IDOR Fix: Users can only access their own data
      if (wallet.toLowerCase() !== authenticatedWallet.toLowerCase()) {
        return res.status(403).json({ error: 'Access denied to this wallet\'s data' });
      }

      const nftResult = await verifyNFTOwnership(wallet);
      const tier = nftResult.isHolder ? (nftResult.tokenCount >= 3 ? 'gold' : 'silver') : 'free';

      // Get all-time stats
      const allMetrics = await prisma.appUsageMetric.findMany({
        where: {
          walletAddress: wallet.toLowerCase(),
        },
      });

      // Get this month's stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const monthMetrics = allMetrics.filter(
        (m: any) => new Date(m.timestamp) >= startOfMonth
      );

      const allTimeInteractions = allMetrics.length;
      const monthInteractions = monthMetrics.length;
      const allTimeCost = allMetrics.reduce((sum: number, m: any) => sum + m.cost, 0);
      const monthCost = monthMetrics.reduce((sum: number, m: any) => sum + m.cost, 0);

      const freeLimit = tier !== 'free' ? VERIFIED_TIER_LIMIT : FREE_TIER_LIMIT;
      const monthBillable = Math.max(0, monthInteractions - freeLimit);
      const monthEstimated = (monthBillable / 1000) * COST_PER_1K_INTERACTIONS;

      // Get unique apps
      const uniqueApps = new Set(allMetrics.map((m: any) => m.appId));

      res.json({
        wallet,
        tier,
        plan: tier === 'free' ? 'Basic' : tier === 'silver' ? 'Verified' : 'Gold',
        limits: {
          free: FREE_TIER_LIMIT,
          verified: VERIFIED_TIER_LIMIT,
          unlimited: tier === 'gold',
        },
        usage: {
          thisMonth: {
            interactions: monthInteractions,
            cost: monthEstimated,
            limit: freeLimit,
            percentUsed: Math.round((monthInteractions / freeLimit) * 100),
          },
          allTime: {
            interactions: allTimeInteractions,
            cost: allTimeCost,
          },
        },
        apps: uniqueApps.size,
        pricing: {
          per1kInteractions: COST_PER_1K_INTERACTIONS,
          currency: 'USD',
        },
      });
    } catch (error) {
      logger.error('Billing summary error:', error);
      res.status(500).json({ error: 'Failed to fetch billing summary' });
    }
  });

  return router;
}
