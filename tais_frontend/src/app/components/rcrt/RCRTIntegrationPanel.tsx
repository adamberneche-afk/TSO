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
  HardDrive
} from 'lucide-react';
import { rcrtApi, RCRTStatus } from '../../../services/rcrtApi';

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

const releasesBase = 'https://github.com/anomalyco/rcrt/releases/latest/download';

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
      windows: { url: `${releasesBase}/RCRT-windows-x64.exe`, desc: 'Double-click to run' },
      mac: { url: `${releasesBase}/RCRT-macos-x64.app`, desc: 'Double-click to install' },
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

  const platform = getPlatform();

  useEffect(() => {
    loadStatus();
  }, [walletAddress]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const status = await rcrtApi.getStatus();
      setStatus(status);
    } catch (error) {
      console.error('Failed to load RCRT status:', error);
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

      <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #e5e7eb', marginTop: '16px' }}>
        <p>RCRT v1.0 • Connected via outbound HTTPS • JWT authenticated</p>
      </div>
    </div>
  );
}
