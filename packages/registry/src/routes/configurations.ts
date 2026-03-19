// packages/registry/src/routes/configurations.ts
// Agent configuration persistence routes for genesis holders

import { Router, Request, Response } from 'express';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'error',
  transports: [new winston.transports.Console()]
});

import {
  canCreateConfiguration,
  getWalletConfigurations,
  saveConfiguration,
  updateConfiguration,
  deleteConfiguration,
  verifyNFTOwnership
} from '../services/genesisConfigLimits';

import {
  createVersionSnapshot,
  getConfigVersions,
  getVersionDetails,
  rollbackToVersion,
  getUserTier
} from '../services/configurationVersioning';

// Extend Express Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    walletAddress: string;
  };
  body: any;
  params: {
    id?: string;
    ver?: string;
  };
}

const router = Router();

/**
 * GET /api/configurations/status
 * Check configuration limits for authenticated wallet
 */
router.get('/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.walletAddress) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const walletAddress = req.user.walletAddress;
    
    const status = await canCreateConfiguration(walletAddress);
    
    // Calculate used and tier based on the response
    const used = status.currentCount;
    let tier = 'bronze';
    if (status.limit >= 50) {
      tier = 'gold';
    } else if (status.limit >= 20) {
      tier = 'silver';
    }
    
    res.json({
      allowed: status.allowed,
      limit: status.limit,
      used: used,
      walletAddress,
      tier: tier
    });
  } catch (error) {
    logger.error('Error checking configuration status', error);
    res.status(500).json({ error: 'Failed to check configuration status' });
  }
});

/**
 * GET /api/configurations
 * Get all configurations for authenticated wallet
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.walletAddress) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const walletAddress = req.user.walletAddress;
    
    const configs = await getWalletConfigurations(walletAddress);
    
    res.json({
      configurations: configs,
      count: configs.length
    });
  } catch (error) {
    logger.error('Error getting wallet configurations', error);
    res.status(500).json({ error: 'Failed to get configurations' });
  }
});

/**
 * POST /api/configurations
 * Create a new configuration
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.walletAddress) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const walletAddress = req.user.walletAddress;
    const { name, description, configData, personalityMd } = req.body;
    
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
    
    if (personalityMd !== undefined) {
      if (personalityMd !== null && typeof personalityMd !== 'string') {
        return res.status(400).json({
          error: 'Personality markdown must be a string or null'
        });
      }
      // Validate personality markdown size (50KB max for gold tier)
      if (personalityMd) {
        const personalitySize = Buffer.byteLength(personalityMd, 'utf8');
        const maxPersonalitySize = 50 * 1024; // 50KB
        if (personalitySize > maxPersonalitySize) {
          return res.status(400).json({
            error: `Personality markdown exceeds maximum size of 50KB (current: ${(personalitySize / 1024).toFixed(1)}KB)`
          });
        }
      }
      updates.personalityMd = personalityMd;
    }
    
    // Save configuration
    const config = await saveConfiguration(walletAddress, name, configData, description, personalityMd);
    
    res.json({
      success: true,
      configuration: config
    });
  } catch (error) {
    logger.error('Error saving configuration', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to save configuration' });
  }
});

/**
 * GET /api/configurations/:id
 * Get configuration by ID
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.walletAddress) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const walletAddress = req.user.walletAddress;
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Configuration ID is required' });
    }
    
    const configs = await getWalletConfigurations(walletAddress);
    const config = configs.find((c: any) => c.id === id);
    
    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    res.json({
      configuration: config
    });
  } catch (error) {
    logger.error('Error getting configuration', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get configuration' });
  }
});

/**
 * PUT /api/configurations/:id
 * Update configuration by ID
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.walletAddress) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const walletAddress = req.user.walletAddress;
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Configuration ID is required' });
    }
    
    const { name, description, configData, personalityMd } = req.body;
    
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
    
    if (personalityMd !== undefined) {
      if (personalityMd !== null && typeof personalityMd !== 'string') {
        return res.status(400).json({
          error: 'Personality markdown must be a string or null'
        });
      }
      // Validate personality markdown size (50KB max for gold tier)
      if (personalityMd) {
        const personalitySize = Buffer.byteLength(personalityMd, 'utf8');
        const maxPersonalitySize = 50 * 1024; // 50KB
        if (personalitySize > maxPersonalitySize) {
          return res.status(400).json({
            error: `Personality markdown exceeds maximum size of 50KB (current: ${(personalitySize / 1024).toFixed(1)}KB)`
          });
        }
      }
      updates.personalityMd = personalityMd;
    }
    
    // Update configuration
    const config = await updateConfiguration(id, walletAddress, updates);
    
    res.json({
      success: true,
      configuration: config
    });
  } catch (error) {
    logger.error('Error updating configuration', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update configuration' });
  }
});

/**
 * DELETE /api/configurations/:id
 * Soft delete a configuration
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.walletAddress) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const walletAddress = req.user.walletAddress;
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Configuration ID is required' });
    }
    
    // Delete configuration
    await deleteConfiguration(id, walletAddress);
    
    // Get updated status
    const status = await canCreateConfiguration(walletAddress);
    
    logger.info('Configuration deleted', {
      walletAddress,
      configId: id
    });
    
    res.json({
      success: true,
      message: 'Configuration deleted',
      updatedStatus: status
    });
  } catch (error) {
    logger.error('Error deleting configuration', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete configuration' });
  }
});

/**
 * GET /api/configurations/:id/versions
 * Get version history for a configuration
 */
