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
    const state = params.get('state');
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
      setMessage('Exchanging code for token...');
      
      // Exchange code for real token via backend
      const response = await fetch('/api/github-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state, walletAddress: localStorage.getItem('pending_github_wallet') }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Token exchange failed');
      }

      const data = await response.json();
      const accessToken = data.accessToken;

      if (!accessToken) {
        throw new Error('No access token received');
      }

      // Store token with wallet association
      const walletAddress = localStorage.getItem('pending_github_wallet');
      if (walletAddress) {
        const encoded = btoa(accessToken + ':' + walletAddress);
        localStorage.setItem('github_token', encoded);
        localStorage.removeItem('pending_github_wallet');
      }
      
      setStatus('success');
      setMessage('GitHub connected successfully!');
      toast.success('GitHub connected!');
      
      setTimeout(() => {
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
