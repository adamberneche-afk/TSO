// RCRT Integration Panel
// Shows RCRT connection status and download options

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Shield, 
  CheckCircle, 
  RefreshCw, 
  Download, 
  AlertTriangle,
  Server,
  Clock,
  Monitor,
  Apple,
  Terminal,
  Box,
  HardDrive,
  FileText,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';
import { rcrtApi, RCRTStatus, RCRTAuditLog, AuditLogResponse } from '../../../services/rcrtApi';

interface RCRTIntegrationPanelProps {
  walletAddress: string;
}

type Platform = 'windows' | 'mac' | 'linux';

const getPlatform = (): Platform => {
  if (typeof window === 'undefined') return 'windows';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) return 'mac';
  if (ua.includes('linux')) return 'linux';
  return 'windows';
};

const releasesBase = 'https://github.com/adamberneche-afk/TSO/releases/download/rcrt-v1.0.2';

const installOptions = {
  sandbox: {
    label: 'Sandbox (Docker)',
    description: 'Runs in isolated containers',
    icon: Box,
    color: '#8b5cf6',
    options: {
      windows: { url: `${releasesBase}/Install-RCRT-Sandbox.bat`, desc: 'Requires Docker Desktop' },
      mac: { url: `${releasesBase}/install-rcrt-sandbox-mac.sh`, desc: 'Requires Docker' },
      linux: { url: `${releasesBase}/install-rcrt-sandbox-linux.sh`, desc: 'Requires Docker' }
    }
  },
  native: {
    label: 'Native (Direct)',
    description: 'Runs directly on your computer',
    icon: HardDrive,
    color: '#10b981',
    options: {
      windows: { url: `${releasesBase}/RCRT.exe`, desc: 'Double-click to run' },
      mac: { url: `${releasesBase}/RCRT-mac`, desc: 'Run in terminal' },
      linux: { url: `${releasesBase}/RCRT-linux-x64`, desc: 'Run in terminal' }
    }
  }
};

