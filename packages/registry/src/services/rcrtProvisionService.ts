import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

const RCRT_JWT_SECRET = process.env.RCRT_JWT_SECRET || 'rcrt-dev-secret-change-in-production';
const RCRT_JWT_EXPIRY_MINUTES = 15;

interface RCRTClaims {
  sub: string;      // rcrt-agent-id
  owner_id: string; // tenant/user ID
  roles: string[];
  iat: number;
  exp: number;
}

interface RCRTProvision {
  agentId: string;
  ownerId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
}

export class RCRTProvisionService {
  private refreshTokens = new Map<string, { ownerId: string; expiresAt: Date }>();

  async provisionRCRT(ownerId: string): Promise<RCRTProvision> {
    // Check user tier (Silver/Gold only) - Using raw query since User model doesn't exist
    // TODO: Add tier check when User model is available
    // const allowedTiers = ['silver', 'gold'];
    // if (!user?.tier || !allowedTiers.includes(user.tier.toLowerCase())) {
    //   throw new Error('RCRT is available to Silver and Gold tier users only');
    // }

    const agentId = `rcrt-${crypto.randomUUID()}`;
    const token = this.generateToken(agentId, ownerId);
    const refreshToken = crypto.randomUUID();

    // Store refresh token
    this.refreshTokens.set(refreshToken, {
      ownerId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    // Store provisioned agent
    await prisma.$executeRaw`
      INSERT INTO rcrt_agents (agent_id, owner_id, status, provisioned_at)
      VALUES (${agentId}, ${ownerId}, 'active', NOW())
      ON CONFLICT (agent_id) DO UPDATE SET status = 'active', provisioned_at = NOW()
    `;

    return {
      agentId,
      ownerId,
      token,
      refreshToken,
      expiresAt: new Date(Date.now() + RCRT_JWT_EXPIRY_MINUTES * 60 * 1000)
    };
  }

  private generateToken(agentId: string, ownerId: string): string {
    const payload = {
      sub: agentId,
      owner_id: ownerId,
      roles: ['curator'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (RCRT_JWT_EXPIRY_MINUTES * 60)
    };

    return jwt.sign(payload, RCRT_JWT_SECRET, { algorithm: 'RS256' });
  }

  async validateToken(token: string): Promise<RCRTClaims> {
    try {
      const decoded = jwt.verify(token, RCRT_JWT_SECRET) as RCRTClaims;
      
      // Check if agent still exists and is active
      const agent = await prisma.$queryRaw`
        SELECT * FROM rcrt_agents 
        WHERE agent_id = ${decoded.sub} 
        AND status = 'active'
      `;

      if (!agent || (Array.isArray(agent) && agent.length === 0)) {
        throw new Error('Agent not found or inactive');
      }

      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    const stored = this.refreshTokens.get(refreshToken);
    
    if (!stored) {
      throw new Error('Invalid refresh token');
    }

    if (stored.expiresAt < new Date()) {
      this.refreshTokens.delete(refreshToken);
      throw new Error('Refresh token expired');
    }

    // Generate new tokens
    const newToken = this.generateToken(`rcrt-${crypto.randomUUID()}`, stored.ownerId);
    const newRefreshToken = crypto.randomUUID();

    // Update refresh token
    this.refreshTokens.delete(refreshToken);
    this.refreshTokens.set(newRefreshToken, {
      ownerId: stored.ownerId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    return { token: newToken, refreshToken: newRefreshToken };
  }

  async revokeProvision(agentId: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE rcrt_agents 
      SET status = 'revoked' 
      WHERE agent_id = ${agentId}
    `;
  }

  async getStatus(ownerId: string): Promise<{ provisioned: boolean; agentId?: string; status?: string }> {
    const agent = await prisma.$queryRaw`
      SELECT agent_id, status FROM rcrt_agents 
      WHERE owner_id = ${ownerId} 
      AND status = 'active'
    `;

    if (!agent || (Array.isArray(agent) && agent.length === 0)) {
      return { provisioned: false };
    }

    const agentData = Array.isArray(agent) ? agent[0] : agent;
    return {
      provisioned: true,
      agentId: agentData.agent_id,
      status: agentData.status
    };
  }
}

export const rcrtProvisionService = new RCRTProvisionService();
