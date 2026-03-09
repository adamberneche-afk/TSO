// App Access Management Panel
// Manage confidential grants for connected apps

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  AppWindow, 
  Check, 
  X, 
  Shield, 
  RefreshCw,
  KeyRound,
  Trash2
} from 'lucide-react';
import { grantApi, ConfidentialGrant } from '../../../services/rcrtApi';
import { oauthApi, OAuthApp } from '../../../services/oauthApi';

interface AppAccessPanelProps {
  walletAddress: string;
}

export function AppAccessPanel({ walletAddress }: AppAccessPanelProps) {
  const [grants, setGrants] = useState<ConfidentialGrant[]>([]);
  const [availableApps, setAvailableApps] = useState<OAuthApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [walletAddress]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [grantsResult, appsResult] = await Promise.all([
        grantApi.getConfidentialGrants(),
        oauthApi.getApps(walletAddress).catch(() => [])
      ]);
      
      setGrants(grantsResult.grants || []);
      setAvailableApps(appsResult || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGrant = async (appId: string) => {
    try {
      setSaving(appId);
      await grantApi.addConfidentialGrant(appId);
      await loadData();
      toast.success('Confidential access granted');
    } catch (error) {
      toast.error('Failed to grant access');
    } finally {
      setSaving(null);
    }
  };

  const handleRevoke = async (appId: string) => {
    try {
      setSaving(appId);
      await grantApi.revokeConfidentialGrant(appId);
      await loadData();
      toast.success('Confidential access revoked');
    } catch (error) {
      toast.error('Failed to revoke access');
    } finally {
      setSaving(null);
    }
  };

  const isGranted = (appId: string) => {
    return grants.some(g => g.appId === appId && !g.revokedAt);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const grantedApps = availableApps.filter(app => isGranted(app.appId));
  const availableToGrant = availableApps.filter(app => !isGranted(app.appId));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          App Access Management
        </h3>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Granted Apps */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Confidential Access Granted
        </h4>
        
        {grantedApps.length === 0 ? (
          <div className="p-4 border-2 border-dashed rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              No apps have confidential access
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {grantedApps.map((app) => (
              <div 
                key={app.appId}
                className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-950"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded">
                    <AppWindow className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium">{app.name || app.appId}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {app.appId}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRevoke(app.appId)}
                  disabled={saving === app.appId}
                  className="text-red-500 hover:text-red-600"
                >
                  <X className="h-4 w-4 mr-1" />
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Apps */}
      {availableToGrant.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <AppWindow className="h-4 w-4" />
            Available Apps
          </h4>
          
          <div className="space-y-2">
            {availableToGrant.map((app) => (
              <div 
                key={app.appId}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded">
                    <AppWindow className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">{app.name || app.appId}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {app.appId}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGrant(app.appId)}
                  disabled={saving === app.appId}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Grant
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {availableApps.length === 0 && (
        <div className="p-4 border-2 border-dashed rounded-lg text-center">
          <AppWindow className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No connected apps</p>
          <p className="text-sm text-muted-foreground mt-1">
            Connect apps to manage their access to confidential content
          </p>
        </div>
      )}
    </div>
  );
}

function Button({ variant = "default", size = "default", className = "", children, disabled, ...props }: any) {
  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input bg-background hover:bg-accent",
    ghost: "hover:bg-accent",
    link: "text-primary underline-offset-4 hover:underline"
  };
  
  const sizeClasses = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10"
  };
  
  return (
    <button 
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium ${variantClasses[variant as keyof typeof variantClasses] || variantClasses.default} ${sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.default} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