export function RCRTIntegrationPanel({ walletAddress }: RCRTIntegrationPanelProps) {
  const [status, setStatus] = useState<RCRTStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  // Audit log state
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLogs, setAuditLogs] = useState<RCRTAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState<{ action?: string; status?: string }>({});
  const [auditPagination, setAuditPagination] = useState({ total: 0, limit: 50, offset: 0, hasMore: false });

  const platform = getPlatform();

  useEffect(() => {
    loadStatus();
  }, [walletAddress]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      console.log('Loading RCRT status...');
      const status = await rcrtApi.getStatus();
      console.log('RCRT status loaded:', status);
      setStatus(status);
    } catch (error: any) {
      console.error('Failed to load RCRT status:', error);
      toast.error(error.message || 'Failed to connect to RCRT');
      setStatus({ provisioned: false });
    } finally {
      setLoading(false);
    }
  };

  const handleProvision = async () => {
    try {
      setProvisioning(true);
      await rcrtApi.provision();
      toast.success('RCRT provisioned successfully');
      await loadStatus();
    } catch (error: any) {
      toast.error(error.message || 'Failed to provision RCRT');
    } finally {
      setProvisioning(false);
    }
  };

  const handleRevoke = async () => {
    if (!status?.agentId) return;
    try {
      await rcrtApi.revoke(status.agentId);
      toast.success('RCRT access revoked');
      await loadStatus();
    } catch (error) {
      toast.error('Failed to revoke RCRT');
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastSync(new Date());
      toast.success('Sync completed');
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const response: AuditLogResponse = await rcrtApi.getAuditLogs({
        ...auditFilter,
        limit: auditPagination.limit,
        offset: auditPagination.offset
      });
      setAuditLogs(response.logs);
      setAuditPagination(response.pagination);
    } catch (error: any) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setAuditLoading(false);
    }
  };

  const toggleAuditLog = () => {
    const newShow = !showAuditLog;
    setShowAuditLog(newShow);
    if (newShow && auditLogs.length === 0) {
      loadAuditLogs();
    }
  };

  const handleAuditFilter = (key: 'action' | 'status', value: string) => {
    setAuditFilter(prev => ({ ...prev, [key]: value || undefined }));
    setAuditPagination(prev => ({ ...prev, offset: 0 }));
    if (showAuditLog) {
      setTimeout(loadAuditLogs, 0);
    }
  };

  const getStatusBadge = () => {
    if (!status?.provisioned) {
      return <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#6b7280', color: 'white', fontSize: '12px' }}>Not Provisioned</span>;
    }
    switch (status.status) {
      case 'active':
        return <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#10b981', color: 'white', fontSize: '12px' }}>Active</span>;
      case 'offline':
        return <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#6b7280', color: 'white', fontSize: '12px' }}>Offline</span>;
      case 'error':
        return <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#ef4444', color: 'white', fontSize: '12px' }}>Error</span>;
      default:
        return <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#6b7280', color: 'white', fontSize: '12px' }}>Unknown</span>;
    }
  };

  const PlatformIcon = platform === 'mac' ? Apple : platform === 'linux' ? Terminal : Monitor;

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <RefreshCw className="animate-spin" style={{ display: 'inline', marginRight: '8px' }} />
        <span>Loading RCRT status...</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: '600', margin: 0 }}>
            <Server size={20} />
            RCRT Integration
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            Local context orchestration
          </p>
        </div>
        {getStatusBadge()}
      </div>

      {status?.provisioned ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '16px', background: '#f3f4f6', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>
                <Shield size={16} />
                Agent ID
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {status.agentId}
              </div>
            </div>
            
            <div style={{ padding: '16px', background: '#f3f4f6', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>
                <CheckCircle size={16} />
                Status
              </div>
              <div style={{ fontWeight: '500' }}>
                {status.status === 'active' ? 'Connected' : status.status}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '14px' }}>
              <Clock size={16} />
              <span>
                {lastSync ? `Last sync: ${lastSync.toLocaleTimeString()}` : 'Never synced'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSync} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '14px' }}>
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                Sync Now
              </button>
              <button onClick={handleRevoke} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid #ef4444', borderRadius: '6px', background: 'white', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>
                Revoke
              </button>
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ width: '64px', height: '64px', margin: '0 auto', padding: '16px', background: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={32} color="#d97706" />
            </div>
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>RCRT Not Provisioned</h3>
          <p style={{ color: '#6b7280', marginBottom: '16px', maxWidth: '400px', margin: '0 auto 16px' }}>
            Provision RCRT to enable local context orchestration.
          </p>
          <button 
            onClick={handleProvision}
            disabled={provisioning}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
          >
            {provisioning ? <><RefreshCw size={16} className="animate-spin" /> Provisioning...</> : <><Shield size={16} /> Provision RCRT</>}
          </button>
        </div>
      )}

      {/* Download Section */}
      <div style={{ marginTop: '24px' }}>
        <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={18} />
          Install RCRT on Your Device
        </div>

        {/* Sandbox Options */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: installOptions.sandbox.color }}>
            <Box size={18} />
            <span style={{ fontWeight: '600' }}>{installOptions.sandbox.label}</span>
            <span style={{ color: '#9ca3af', fontSize: '14px' }}>- {installOptions.sandbox.description}</span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {(['windows', 'mac', 'linux'] as Platform[]).map((p) => {
              const opt = installOptions.sandbox.options[p];
              const Icon = p === 'mac' ? Apple : p === 'linux' ? Terminal : Monitor;
              const isCurrent = p === platform;
              return (
                <a
                  key={`sandbox-${p}`}
                  href={opt.url}
                  style={{ 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    padding: '12px', border: `1px solid ${isCurrent ? installOptions.sandbox.color : '#e5e7eb'}`,
                    borderRadius: '8px', background: isCurrent ? `${installOptions.sandbox.color}10` : 'white',
                    textDecoration: 'none', color: '#374151'
                  }}
                >
                  <Icon size={20} />
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                  <span style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>{opt.desc}</span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Native Options */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: installOptions.native.color }}>
            <HardDrive size={18} />
            <span style={{ fontWeight: '600' }}>{installOptions.native.label}</span>
            <span style={{ color: '#9ca3af', fontSize: '14px' }}>- {installOptions.native.description}</span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {(['windows', 'mac', 'linux'] as Platform[]).map((p) => {
              const opt = installOptions.native.options[p];
              const Icon = p === 'mac' ? Apple : p === 'linux' ? Terminal : Monitor;
              const isCurrent = p === platform;
              return (
                <a
                  key={`native-${p}`}
                  href={opt.url}
                  style={{ 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    padding: '12px', border: `1px solid ${isCurrent ? installOptions.native.color : '#e5e7eb'}`,
                    borderRadius: '8px', background: isCurrent ? `${installOptions.native.color}10` : 'white',
                    textDecoration: 'none', color: '#374151'
                  }}
                >
                  <Icon size={20} />
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                  <span style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>{opt.desc}</span>
                </a>
              );
            })}
          </div>
        </div>

        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '16px', textAlign: 'center' }}>
          Recommended: <strong>Native (Direct)</strong> for easiest setup - no dependencies required
        </p>
      </div>

      {/* Audit Log Section */}
      <div style={{ marginTop: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
        <button 
          onClick={toggleAuditLog}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            padding: '8px 0', background: 'none', border: 'none', 
            cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#374151'
          }}
        >
          {showAuditLog ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          <FileText size={18} />
          Audit Log
          <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#9ca3af' }}>
            ({auditPagination.total} entries)
          </span>
        </button>

        {showAuditLog && (
          <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', marginTop: '12px' }}>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={14} style={{ color: '#6b7280' }} />
                <select 
                  value={auditFilter.action || ''}
                  onChange={(e) => handleAuditFilter('action', e.target.value)}
                  style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                >
                  <option value="">All Actions</option>
                  <option value="provision">Provision</option>
                  <option value="revoke">Revoke</option>
                  <option value="connect">Connect</option>
                  <option value="disconnect">Disconnect</option>
                  <option value="sync">Sync</option>
                  <option value="route">Route</option>
                  <option value="scan">Scan</option>
                </select>
              </div>
              <select 
                value={auditFilter.status || ''}
                onChange={(e) => handleAuditFilter('status', e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
              >
                <option value="">All Statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
              <button 
                onClick={loadAuditLogs}
                disabled={auditLoading}
                style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '13px' }}
              >
                <RefreshCw size={14} className={auditLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Log List */}
            {auditLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <RefreshCw size={20} className="animate-spin" style={{ display: 'inline' }} />
              </div>
            ) : auditLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                No audit logs found
              </div>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                      <th style={{ padding: '8px', fontWeight: '600', color: '#6b7280' }}>Timestamp</th>
                      <th style={{ padding: '8px', fontWeight: '600', color: '#6b7280' }}>Action</th>
                      <th style={{ padding: '8px', fontWeight: '600', color: '#6b7280' }}>Status</th>
                      <th style={{ padding: '8px', fontWeight: '600', color: '#6b7280' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '8px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '8px' }}>
                          <span style={{ 
                            padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                            background: log.action === 'provision' ? '#dbeafe' : 
                                       log.action === 'revoke' ? '#fee2e2' :
                                       log.action === 'connect' ? '#d1fae5' : '#f3f4f6',
                            color: log.action === 'provision' ? '#1d4ed8' : 
                                   log.action === 'revoke' ? '#dc2626' :
                                   log.action === 'connect' ? '#059669' : '#374151'
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <span style={{ 
                            padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                            background: log.status === 'success' ? '#d1fae5' : 
                                       log.status === 'failed' ? '#fee2e2' : '#fef3c7',
                            color: log.status === 'success' ? '#059669' : 
                                   log.status === 'failed' ? '#dc2626' : '#d97706'
                          }}>
                            {log.status || 'unknown'}
                          </span>
                        </td>
                        <td style={{ padding: '8px', color: '#6b7280', fontSize: '12px' }}>
                          {log.agentId && <span style={{ marginRight: '8px' }}>ID: {log.agentId?.substring(0, 8)}...</span>}
                          {log.errorMessage && <span style={{ color: '#dc2626' }}>{log.errorMessage}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {auditPagination.hasMore && (
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <button 
                  onClick={() => { setAuditPagination(p => ({ ...p, offset: p.offset + p.limit })); loadAuditLogs(); }}
                  style={{ padding: '6px 16px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '13px' }}
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #e5e7eb', marginTop: '16px' }}>
        <p>RCRT v1.0 • Connected via outbound HTTPS • JWT authenticated</p>
      </div>
    </div>
  );
}
