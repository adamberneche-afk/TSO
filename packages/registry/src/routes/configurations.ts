// packages/registry/src/routes/configurations.ts
// Agent configuration persistence routes for genesis holders

import { Router, Request, Response } from 'express';
import {
  canCreateConfiguration,
  getWalletConfigurations,
  saveConfiguration,
  updateConfiguration,
  deleteConfiguration,
  verifyNFTOwnership
} from '../services/genesisConfigLimits';

// Extend Express Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    walletAddress: string;
  };
  body: any;
  params: {
    id: string;
  };
}

const router = Router();

/**
 * GET /api/configurations/status
 * Check configuration limits for authenticated wallet
 */
router.get('/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const walletAddress = req.user?.walletAddress;
    
    if (!walletAddress) {
      return res.status(401).json({
        error: 'Authentication required',
        allowed: false
      });
    }
    
    const status = await canCreateConfiguration(walletAddress);
    const configs = await getWalletConfigurations(walletAddress);
    
    res.json({
      ...status,
      configurations: configs
    });
    
  } catch (error) {
    console.error('Error checking configuration status', error);
    res.status(500).json({
      error: 'Failed to check configuration status',
      allowed: false
    });
  }
});

/**
 * GET /api/configurations
 * Get all configurations for authenticated wallet
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const walletAddress = req.user?.walletAddress;
    
    if (!walletAddress) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    
    const configs = await getWalletConfigurations(walletAddress);
    const status = await canCreateConfiguration(walletAddress);
    
    res.json({
      configurations: configs,
      limit: status.limit,
      used: status.currentCount,
      remaining: status.remaining
    });
    
  } catch (error) {
    console.error('Error fetching configurations', error);
    res.status(500).json({
      error: 'Failed to fetch configurations'
    });
  }
});

/**
 * POST /api/configurations
 * Save a new configuration
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  console.log('[SAVE CONFIG] POST /api/configurations received');
  console.log('[SAVE CONFIG] Headers:', JSON.stringify(req.headers, null, 2));
  
  try {
    const walletAddress = req.user?.walletAddress;
    console.log('[SAVE CONFIG] Wallet from JWT:', walletAddress);
    
    if (!walletAddress) {
      console.log('[SAVE CONFIG] ❌ No wallet address in JWT - returning 401');
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    
    const { name, configData, description } = req.body;
    console.log('[SAVE CONFIG] Request body:', { name, hasConfigData: !!configData, description });
    
    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Configuration name is required'
      });
    }
    
    if (!configData || typeof configData !== 'object') {
      return res.status(400).json({
        error: 'Configuration data is required'
      });
    }
    
    if (name.length > 100) {
      return res.status(400).json({
        error: 'Configuration name must be less than 100 characters'
      });
    }
    
    if (description && description.length > 500) {
      return res.status(400).json({
        error: 'Description must be less than 500 characters'
      });
    }
    
    // Check limits
    console.log('[SAVE CONFIG] Checking configuration limits...');
    const check = await canCreateConfiguration(walletAddress);
    console.log('[SAVE CONFIG] Limit check result:', JSON.stringify(check, null, 2));
    
    if (!check.allowed) {
      console.log('[SAVE CONFIG] ❌ Save blocked:', check.error);
      return res.status(403).json({
        error: check.error || 'Configuration limit reached',
        limit: check.limit,
        used: check.currentCount
      });
    }
    
    console.log('[SAVE CONFIG] ✅ Limits check passed');
    
    // Save configuration
    const result = await saveConfiguration(
      walletAddress,
      name.trim(),
      configData,
      description?.trim()
    );
    
    console.log('Configuration saved', {
      walletAddress,
      configId: result.config.id,
      name: result.config.name
    });
    
    res.status(201).json({
      success: true,
      configuration: result.config,
      limit: result.limit,
      remaining: result.remaining
    });
    
  } catch (error) {
    console.error('Error saving configuration', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to save configuration'
    });
  }
});

/**
 * PUT /api/configurations/:id
 * Update an existing configuration
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const walletAddress = req.user?.walletAddress;
    const { id } = req.params;
    
    if (!walletAddress) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    
    const { name, description, configData } = req.body;
    
    // Validation
    const updates: any = {};
    
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          error: 'Configuration name cannot be empty'
        });
      }
      if (name.length > 100) {
        return res.status(400).json({
          error: 'Configuration name must be less than 100 characters'
        });
      }
      updates.name = name.trim();
    }
    
    if (description !== undefined) {
      if (description.length > 500) {
        return res.status(400).json({
          error: 'Description must be less than 500 characters'
        });
      }
      updates.description = description.trim();
    }
    
    if (configData !== undefined) {
      if (typeof configData !== 'object') {
        return res.status(400).json({
          error: 'Configuration data must be an object'
        });
      }
      updates.configData = configData;
    }
    
    // Update configuration
    const config = await updateConfiguration(id, walletAddress, updates);
    
    console.log('Configuration updated', {
      walletAddress,
      configId: id,
      name: config.name
    });
    
    res.json({
      success: true,
      configuration: config
    });
    
  } catch (error) {
    console.error('Error updating configuration', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update configuration'
    });
  }
});

/**
 * DELETE /api/configurations/:id
 * Soft delete a configuration
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const walletAddress = req.user?.walletAddress;
    const { id } = req.params;
    
    if (!walletAddress) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    
    // Delete configuration
    await deleteConfiguration(id, walletAddress);
    
    // Get updated status
    const status = await canCreateConfiguration(walletAddress);
    
    console.log('Configuration deleted', {
      walletAddress,
      configId: id
    });
    
    res.json({
      success: true,
      remaining: status.remaining,
      limit: status.limit
    });
    
  } catch (error) {
    console.error('Error deleting configuration', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete configuration'
    });
  }
});

/**
 * GET /api/configurations/nft/verify
 * Verify NFT ownership for authenticated wallet
 */
router.get('/nft/verify', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const walletAddress = req.user?.walletAddress;
    
    if (!walletAddress) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    
    const ownership = await verifyNFTOwnership(walletAddress);
    const status = await canCreateConfiguration(walletAddress);
    
    res.json({
      isHolder: ownership.isHolder,
      tokenCount: ownership.tokenCount,
      tokenIds: ownership.tokenIds,
      configLimit: status.limit,
      configsUsed: status.currentCount,
      configsRemaining: status.remaining,
      error: ownership.error
    });
    
  } catch (error) {
    console.error('Error verifying NFT ownership', error);
    res.status(500).json({
      error: 'Failed to verify NFT ownership'
    });
  }
});

export default router;
