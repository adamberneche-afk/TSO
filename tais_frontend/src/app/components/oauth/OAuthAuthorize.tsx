// OAuth Authorization Page
// User-facing screen to approve/deny app access

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Check, X, AlertTriangle } from 'lucide-react';
import { oauthApi } from '../../../services/oauthApi';
import { authApi } from '../../../services/authApi';

interface OAuthAuthorizeProps {
  onComplete: (redirectUri?: string) => void;
}

export function OAuthAuthorize({ onComplete }: OAuthAuthorizeProps) {
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [authData, setAuthData] = useState<any>(null);
  const [wallet, setWallet] = useState<string | null>(null);

  useEffect(() => {
    loadAuthRequest();
  }, []);

  const loadAuthRequest = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const appId = params.get('app_id');
      const scopes = params.get('scopes')?.split(',') || [];
      const redirectUri = params.get('redirect_uri');
      const state = params.get('state');
      const walletParam = params.get('wallet');

      if (!appId || !redirectUri || !walletParam) {
        toast.error('Invalid authorization request');
        setLoading(false);
        return;
      }

      setWallet(walletParam);

      // In a real flow, this would call GET /oauth/authorize to get app info
      // For now, we'll mock the app info or fetch it if possible
      const apps = await oauthApi.getApps(walletParam);
      const app = apps.find(a => a.appId === appId);

      setAuthData({
        appId,
        appName: app?.name || appId,
        scopes,
        redirectUri,
        state,
        iconUrl: app?.iconUrl
      });
    } catch (error) {
      console.error('Failed to load auth request:', error);
      toast.error('Failed to load application details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!wallet || !authData) return;

    try {
      setApproving(true);
      
      // 1. Get authorization ID from backend (starts the flow)
      const authUrl = oauthApi.getAuthorizationUrl(
        authData.appId,
        authData.scopes,
        authData.redirectUri,
        wallet,
        authData.state
      );
      
      const response = await fetch(authUrl);
      const { authorizationId } = await response.json();

      // 2. Sign the challenge
      const challenge = `TAIS OAuth Authorization\n\nApp: ${authData.appId}\nScopes: ${authData.scopes.join(', ')}\nWallet: ${wallet}\nNonce: ${authorizationId}`;
      
      if (!window.ethereum) throw new Error('MetaMask not found');
      
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [challenge, wallet],
      });

      // 3. Send approval to backend
      const result = await oauthApi.approveAuthorization(authorizationId, wallet, signature);
      
      toast.success('Access granted!');
      
      // 4. Redirect back to app
      if (result.redirectUri) {
        window.location.href = result.redirectUri;
      } else {
        onComplete();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve access');
    } finally {
      setApproving(false);
    }
  };

  const handleDeny = () => {
    if (authData?.redirectUri) {
      const params = new URLSearchParams({
        error: 'access_denied',
        state: authData.state || ''
      });
      window.location.href = `${authData.redirectUri}?${params.toString()}`;
    } else {
      onComplete();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading request...</div>
      </div>
    );
  }

  if (!authData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
        <Card className="bg-[#141415] border-[#262626] max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center justify-center gap-2">
              <AlertTriangle />
              Invalid Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#A1A1A1]">The authorization request is missing required parameters or is invalid.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => onComplete()} className="w-full">Back to TAIS</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <Card className="bg-[#141415] border-[#262626] w-full max-w-md animate-in fade-in zoom-in duration-300">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-[#0A0A0B] border border-[#262626] rounded-xl flex items-center justify-center mx-auto mb-4">
            {authData.iconUrl ? (
              <img src={authData.iconUrl} alt={authData.appName} className="w-10 h-10 rounded" />
            ) : (
              <Shield className="w-8 h-8 text-blue-500" />
            )}
          </div>
          <CardTitle className="text-xl">Authorize {authData.appName}</CardTitle>
          <CardDescription>
            This application wants to access your TAIS agent
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-black/40 border border-[#262626] rounded-lg p-4">
            <h4 className="text-xs uppercase tracking-widest text-[#717171] font-bold mb-3">Requested Scopes</h4>
            <div className="space-y-3">
              {authData.scopes.map((scope: string) => (
                <div key={scope} className="flex items-start gap-2">
                  <div className="mt-0.5"><Check className="w-3.5 h-3.5 text-green-500" /></div>
                  <div>
                    <div className="text-sm font-medium">{scope.replace('agent:', '').replace(/:/g, ' ')}</div>
                    <div className="text-[10px] text-[#A1A1A1] uppercase tracking-tight">
                      {scope}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-[#717171] uppercase tracking-widest text-center">
            Authenticated as <span className="text-white">{wallet?.slice(0, 6)}...{wallet?.slice(-4)}</span>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button 
            onClick={handleApprove} 
            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-bold"
            disabled={approving}
          >
            {approving ? 'Approving...' : 'Approve Access'}
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleDeny}
            className="w-full text-[#717171] hover:text-white"
            disabled={approving}
          >
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
