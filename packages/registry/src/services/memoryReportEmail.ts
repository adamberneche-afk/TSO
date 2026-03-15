/**
 * Memory Report Email Service
 * Sends memory alignment reports to users
 */

import { PrismaClient } from '@prisma/client';
import { createSkillsPrismaClient } from '../config/database';

const prisma = createSkillsPrismaClient();

interface MemoryReportEmailData {
  alignmentIndex: number;
  driftScore: number;
  driftTrend: string;
  totalSessions: number;
  avgSessionDuration: number;
  messagesExchanged: number;
  memoriesCreated: number;
  memoriesPromoted: number;
  coreMemories: number;
  isFlagged: boolean;
  flagReason?: string;
  flagSeverity?: string;
}

interface MemoryReportPreferences {
  includeDriftStats: boolean;
  includeUsagePatterns: boolean;
  includeAppUsage: boolean;
  includeRagPools: boolean;
  includeAlignmentIndex: boolean;
}

function getDriftEmoji(score: number): string {
  if (score < 0.2) return '🟢';
  if (score < 0.4) return '🟡';
  if (score < 0.7) return '🟠';
  return '🔴';
}

function getAlignmentEmoji(index: number): string {
  if (index >= 70) return '🌟';
  if (index >= 50) return '✅';
  if (index >= 30) return '⚠️';
  return '❌';
}

function formatMemoryReportHtml(
  walletAddress: string,
  report: MemoryReportEmailData,
  prefs: MemoryReportPreferences
): string {
  const shortWallet = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  const date = new Date().toLocaleDateString();
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0A0A0B; color: #EDEDED; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #141415; border: 1px solid #262626; border-radius: 12px; padding: 24px; }
    .header { text-align: center; margin-bottom: 24px; }
    .header h1 { margin: 0; color: #3B82F6; }
    .wallet { color: #717171; font-size: 14px; margin-top: 4px; }
    .date { color: #717171; font-size: 12px; }
    
    .metric { background: #1A1A1B; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .metric-label { font-size: 12px; color: #717171; text-transform: uppercase; letter-spacing: 0.5px; }
    .metric-value { font-size: 24px; font-weight: bold; margin-top: 4px; }
    .metric-value.positive { color: #22C55E; }
    .metric-value.negative { color: #EF4444; }
    .metric-value.neutral { color: #EAB308; }
    
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .full { grid-column: span 2; }
    
    .flagged { background: #7F1D1D; border: 1px solid #DC2626; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .flagged-title { color: #FCA5A5; font-weight: bold; margin-bottom: 8px; }
    .flagged-content { color: #FECACA; font-size: 14px; }
    
    .footer { text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #262626; color: #717171; font-size: 12px; }
    .footer a { color: #3B82F6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧠 Memory Alignment Report</h1>
      <div class="wallet">${shortWallet}</div>
      <div class="date">${date}</div>
    </div>
`;

  if (report.isFlagged) {
    const flagMessages: Record<string, string> = {
      'high_drift': 'Your memory drift score is elevated. This may indicate growing misalignment between your agent\'s understanding and your goals.',
      'low_engagement': 'Your engagement has been low. Consider interacting more with your agent to maintain alignment.',
      'declining_alignment': 'Your alignment index has been declining. Review your agent\'s memories to ensure accuracy.',
      'very_low_alignment': 'Your alignment index is very low. Immediate attention recommended.',
    };
    
    html += `
    <div class="flagged">
      <div class="flagged-title">⚠️ Attention Required</div>
      <div class="flagged-content">${flagMessages[report.flagReason || 'high_drift']}</div>
    </div>
`;
  }

  if (prefs.includeAlignmentIndex) {
    const alignmentClass = report.alignmentIndex >= 50 ? 'positive' : (report.alignmentIndex >= 30 ? 'neutral' : 'negative');
    html += `
    <div class="metric">
      <div class="metric-label">Alignment Index ${getAlignmentEmoji(report.alignmentIndex)}</div>
      <div class="metric-value ${alignmentClass}">${report.alignmentIndex.toFixed(1)}/100</div>
    </div>
`;
  }

  if (prefs.includeDriftStats) {
    html += `
    <div class="grid">
      <div class="metric">
        <div class="metric-label">Drift Score ${getDriftEmoji(report.driftScore)}</div>
        <div class="metric-value">${(report.driftScore * 100).toFixed(0)}%</div>
      </div>
      <div class="metric">
        <div class="metric-label">Drift Trend</div>
        <div class="metric-value">${report.driftTrend}</div>
      </div>
    </div>
`;
  }

  if (prefs.includeUsagePatterns) {
    html += `
    <div class="grid">
      <div class="metric">
        <div class="metric-label">Sessions</div>
        <div class="metric-value">${report.totalSessions}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Messages</div>
        <div class="metric-value">${report.messagesExchanged}</div>
      </div>
      <div class="metric full">
        <div class="metric-label">Avg Session Duration</div>
        <div class="metric-value">${report.avgSessionDuration.toFixed(1)} min</div>
      </div>
    </div>
`;
  }

  if (prefs.includeAppUsage || prefs.includeRagPools) {
    html += `
    <div class="grid">
      <div class="metric">
        <div class="metric-label">Memories Created</div>
        <div class="metric-value">${report.memoriesCreated}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Core Memories</div>
        <div class="metric-value">${report.coreMemories}</div>
      </div>
    </div>
`;
  }

  html += `
    <div class="footer">
      <p>Manage your report preferences in the <a href="https://taisplatform.vercel.app">TAIS Platform</a></p>
      <p>This is an automated report. Your memories are stored locally and never shared.</p>
    </div>
  </div>
</body>
</html>
`;

  return html;
}

export async function sendMemoryReportEmail(
  walletAddress: string,
  report: MemoryReportEmailData,
  prefs: MemoryReportPreferences
): Promise<{ success: boolean; message: string }> {
  const sendGridApiKey = process.env.SENDGRID_API_KEY;
  
  if (!sendGridApiKey) {
    console.log(`[MemoryReport] Would send email to ${walletAddress.slice(0, 6)}... (SendGrid not configured)`);
    return { success: true, message: 'SendGrid not configured - logged only' };
  }

  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(sendGridApiKey);

  const html = formatMemoryReportEmail(walletAddress, report, prefs);
  
  const msg = {
    to: 'taisplatform@gmail.com',
    from: 'alerts@taisplatform.vercel.app',
    subject: `Memory Alignment Report - ${report.alignmentIndex.toFixed(1)}/100`,
    html,
  };

  try {
    await sgMail.send(msg);
    return { success: true, message: 'Email sent' };
  } catch (error: any) {
    console.error('[MemoryReport] SendGrid error:', error.response?.body || error.message);
    return { success: false, message: error.message };
  }
}

function formatMemoryReportEmail(
  walletAddress: string,
  report: MemoryReportEmailData,
  prefs: MemoryReportPreferences
): string {
  return formatMemoryReportHtml(walletAddress, report, prefs);
}

export async function getAdminAggregates(limit: number = 12) {
  return prisma.memoryReportAggregate.findMany({
    orderBy: { periodStart: 'desc' },
    take: limit,
  });
}
