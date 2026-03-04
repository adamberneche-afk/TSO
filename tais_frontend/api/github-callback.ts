// Vercel Serverless Function - GitHub OAuth Callback
// Exchange GitHub code for access token

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, walletAddress } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    // Exchange code for token via GitHub
    const clientId = process.env.VITE_GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'GitHub OAuth not configured' });
    }

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        state,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('GitHub token exchange failed:', error);
      return res.status(400).json({ error: 'Failed to exchange code for token' });
    }

    const data = await response.json();
    const accessToken = data.access_token;

    if (!accessToken) {
      return res.status(400).json({ error: 'No access token received' });
    }

    // In production, encrypt and store the token associated with the wallet
    // For now, return the token to the client (it will be stored locally)
    // TODO: Store encrypted token in database linked to wallet address

    return res.status(200).json({
      success: true,
      accessToken,
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
