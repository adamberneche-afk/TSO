import React, { useEffect, useState } from 'react';
import { loadUserProfile, profileExists } from '@think/profile-sdk';
import { UserProfile } from '@think/types';
import { InterviewConfig } from '@think/types';

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [walletAddress, setWalletAddress] = useState("0x742d...");

  useEffect(() => {
    const init = async () => {
      const hasProfile = await profileExists();
      if (hasProfile) {
        const data = await loadUserProfile();
        if (data) setProfile(data);
      }
    };
    init();

    return () => {
      if (window.taisAPI) window.taisAPI.cleanupSession();
    };
  }, []);

  const handleStartInterview = async () => {
    const config: InterviewConfig = { providerType: 'anthropic' };
    const result = await window.taisAPI.startInterview(config, walletAddress);
    if (!result.success) alert(result.message || result.error);
  };

  return (
    <div className="p-4 bg-gray-900 text-white">
      <h1>TAIS Integration Example</h1>

      {profile ? (
        <div>
          <h2>Welcome back!</h2>
          <p>Chain: {profile.technical.preferred_chains[0]}</p>
        </div>
      ) : (
        <div>
          <p>No profile found.</p>
          <button onClick={handleStartInterview} className="bg-blue-600 p-2 rounded">
            Start Interview
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
