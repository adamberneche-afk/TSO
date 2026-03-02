import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface GitHubOAuthCallbackProps {
  onSuccess?: () => void;
}

export function GitHubOAuthCallback({ onSuccess }: GitHubOAuthCallbackProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting to GitHub...');

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      setStatus('error');
      setMessage('GitHub authorization was denied');
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('No authorization code received');
      return;
    }

    try {
      // Store wallet address for token association
      const walletAddress = localStorage.getItem('pending_github_wallet');
      
      // TODO: Exchange code for token via backend
      // In production: POST /api/v1/auth/github/callback { code, walletAddress }
      // Backend returns encrypted token
      
      // Demo: simulate token (in production, token comes from backend)
      const demoToken = 'ghp_demo_' + Date.now();
      
      // Store encrypted token
      if (walletAddress) {
        // Simple encoding (in production, use proper encryption)
        const encoded = btoa(demoToken + ':' + walletAddress);
        localStorage.setItem('github_token', encoded);
        localStorage.removeItem('pending_github_wallet');
      }
      
      setStatus('success');
      setMessage('GitHub connected successfully!');
      toast.success('GitHub connected!');
      
      setTimeout(() => {
        // Close popup or redirect
        if (window.opener) {
          window.opener.location.reload();
          window.close();
        }
        if (onSuccess) onSuccess();
      }, 1500);
      
    } catch (err) {
      console.error('OAuth callback error:', err);
      setStatus('error');
      setMessage('Failed to complete GitHub authorization');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <Card className="bg-[#141415] border-[#262626] w-full max-w-md">
        <CardHeader className="text-center">
          {status === 'loading' && <Loader2 className="w-12 h-12 animate-spin text-[#3B82F6] mx-auto" />}
          {status === 'success' && <CheckCircle className="w-12 h-12 text-[#10B981] mx-auto" />}
          {status === 'error' && <XCircle className="w-12 h-12 text-[#EF4444] mx-auto" />}
          
          <CardTitle className="text-xl mt-4 text-white">
            {status === 'loading' && 'Connecting to GitHub'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Connection Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-[#A1A1A1]">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default GitHubOAuthCallback;
