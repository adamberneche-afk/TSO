import { PrismaClient } from '@prisma/client';
import { createSkillsPrismaClient } from '../config/database';

const prisma = createSkillsPrismaClient();

export type ContextType = 'private' | 'confidential' | 'shared' | 'public';

export interface Breadcrumb {
  id: string;
  ownerId: string;
  content: string;
  contextType: ContextType;
  sourceAppId?: string;
  createdAt: Date;
}

export interface App {
  appId: string;
  ownerId: string;
  name: string;
  connected: boolean;
}

export interface RoutingDecision {
  appId: string;
  decision: 'allow' | 'deny';
  reason: string;
}

export interface RoutingLogEntry {
  breadcrumbId: string;
  targetAppId: string;
  contextType: ContextType;
  decision: string;
  reason: string;
  timestamp: Date;
}

export class RoutingService {
  async routeBreadcrumb(
    breadcrumb: Breadcrumb,
    apps: App[],
    ownerId: string
  ): Promise<RoutingDecision[]> {
    const decisions: RoutingDecision[] = [];

    for (const app of apps) {
      const decision = await this.evaluateAccess(
        breadcrumb.contextType,
        app.appId,
        breadcrumb.sourceAppId,
        ownerId
      );

      decisions.push({
        appId: app.appId,
        decision: decision.allowed ? 'allow' : 'deny',
        reason: decision.reason
      });

      await this.logRoutingDecision({
        breadcrumbId: breadcrumb.id,
        targetAppId: app.appId,
        contextType: breadcrumb.contextType,
        decision: decision.allowed ? 'allow' : 'deny',
        reason: decision.reason,
        timestamp: new Date()
      });
    }

    return decisions;
  }

  private async evaluateAccess(
    contextType: ContextType,
    targetAppId: string,
    sourceAppId: string | undefined,
    ownerId: string
  ): Promise<{ allowed: boolean; reason: string }> {
    switch (contextType) {
      case 'private':
        return this.evaluatePrivateAccess(targetAppId, sourceAppId);

      case 'confidential':
        return this.evaluateConfidentialAccess(targetAppId, ownerId);

      case 'shared':
        return this.evaluateSharedAccess(targetAppId, sourceAppId, ownerId);

      case 'public':
        return this.evaluatePublicAccess(targetAppId, ownerId);

      default:
        return { allowed: false, reason: 'Unknown context type' };
    }
  }

  private async evaluatePrivateAccess(
    targetAppId: string,
    sourceAppId: string | undefined
  ): Promise<{ allowed: boolean; reason: string }> {
    if (targetAppId === sourceAppId) {
      return { allowed: true, reason: 'Private content routed to source app only' };
    }
    return { allowed: false, reason: 'Private content not shared with other apps' };
  }

  private async evaluateConfidentialAccess(
    targetAppId: string,
    ownerId: string
  ): Promise<{ allowed: boolean; reason: string }> {
    const grant = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM confidential_grants
      WHERE owner_id = ${ownerId}
      AND app_id = ${targetAppId}
      AND revoked_at IS NULL
      LIMIT 1
    `;

    if (grant && grant.length > 0) {
      return { allowed: true, reason: 'Confidential access granted' };
    }

    const hasKBAccess = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM kb_access_history
      WHERE app_id = ${targetAppId}
      AND revoked_at IS NULL
      LIMIT 1
    `;

    if (hasKBAccess && hasKBAccess.length > 0) {
      return { allowed: true, reason: 'App has KB access history' };
    }

    return { allowed: false, reason: 'No confidential grant for this app' };
  }

  private async evaluateSharedAccess(
    targetAppId: string,
    sourceAppId: string | undefined,
    ownerId: string
  ): Promise<{ allowed: boolean; reason: string }> {
    if (targetAppId === sourceAppId) {
      return { allowed: true, reason: 'Shared content routed to source app' };
    }

    const pathwayApps = await this.getPathwayApps(ownerId);
    if (pathwayApps.includes(targetAppId)) {
      return { allowed: true, reason: 'App is in user pathway' };
    }

    const hasKBAccess = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM kb_access_history
      WHERE app_id = ${targetAppId}
      AND revoked_at IS NULL
      LIMIT 1
    `;

    if (hasKBAccess && hasKBAccess.length > 0) {
      return { allowed: true, reason: 'App has KB access' };
    }

    return { allowed: false, reason: 'App not in pathway and no KB access' };
  }

  private async evaluatePublicAccess(
    targetAppId: string,
    _ownerId: string
  ): Promise<{ allowed: boolean; reason: string }> {
    return { allowed: true, reason: 'Public content accessible to all apps' };
  }

  private async getPathwayApps(ownerId: string): Promise<string[]> {
    const sessions = await prisma.$queryRaw<{ appId: string }[]>`
      SELECT DISTINCT "appId" FROM "AgentSession"
      WHERE "walletAddress" = ${ownerId}
      AND "endedAt" IS NULL
      ORDER BY "startedAt" DESC
      LIMIT 10
    `;

    return sessions.map(s => s.appId);
  }

  private async logRoutingDecision(log: RoutingLogEntry): Promise<void> {
    await prisma.$executeRaw`
      INSERT INTO routing_logs (breadcrumb_id, target_app_id, context_type, decision, reason, timestamp)
      VALUES (${log.breadcrumbId}, ${log.targetAppId}, ${log.contextType}, ${log.decision}, ${log.reason}, ${log.timestamp})
    `;
  }

  async getRoutingHistory(
    breadcrumbId?: string,
    appId?: string,
    limit: number = 100
  ): Promise<RoutingLogEntry[]> {
    let query = 'SELECT * FROM routing_logs WHERE 1=1';
    const params: any[] = [];

    if (breadcrumbId) {
      params.push(breadcrumbId);
      query += ` AND breadcrumb_id = $${params.length}`;
    }

    if (appId) {
      params.push(appId);
      query += ` AND target_app_id = $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY timestamp DESC LIMIT $${params.length}`;

    const result = await prisma.$queryRawUnsafe<RoutingLogEntry[]>(query, ...params);
    return result;
  }

  async getAppsForBreadcrumb(
    breadcrumb: Breadcrumb,
    connectedApps: App[]
  ): Promise<App[]> {
    const decisions = await this.routeBreadcrumb(breadcrumb, connectedApps, breadcrumb.ownerId);
    const allowedAppIds = decisions
      .filter(d => d.decision === 'allow')
      .map(d => d.appId);

    return connectedApps.filter(app => allowedAppIds.includes(app.appId));
  }
}

export const routingService = new RoutingService();