router.get('/:id/versions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.walletAddress) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const walletAddress = req.user.walletAddress;
    const configId = req.params.id;
    
    if (!configId) {
      return res.status(400).json({ error: 'Configuration ID is required' });
    }
    
    const configs: any = await getWalletConfigurations(walletAddress);
    const config = configs.find((c: any) => c.id === configId);
    
    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    const versions = await getConfigVersions(configId, walletAddress);
    const tier = await getUserTier(walletAddress);
    
    res.json({
      configId,
      currentVersion: config.version,
      tier,
      versions
    });
    
  } catch (error) {
    logger.error('Error getting versions', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get versions'
    });
  }
});

/**
 * GET /api/configurations/:id/versions/:ver
 * Get specific version details
 */
router.get('/:id/versions/:ver', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.walletAddress) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const walletAddress = req.user.walletAddress;
    const { id, ver } = req.params;
    
    if (!id || !ver) {
      return res.status(400).json({ error: 'Configuration ID and version are required' });
    }
    
    const versionNumber = parseInt(ver, 10);
    if (isNaN(versionNumber)) {
      return res.status(400).json({ error: 'Invalid version number' });
    }
    
    const versionDetails = await getVersionDetails(id, walletAddress, versionNumber);
    
    if (!versionDetails) {
      return res.status(404).json({ error: 'Version not found' });
    }
    
    res.json({
      versionDetails
    });
    
  } catch (error) {
    logger.error('Error getting version details', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get version details'
    });
  }
});

/**
 * POST /api/configurations/:id/rollback/:ver
 * Rollback to a specific version
 */
router.post('/:id/rollback/:ver', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.walletAddress) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const walletAddress = req.user.walletAddress;
    const { id, ver } = req.params;
    
    if (!id || !ver) {
      return res.status(400).json({ error: 'Configuration ID and version are required' });
    }
    
    const versionNumber = parseInt(ver, 10);
    if (isNaN(versionNumber)) {
      return res.status(400).json({ error: 'Invalid version number' });
    }
    
    const result = await rollbackToVersion(id, walletAddress, versionNumber);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to rollback' });
    }
    
    res.json({
      success: true,
      message: 'Configuration rolled back successfully',
      configuration: result.configuration
    });
    
  } catch (error) {
    logger.error('Error rolling back configuration', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to rollback configuration'
    });
  }
});

export { router as configurationRoutes };