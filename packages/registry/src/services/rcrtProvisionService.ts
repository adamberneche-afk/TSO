import jwt from 'jsonwebtoken';

const RCRT_JWT_SECRET = process.env.RCRT_JWT_SECRET || 'rcrt-dev-secret-change-in-production';
const RCRT_JWT_EXPIRY_MINUTES = 15;

interface RCRTClaims {
  sub: string;
  owner_id: string;
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
  private provisionedAgents = new Map<string, { agentId: string; ownerId: string; status: string }>();

  async provisionRCRT(ownerId: string): Promise<RCRTProvision> {
    const agentId = `rcrt-${crypto.randomUUID()}`;
    const token = this.generateToken(agentId, ownerId);
    const refreshToken = crypto.randomUUID();

    this.refreshTokens.set(refreshToken, {
      ownerId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    this.provisionedAgents.set(ownerId, { agentId, ownerId, status: 'active' });

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

    const newToken = this.generateToken(`rcrt-${crypto.randomUUID()}`, stored.ownerId);
    const newRefreshToken = crypto.randomUUID();

    this.refreshTokens.delete(refreshToken);
    this.refreshTokens.set(newRefreshToken, {
      ownerId: stored.ownerId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    return { token: newToken, refreshToken: newRefreshToken };
  }

  async revokeProvision(agentId: string): Promise<void> {
    for (const [ownerId, agent] of this.provisionedAgents.entries()) {
      if (agent.agentId === agentId) {
        agent.status = 'revoked';
        this.provisionedAgents.set(ownerId, agent);
        break;
      }
    }
  }

  async getStatus(ownerId: string): Promise<{ provisioned: boolean; agentId?: string; status?: string }> {
    const agent = this.provisionedAgents.get(ownerId);
    if (!agent || agent.status !== 'active') {
      return { provisioned: false };
    }
    return {
      provisioned: true,
      agentId: agent.agentId,
      status: agent.status
    };
  }
}

export const rcrtProvisionService = new RCRTProvisionService();
