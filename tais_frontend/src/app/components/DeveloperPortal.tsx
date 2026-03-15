// Developer Portal Component
// Cross-App Agent Portability - Phase 4: Developer Portal

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { oauthApi, OAuthApp, AppPermission } from '../../services/oauthApi';
import { authApi } from '../../services/authApi';

interface DeveloperPortalProps {
  onBack: () => void;
}

type WalletState = {
  connected: boolean;
  address: string | null;
};

export function DeveloperPortal({ onBack }: DeveloperPortalProps) {
  const [wallet, setWallet] = useState<WalletState>({ connected: false, address: null });
  const [activeTab, setActiveTab] = useState('apps');
  const [apps, setApps] = useState<OAuthApp[]>([]);
  const [permissions, setPermissions] = useState<AppPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  
  // Billing state
  const [billingSummary, setBillingSummary] = useState<any>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  // Activity state
  const [activities, setActivities] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  
  // Registration form state
  const [registerForm, setRegisterForm] = useState({
    appId: '',
    name: '',
    description: '',
    websiteUrl: '',
    redirectUris: '',
    developerEmail: '',
    developerName: '',
  });
  const [registering, setRegistering] = useState(false);
  const [registeredAppSecret, setRegisteredAppSecret] = useState<string | null>(null);

  // Sandbox state
  const [sandboxStatus, setSandboxStatus] = useState<any>(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [showSandboxDialog, setShowSandboxDialog] = useState(false);
  const [sandboxName, setSandboxName] = useState('');
  const [sandboxAppSecret, setSandboxAppSecret] = useState<string | null>(null);

  // Enterprise state
  const [organization, setOrganization] = useState<any>(null);
  const [orgLoading, setOrgLoading] = useState(false);
  const [showOrgDialog, setShowOrgDialog] = useState(false);
  const [orgForm, setOrgForm] = useState({
    name: '',
    approvedApps: '',
    blockedApps: '',
  });

  useEffect(() => {
    checkWalletConnection();
  }, []);

  useEffect(() => {
    if (wallet.connected && wallet.address) {
      loadApps();
      loadPermissions();
      loadBillingSummary();
      loadActivities();
      loadSandboxStatus();
      loadOrganization();
    }
  }, [wallet.connected, wallet.address]);

  const checkWalletConnection = async () => {
    const savedWallet = localStorage.getItem('wallet_address') || localStorage.getItem('walletAddress');
    if (savedWallet) {
      setWallet({ connected: true, address: savedWallet });
    }
  };

  const loadOrganization = async () => {
    if (!wallet.address) return;
    try {
      setOrgLoading(true);
      const result = await oauthApi.getOrganization(wallet.address);
      setOrganization(result);
      if (result) {
        setOrgForm({
          name: result.name,
          approvedApps: result.approvedApps?.join('\n') || '',
          blockedApps: result.blockedApps?.join('\n') || '',
        });
      }
    } catch (error) {
      console.error('Failed to load organization:', error);
    } finally {
      setOrgLoading(false);
    }
  };

  const handleUpdateOrg = async () => {
    if (!wallet.address) return;
    try {
      setOrgLoading(true);
      await oauthApi.upsertOrganization(
        wallet.address,
        orgForm.name,
        orgForm.approvedApps.split('\n').map(s => s.trim()).filter(Boolean),
        orgForm.blockedApps.split('\n').map(s => s.trim()).filter(Boolean)
      );
      toast.success('Organization updated');
      loadOrganization();
      setShowOrgDialog(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update organization');
    } finally {
      setOrgLoading(false);
    }
  };

  const loadApps = async () => {
    if (!wallet.address) return;
    try {
      setLoading(true);
      const appsList = await oauthApi.getApps(wallet.address);
      setApps(appsList);
    } catch (error) {
      console.error('Failed to load apps:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    if (!wallet.address) return;
    try {
      const perms = await oauthApi.getPermissions(wallet.address);
      setPermissions(perms);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const loadBillingSummary = async () => {
    if (!wallet.address) return;
    try {
      setBillingLoading(true);
      const summary = await oauthApi.getBillingSummary(wallet.address);
      setBillingSummary(summary);
    } catch (error) {
      console.error('Failed to load billing summary:', error);
    } finally {
      setBillingLoading(false);
    }
  };

  const loadActivities = async () => {
    if (!wallet.address) return;
    try {
      setActivityLoading(true);
      const result = await oauthApi.getActivityLog(wallet.address, 20);
      setActivities(result.activities || []);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setActivityLoading(false);
    }
  };

  const loadSandboxStatus = async () => {
    if (!wallet.address) return;
    try {
      const status = await oauthApi.getSandboxStatus(wallet.address);
      setSandboxStatus(status);
    } catch (error) {
      console.error('Failed to load sandbox status:', error);
    }
  };

  const handleCreateSandbox = async () => {
    if (!wallet.address || !sandboxName) {
      toast.error('Please enter a sandbox name');
      return;
    }
    try {
      setSandboxLoading(true);
      const result = await oauthApi.createSandbox(wallet.address, sandboxName);
      setSandboxAppSecret(result.app.appSecret);
      toast.success('Sandbox created!');
      loadSandboxStatus();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create sandbox');
    } finally {
      setSandboxLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        if (accounts.length > 0) {
          const address = accounts[0];
          localStorage.setItem('wallet_address', address);
          setWallet({ connected: true, address });
          toast.success('Wallet connected');
        }
      } catch (error) {
        toast.error('Failed to connect wallet');
      }
    } else {
      toast.error('MetaMask not installed');
    }
  };

  const handleRegisterApp = async () => {
    if (!wallet.address) {
      toast.error('Please connect your wallet first');
      return;
    }

    const redirectUrisArray = registerForm.redirectUris
      .split('\n')
      .map(uri => uri.trim())
      .filter(uri => uri.length > 0);

    if (redirectUrisArray.length === 0) {
      toast.error('At least one redirect URI is required');
      return;
    }

    try {
      setRegistering(true);
      
      // Sign registration challenge
      const challenge = `TAIS App Registration\n\nApp ID: ${registerForm.appId}\nApp Name: ${registerForm.name}\nWallet: ${wallet.address}\nTimestamp: ${Date.now()}`;
      
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [challenge, wallet.address],
      });

      const result = await oauthApi.registerApp(
        registerForm.appId,
        registerForm.name,
        redirectUrisArray,
        wallet.address,
        signature,
        {
          description: registerForm.description || undefined,
          websiteUrl: registerForm.websiteUrl || undefined,
          developerEmail: registerForm.developerEmail || undefined,
          developerName: registerForm.developerName || undefined,
        }
      );

      setRegisteredAppSecret(result.appSecret);
      toast.success('App registered successfully!');
      loadApps();
      
      // Reset form
      setRegisterForm({
        appId: '',
        name: '',
        description: '',
        websiteUrl: '',
        redirectUris: '',
        developerEmail: '',
        developerName: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to register app');
    } finally {
      setRegistering(false);
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'GOLD':
      case 'CERTIFIED':
        return 'bg-yellow-500';
      case 'VERIFIED':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Header */}
      <header className="border-b border-[#262626] bg-[#141415] p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="text-[#A1A1A1] hover:text-white"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold">Developer Portal</h1>
            <Badge variant="outline" className="ml-2">v3.0</Badge>
          </div>
          <div className="flex items-center gap-4">
            {!wallet.connected ? (
              <Button onClick={handleConnectWallet}>
                Connect Wallet
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {!wallet.connected ? (
          <Card className="bg-[#141415] border-[#262626] max-w-md mx-auto mt-20">
            <CardHeader>
              <CardTitle>Connect Your Wallet</CardTitle>
              <CardDescription>
                Connect your wallet to access the Developer Portal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleConnectWallet} className="w-full">
                Connect MetaMask
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-7 bg-[#141415]">
              <TabsTrigger value="apps">My Apps</TabsTrigger>
              <TabsTrigger value="sandbox">Sandbox</TabsTrigger>
              <TabsTrigger value="permissions">Authorized</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="enterprise">Enterprise</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="docs">Docs</TabsTrigger>
            </TabsList>

            {/* My Apps Tab */}
            <TabsContent value="apps" className="mt-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Registered Applications</h2>
                  <p className="text-[#A1A1A1]">
                    Manage your apps that integrate with TAIS agents
                  </p>
                </div>
                <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
                  <DialogTrigger asChild>
                    <Button>Register New App</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#141415] border-[#262626] max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Register New Application</DialogTitle>
                      <DialogDescription>
                        Create a new app to integrate TAIS agents
                      </DialogDescription>
                    </DialogHeader>
                    
                    {registeredAppSecret ? (
                      <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
                        <h4 className="font-semibold text-yellow-500 mb-2">
                          ⚠️ Save Your App Secret
                        </h4>
                        <p className="text-sm text-[#A1A1A1] mb-3">
                          This is the only time you'll see it. Store it securely!
                        </p>
                        <code className="block bg-black p-2 rounded text-xs font-mono break-all">
                          {registeredAppSecret}
                        </code>
                        <Button 
                          className="mt-4 w-full"
                          onClick={() => {
                            navigator.clipboard.writeText(registeredAppSecret);
                            toast.success('Copied to clipboard');
                          }}
                        >
                          Copy to Clipboard
                        </Button>
                        <Button 
                          variant="outline" 
                          className="mt-2 w-full"
                          onClick={() => {
                            setRegisteredAppSecret(null);
                            setShowRegisterDialog(false);
                          }}
                        >
                          I've Saved It
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="appId">App ID</Label>
                          <Input
                            id="appId"
                            value={registerForm.appId}
                            onChange={(e) => setRegisterForm({ ...registerForm, appId: e.target.value })}
                            placeholder="my-awesome-app"
                          />
                        </div>
                        <div>
                          <Label htmlFor="name">App Name</Label>
                          <Input
                            id="name"
                            value={registerForm.name}
                            onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                            placeholder="My Awesome App"
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={registerForm.description}
                            onChange={(e) => setRegisterForm({ ...registerForm, description: e.target.value })}
                            placeholder="What does your app do?"
                          />
                        </div>
                        <div>
                          <Label htmlFor="websiteUrl">Website URL</Label>
                          <Input
                            id="websiteUrl"
                            value={registerForm.websiteUrl}
                            onChange={(e) => setRegisterForm({ ...registerForm, websiteUrl: e.target.value })}
                            placeholder="https://myapp.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="redirectUris">Redirect URIs (one per line)</Label>
                          <Textarea
                            id="redirectUris"
                            value={registerForm.redirectUris}
                            onChange={(e) => setRegisterForm({ ...registerForm, redirectUris: e.target.value })}
                            placeholder="https://myapp.com/oauth/callback"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="developerName">Developer Name</Label>
                            <Input
                              id="developerName"
                              value={registerForm.developerName}
                              onChange={(e) => setRegisterForm({ ...registerForm, developerName: e.target.value })}
                              placeholder="John Doe"
                            />
                          </div>
                          <div>
                            <Label htmlFor="developerEmail">Developer Email</Label>
                            <Input
                              id="developerEmail"
                              type="email"
                              value={registerForm.developerEmail}
                              onChange={(e) => setRegisterForm({ ...registerForm, developerEmail: e.target.value })}
                              placeholder="john@example.com"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            variant="outline" 
                            onClick={() => setShowRegisterDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleRegisterApp}
                            disabled={registering || !registerForm.appId || !registerForm.name}
                          >
                            {registering ? 'Registering...' : 'Register App'}
                          </Button>
                        </DialogFooter>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>

              {loading ? (
                <div className="text-center py-10 text-[#A1A1A1]">
                  Loading apps...
                </div>
              ) : apps.length === 0 ? (
                <Card className="bg-[#141415] border-[#262626]">
                  <CardContent className="py-10 text-center">
                    <p className="text-[#A1A1A1] mb-4">No apps registered yet</p>
                    <Button onClick={() => setShowRegisterDialog(true)}>
                      Register Your First App
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {apps.map((app) => (
                    <Card key={app.appId} className="bg-[#141415] border-[#262626]">
                      <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {app.name}
                            <Badge className={getTierBadgeColor(app.tier)}>
                              {app.tier}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-[#A1A1A1]">
                            {app.description || app.appId}
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-4 text-sm">
                          <div>
                            <span className="text-[#A1A1A1]">App ID:</span>
                            <code className="ml-2 font-mono">{app.appId}</code>
                          </div>
                          {app.websiteUrl && (
                            <div>
                              <span className="text-[#A1A1A1]">Website:</span>
                              <a 
                                href={app.websiteUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="ml-2 text-blue-400 hover:underline"
                              >
                                {app.websiteUrl}
                              </a>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Sandbox Tab */}
            <TabsContent value="sandbox" className="mt-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold">Sandbox Environment</h2>
                <p className="text-[#A1A1A1]">
                  Test your integrations with sandbox apps and test tokens
                </p>
              </div>

              <div className="flex gap-4 mb-6">
                <Dialog open={showSandboxDialog} onOpenChange={setShowSandboxDialog}>
                  <DialogTrigger asChild>
                    <Button>Create Sandbox App</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#141415] border-[#262626] max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Create Sandbox App</DialogTitle>
                      <DialogDescription>
                        Create a test app for development and testing
                      </DialogDescription>
                    </DialogHeader>

                    {sandboxAppSecret ? (
                      <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
                        <h4 className="font-semibold text-yellow-500 mb-2">
                          Save Your Sandbox Secret
                        </h4>
                        <code className="block bg-black p-2 rounded text-xs font-mono break-all">
                          {sandboxAppSecret}
                        </code>
                        <Button 
                          className="mt-4 w-full"
                          onClick={() => {
                            navigator.clipboard.writeText(sandboxAppSecret);
                            toast.success('Copied!');
                          }}
                        >
                          Copy
                        </Button>
                        <Button 
                          variant="outline" 
                          className="mt-2 w-full"
                          onClick={() => {
                            setSandboxAppSecret(null);
                            setShowSandboxDialog(false);
                          }}
                        >
                          Done
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label>Sandbox Name</Label>
                          <Input
                            value={sandboxName}
                            onChange={(e) => setSandboxName(e.target.value)}
                            placeholder="My Test App"
                          />
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowSandboxDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreateSandbox} disabled={sandboxLoading || !sandboxName}>
                            {sandboxLoading ? 'Creating...' : 'Create Sandbox'}
                          </Button>
                        </DialogFooter>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>

              {sandboxStatus?.sandboxApps?.length > 0 ? (
                <div className="grid gap-4">
                  {sandboxStatus.sandboxApps.map((app: any) => (
                    <Card key={app.appId} className="bg-[#141415] border-[#262626]">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          {app.name}
                          <Badge className="bg-yellow-500">Sandbox</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-[#A1A1A1] mb-4">
                          <div>App ID: <code className="font-mono">{app.appId}</code></div>
                          <div>Created: {new Date(app.createdAt).toLocaleDateString()}</div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={async () => {
                            try {
                              const token = await oauthApi.generateSandboxToken(wallet.address!, app.appId);
                              await navigator.clipboard.writeText(token.access_token);
                              toast.success('Test token copied!');
                            } catch (error) {
                              toast.error('Failed to generate token');
                            }
                          }}
                        >
                          Generate Test Token
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-[#141415] border-[#262626]">
                  <CardContent className="py-10 text-center">
                    <p className="text-[#A1A1A1] mb-4">No sandbox apps yet</p>
                    <p className="text-sm text-[#717171]">
                      Create a sandbox to test your integration without affecting production
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card className="bg-[#141415] border-[#262626] mt-6">
                <CardHeader>
                  <CardTitle>Sandbox Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center p-3 bg-[#0A0A0B] rounded-lg">
                      <div className="font-bold text-green-500">60/min</div>
                      <div className="text-[#A1A1A1]">Rate Limit</div>
                    </div>
                    <div className="text-center p-3 bg-[#0A0A0B] rounded-lg">
                      <div className="font-bold text-blue-500">1,000</div>
                      <div className="text-[#A1A1A1]">Daily Requests</div>
                    </div>
                    <div className="text-center p-3 bg-[#0A0A0B] rounded-lg">
                      <div className="font-bold text-yellow-500">24h</div>
                      <div className="text-[#A1A1A1]">Token Validity</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Authorized Apps Tab */}
            <TabsContent value="permissions" className="mt-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold">Authorized Applications</h2>
                <p className="text-[#A1A1A1]">
                  Apps you've granted access to your TAIS agent
                </p>
              </div>

              {permissions.length === 0 ? (
                <Card className="bg-[#141415] border-[#262626]">
                  <CardContent className="py-10 text-center">
                    <p className="text-[#A1A1A1]">
                      No apps have been authorized yet
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {permissions.map((perm) => (
                    <Card key={`${perm.appId}-${perm.grantedAt}`} className="bg-[#141415] border-[#262626]">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          {perm.appName}
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={async () => {
                              try {
                                // For now, show info - actual revocation would need stored tokens
                                toast.info('Use the app to revoke access');
                              } catch (error) {
                                toast.error('Failed to revoke access');
                              }
                            }}
                          >
                            Revoke
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {perm.scopes.map((scope) => (
                            <Badge key={scope} variant="outline">
                              {scope}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-sm text-[#A1A1A1]">
                          <span>Granted: </span>
                          {new Date(perm.grantedAt).toLocaleDateString()}
                          <span className="mx-2">•</span>
                          <span>Expires: </span>
                          {new Date(perm.expiresAt).toLocaleDateString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold">Activity Log</h2>
                <p className="text-[#A1A1A1]">
                  View your recent app sessions and interactions
                </p>
              </div>

              {activityLoading ? (
                <div className="text-center py-10 text-[#A1A1A1]">
                  Loading activity...
                </div>
              ) : activities.length === 0 ? (
                <Card className="bg-[#141415] border-[#262626]">
                  <CardContent className="py-10 text-center">
                    <p className="text-[#A1A1A1]">
                      No recent activity
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity: any, index: number) => (
                    <Card key={index} className="bg-[#141415] border-[#262626]">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <div>
                              <div className="font-medium">{activity.appName || activity.appId}</div>
                              <div className="text-xs text-[#A1A1A1]">
                                {new Date(activity.startedAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline">{activity.type}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Enterprise Tab */}
            <TabsContent value="enterprise" className="mt-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Enterprise Controls</h2>
                  <p className="text-[#A1A1A1]">
                    Manage organization-wide policies and application whitelists
                  </p>
                </div>
                <Button onClick={() => setShowOrgDialog(true)}>
                  {organization ? 'Edit Organization' : 'Setup Organization'}
                </Button>
              </div>

              {orgLoading ? (
                <div className="text-center py-10 text-[#A1A1A1]">
                  Loading organization...
                </div>
              ) : organization ? (
                <div className="grid gap-6">
                  <Card className="bg-[#141415] border-[#262626]">
                    <CardHeader>
                      <CardTitle>{organization.name}</CardTitle>
                      <CardDescription>ID: {organization.orgId}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Approved Apps</Badge>
                          </h4>
                          <div className="space-y-1">
                            {organization.approvedApps?.length > 0 ? (
                              organization.approvedApps.map((appId: string) => (
                                <div key={appId} className="text-sm font-mono bg-black/30 p-1 px-2 rounded border border-[#262626]">
                                  {appId}
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-[#717171] italic">No apps whitelisted</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Blocked Apps</Badge>
                          </h4>
                          <div className="space-y-1">
                            {organization.blockedApps?.length > 0 ? (
                              organization.blockedApps.map((appId: string) => (
                                <div key={appId} className="text-sm font-mono bg-black/30 p-1 px-2 rounded border border-[#262626]">
                                  {appId}
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-[#717171] italic">No apps explicitly blocked</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-blue-900/10 border-blue-500/20">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold">Audit Logs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-[#A1A1A1] mb-4">
                        Organization-wide audit logs are available for all user-agent interactions.
                      </p>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('activity')}>
                        View Audit Log
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="bg-[#141415] border-[#262626]">
                  <CardContent className="py-10 text-center">
                    <p className="text-[#A1A1A1] mb-4">No organization configured</p>
                    <Button onClick={() => setShowOrgDialog(true)}>Create Organization</Button>
                  </CardContent>
                </Card>
              )}

              <Dialog open={showOrgDialog} onOpenChange={setShowOrgDialog}>
                <DialogContent className="bg-[#141415] border-[#262626] max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{organization ? 'Edit Organization' : 'Create Organization'}</DialogTitle>
                    <DialogDescription>
                      Define policies for all agents in your organization
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Organization Name</Label>
                      <Input 
                        value={orgForm.name}
                        onChange={e => setOrgForm({...orgForm, name: e.target.value})}
                        placeholder="Acme Corp"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Whitelisted App IDs (one per line)</Label>
                      <Textarea 
                        value={orgForm.approvedApps}
                        onChange={e => setOrgForm({...orgForm, approvedApps: e.target.value})}
                        placeholder="notion-integration&#10;slack-integration"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Blocked App IDs (one per line)</Label>
                      <Textarea 
                        value={orgForm.blockedApps}
                        onChange={e => setOrgForm({...orgForm, blockedApps: e.target.value})}
                        placeholder="untrusted-app"
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowOrgDialog(false)}>Cancel</Button>
                    <Button onClick={handleUpdateOrg} disabled={orgLoading || !orgForm.name}>
                      {orgLoading ? 'Saving...' : 'Save Organization'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value="billing" className="mt-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold">Billing & Usage</h2>
                <p className="text-[#A1A1A1]">
                  Track your agent interactions and manage billing
                </p>
              </div>

              {billingLoading ? (
                <div className="text-center py-10 text-[#A1A1A1]">
                  Loading billing info...
                </div>
              ) : billingSummary ? (
                <div className="grid gap-6">
                  {/* Plan Card */}
                  <Card className="bg-[#141415] border-[#262626]">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Current Plan
                        <Badge className={
                          billingSummary.tier === 'gold' ? 'bg-yellow-500' :
                          billingSummary.tier === 'silver' ? 'bg-blue-500' : 'bg-gray-500'
                        }>
                          {billingSummary.plan}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-[#0A0A0B] rounded-lg">
                          <div className="text-2xl font-bold">{billingSummary.limits.free.toLocaleString()}</div>
                          <div className="text-xs text-[#A1A1A1] uppercase">Free/Month</div>
                        </div>
                        <div className="text-center p-4 bg-[#0A0A0B] rounded-lg">
                          <div className="text-2xl font-bold">{billingSummary.usage.thisMonth.interactions.toLocaleString()}</div>
                          <div className="text-xs text-[#A1A1A1] uppercase">This Month</div>
                        </div>
                        <div className="text-center p-4 bg-[#0A0A0B] rounded-lg">
                          <div className="text-2xl font-bold">${billingSummary.usage.thisMonth.cost.toFixed(2)}</div>
                          <div className="text-xs text-[#A1A1A1] uppercase">Est. Cost</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Usage Progress */}
                  <Card className="bg-[#141415] border-[#262626]">
                    <CardHeader>
                      <CardTitle>Monthly Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>{billingSummary.usage.thisMonth.interactions} / {billingSummary.usage.thisMonth.limit} interactions</span>
                        <span>{billingSummary.usage.thisMonth.percentUsed}%</span>
                      </div>
                      <div className="w-full bg-[#0A0A0B] rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            billingSummary.usage.thisMonth.percentUsed > 90 ? 'bg-red-500' :
                            billingSummary.usage.thisMonth.percentUsed > 70 ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(billingSummary.usage.thisMonth.percentUsed, 100)}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* All Time Stats */}
                  <Card className="bg-[#141415] border-[#262626]">
                    <CardHeader>
                      <CardTitle>All-Time Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-2xl font-bold">{billingSummary.usage.allTime.interactions.toLocaleString()}</div>
                          <div className="text-xs text-[#A1A1A1] uppercase">Total Interactions</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{billingSummary.apps}</div>
                          <div className="text-xs text-[#A1A1A1] uppercase">Registered Apps</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pricing Info */}
                  <Card className="bg-[#141415] border-[#262626]">
                    <CardHeader>
                      <CardTitle>Pricing</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <table className="w-full text-sm">
                        <tbody>
                          <tr className="border-b border-[#262626]">
                            <td className="py-2">Free Tier</td>
                            <td className="py-2 text-right">{billingSummary.limits.free.toLocaleString()} interactions/month</td>
                          </tr>
                          <tr className="border-b border-[#262626]">
                            <td className="py-2">Verified Tier</td>
                            <td className="py-2 text-right">{billingSummary.limits.verified.toLocaleString()} interactions/month</td>
                          </tr>
                          <tr className="border-b border-[#262626]">
                            <td className="py-2">Gold Tier</td>
                            <td className="py-2 text-right">Unlimited</td>
                          </tr>
                          <tr>
                            <td className="py-2 font-bold">Overage Rate</td>
                            <td className="py-2 text-right font-bold">${billingSummary.pricing.per1kInteractions}/1k interactions</td>
                          </tr>
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="bg-[#141415] border-[#262626]">
                  <CardContent className="py-10 text-center">
                    <p className="text-[#A1A1A1]">
                      Connect your wallet to view billing information
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Documentation Tab */}
            <TabsContent value="docs" className="mt-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold">SDK Documentation</h2>
                <p className="text-[#A1A1A1]">
                  Integrate TAIS agents into your applications
                </p>
              </div>

              <div className="grid gap-6">
                <Card className="bg-[#141415] border-[#262626]">
                  <CardHeader>
                    <CardTitle>Installation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-black p-4 rounded-lg overflow-x-auto">
                      <code className="text-sm">
{`npm install tais-agent-sdk
# or
yarn add tais-agent-sdk`}
                      </code>
                    </pre>
                  </CardContent>
                </Card>

                <Card className="bg-[#141415] border-[#262626]">
                  <CardHeader>
                    <CardTitle>Quick Start</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-black p-4 rounded-lg overflow-x-auto text-sm">
                      <code className="text-sm">
{`import { TAISAgent } from 'tais-agent-sdk';

const tais = new TAISAgent({
  appId: 'your-app-id',
  appSecret: 'your-app-secret',
  appName: 'My App',
  redirectUri: 'https://myapp.com/tais/callback',
});

// Get authorization URL
const authUrl = tais.getAuthorizationUrl({
  scopes: ['agent:identity:read', 'agent:memory:read'],
  state: 'optional-csrf-token',
});

// Exchange code for tokens
const tokens = await tais.exchangeCode('code-from-callback');

// Get agent context
const context = await tais.getContext();

// Chat with agent
const response = await tais.chat({
  context,
  messages: [{ role: 'user', content: 'Hello!' }],
});`}
                      </code>
                    </pre>
                  </CardContent>
                </Card>

                <Card className="bg-[#141415] border-[#262626]">
                  <CardHeader>
                    <CardTitle>Available Scopes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#262626]">
                          <th className="text-left py-2">Scope</th>
                          <th className="text-left py-2">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-[#262626]">
                          <td className="py-2 font-mono text-blue-400">agent:identity:read</td>
                          <td className="py-2">Read SOUL.md and PROFILE.md</td>
                        </tr>
                        <tr className="border-b border-[#262626]">
                          <td className="py-2 font-mono text-blue-400">agent:memory:read</td>
                          <td className="py-2">Read MEMORY.md</td>
                        </tr>
                        <tr className="border-b border-[#262626]">
                          <td className="py-2 font-mono text-blue-400">agent:memory:write</td>
                          <td className="py-2">Write to MEMORY.md</td>
                        </tr>
                        <tr className="border-b border-[#262626]">
                          <td className="py-2 font-mono text-blue-400">agent:config:read</td>
                          <td className="py-2">Read agent.json constraints</td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <Card className="bg-[#141415] border-[#262626]">
                  <CardHeader>
                    <CardTitle>Session Handoff</CardTitle>
                    <CardDescription>
                      Continue conversations across apps
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-black p-4 rounded-lg overflow-x-auto text-sm">
                      <code className="text-sm">
{`// In App A (Notion)
const response1 = await tais.chat({
  context,
  messages: [{ role: 'user', content: 'Plan Q2 roadmap' }],
});
const sessionId = response1.sessionId;

// Later in App B (Slack)
const response2 = await tais.chat({
  context,
  messages: [{ role: 'user', content: 'Create tasks for this' }],
  parentSession: sessionId, // Continues context
});`}
                      </code>
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
