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

  // Verify state to prevent CSRF
  // We expect the state to be the walletAddress (set by the frontend when initiating the OAuth)
  if (state !== walletAddress) {
    return res.status(400).json({ error: 'Invalid state' });
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

    // Store the encrypted token in the database linked to the wallet address
    const baseUrl = process.env.VITE_REGISTRY_URL || 'https://tso.onrender.com';
    const storageResponse = await fetch(`${baseUrl}/api/v1/github/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletAddress, accessToken, state }),
    });

    if (!storageResponse.ok) {
      const errorData = await storageResponse.json();
      console.error('Failed to store GitHub token:', errorData);
      // We still return the token to the client so they can use it locally
      // but we log the error
      return res.status(200).json({
        success: true,
        accessToken,
        warning: 'Failed to store token remotely, but token is available for local use',
      });
    }

    return res.status(200).json({
      success: true,
      accessToken,
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
