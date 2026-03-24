import React, { useEffect, useState } from 'react';
import { loadUserProfile, profileExists } from '@think/profile-sdk';
import { UserProfile } from '@think/types';
import { InterviewConfig } from '@think/types';

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [walletAddress, setWalletAddress] = useState("0x742d...");
  const [phase, setPhase] = useState(0); // 0: guardrails, 1: expertise, 2: values, 3: done
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [config, setConfig] = useState<any>({});
  const [values, setValues] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      if ((window as any).taisAPI && sessionId !== null) {
        (window as any).taisAPI.cleanupSession(sessionId);
      }
    };
  }, [sessionId]);

  const handleNextPhase = async () => {
    setError(null);
    setSuccess(null);
    try {
      if (phase === 0) {
        // Guardrails: just move to next phase
        setPhase(1);
        return;
      }
      if (phase === 1) {
        // Expertise: start interview
        const result = await window.taisAPI.startInterview(config, walletAddress);
        if (!result.success) {
          setError(result.message || result.error);
          return;
        }
        setSessionId(result.sessionId);
        setPhase(2);
        return;
      }
      if (phase === 2) {
        // Values: update the agent
        if (sessionId === null) {
          setError("No active session");
          return;
        }
        const result = await window.taisAPI.updateValues(sessionId, values);
        if (!result.success) {
          setError(result.message || result.error);
          return;
        }
        setPhase(3);
        setSuccess("Agent configured successfully!");
        return;
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    }
  };

  const handlePrevPhase = () => {
    setError(null);
    setSuccess(null);
    if (phase > 0) setPhase(phase - 1);
  };

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">TAIS Agent Configuration Wizard</h1>

      {error && (
        <div className="bg-red-600 p-3 rounded mb-4">
          <p className="text-red-100">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-600 p-3 rounded mb-4">
          <p className="text-green-100">{success}</p>
        </div>
      )}

      <div className="border rounded p-4 bg-gray-800">
        {/* Phase Indicator */}
        <div className="flex mb-4">
          <div className={`w-1/3 text-center ${phase >= 0 ? 'font-bold' : ''}`}>Guardrails</div>
          <div className={`w-1/3 text-center ${phase >= 1 ? 'font-bold' : ''}`}>Expertise</div>
          <div className={`w-1/3 text-center ${phase >= 2 ? 'font-bold' : ''}`}>Values</div>
        </div>
        <hr className="my-4" />

        {/* Phase Content */}
        {phase === 0 && (
          <div>
            <h2 className="text-xl mb-2">Phase 1: Guardrails</h2>
            <p className="mb-4">
              Set up the essential safety and compliance rules for your agent.
              These settings are required before proceeding.
            </p>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={true}
                  disabled
                />
                <span>Malicious skill detection (enabled)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={true}
                  disabled
                />
                <span>Rate limiting (enabled)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={true}
                  disabled
                />
                <span>Genesis NFT verification (required)</span>
              </label>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              These guardrails ensure your agent operates safely and within
              platform policies. They cannot be disabled.
            </p>
          </div>
        )}

        {phase === 1 && (
          <div>
            <h2 className="text-xl mb-2">Phase 2: Expertise</h2>
            <p className="mb-4">
              Choose your AI provider and configure the agent's knowledge and skills.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Provider</label>
                <select
                  value={config.providerType || ''}
                  onChange={(e) => {
                    setConfig((prev) => ({
                      ...prev,
                      providerType: e.target.value as 'local' | 'anthropic',
                    }));
                  }}
                  className="w-full p-2 border rounded bg-gray-700 text-white"
                >
                  <option value="">Select provider</option>
                  <option value="local">Local (LLM via Ollama/Llama.cpp)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                </select>
              </div>

              {config.providerType === 'anthropic' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Anthropic API Key</label>
                  <input
                    type="password"
                    value={config.anthropicApiKey || ''}
                    onChange={(e) => {
                      setConfig((prev) => ({
                        ...prev,
                        anthropicApiKey: e.target.value,
                      }));
                    }}
                    placeholder="sk-ant-..."
                    className="w-full p-2 border rounded bg-gray-700 text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <select
                  value={
                    config.providerType === 'local'
                      ? config.localModel
                      : config.anthropicModel
                  }
                  onChange={(e) => {
                    setConfig((prev) => {
                      if (prev.providerType === 'local') {
                        return { ...prev, localModel: e.target.value as string };
                      } else {
                        return { ...prev, anthropicModel: e.target.value as string };
                      }
                    });
                  }}
                  className="w-full p-2 border rounded bg-gray-700 text-white"
                >
                  {config.providerType === 'local' ? (
                    <>
                      <option value="">Select local model</option>
                      <option value="llama3:instruct">Llama 3 Instruct</option>
                      <option value="mistral:instruct">Mistral Instruct</option>
                      <option value="zephyr:7b-beta">Zephyr 7B Beta</option>
                    </>
                  ) : (
                    <>
                      <option value="">Select Anthropic model</option>
                      <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                      <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                      <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Local Provider URL (if applicable)</label>
                <input
                  type="text"
                  value={config.localProviderUrl || ''}
                  onChange={(e) => {
                    setConfig((prev) => ({
                      ...prev,
                      localProviderUrl: e.target.value,
                    }));
                  }}
                  placeholder="http://localhost:11434"
                  className="w-full p-2 border rounded bg-gray-700 text-white"
                  disabled={config.providerType !== 'local'}
                />
              </div>
            </div>
          </div>
        )}

        {phase === 2 && (
          <div>
            <h2 className="text-xl mb-2">Phase 3: Values</h2>
            <p className="mb-4">
              Shape your agent's personality, communication style, and preferences.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Primary Activity</label>
                <select
                  value={values.identity?.primary_activity || 'learning'}
                  onChange={(e) => {
                    setValues((prev) => ({
                      ...prev,
                      identity: {
                        ...(prev.identity || {}),
                        primary_activity: e.target.value as 'learning' | 'building' | 'trading' | 'investing',
                      },
                    }));
                  }}
                  className="w-full p-2 border rounded bg-gray-700 text-white"
                >
                  <option value="learning">Learning</option>
                  <option value="building">Building</option>
                  <option value="trading">Trading</option>
                  <option value="investing">Investing</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Experience Level</label>
                <select
                  value={values.identity?.experience_level || 'beginner'}
                  onChange={(e) => {
                    setValues((prev) => ({
                      ...prev,
                      identity: {
                        ...(prev.identity || {}),
                        experience_level: e.target.value as 'beginner' | 'intermediate' | 'expert',
                      },
                    }));
                  }}
                  className="w-full p-2 border rounded bg-gray-700 text-white"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Communication Tone</label>
                <select
                  value={values.communication?.tone || 'casual'}
                  onChange={(e) => {
                    setValues((prev) => ({
                      ...prev,
                      communication: {
                        ...(prev.communication || {}),
                        tone: e.target.value as 'technical' | 'casual' | 'professional',
                      },
                    }));
                  }}
                  className="w-full p-2 border rounded bg-gray-700 text-white"
                >
                  <option value="technical">Technical</option>
                  <option value="casual">Casual</option>
                  <option value="professional">Professional</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Verbosity</label>
                <select
                  value={values.communication?.verbosity || 'balanced'}
                  onChange={(e) => {
                    setValues((prev) => ({
                      ...prev,
                      communication: {
                        ...(prev.communication || {}),
                        verbosity: e.target.value as 'concise' | 'balanced' | 'detailed',
                      },
                    }));
                  }}
                  className="w-full p-2 border rounded bg-gray-700 text-white"
                >
                  <option value="concise">Concise</option>
                  <option value="balanced">Balanced</option>
                  <option value="detailed">Detailed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Theme</label>
                <select
                  value={values.preferences?.theme || 'dark'}
                  onChange={(e) => {
                    setValues((prev) => ({
                      ...prev,
                      preferences: {
                        ...(prev.preferences || {}),
                        theme: e.target.value as 'dark' | 'light' | 'auto',
                      },
                    }));
                  }}
                  className="w-full p-2 border rounded bg-gray-700 text-white"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="auto">Auto</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Default Currency</label>
                <select
                  value={values.preferences?.default_currency || 'USD'}
                  onChange={(e) => {
                    setValues((prev) => ({
                      ...prev,
                      preferences: {
                        ...(prev.preferences || {}),
                        default_currency: e.target.value as 'USD' | 'EUR' | 'ETH' | 'BTC',
                      },
                    }));
                  }}
                  className="w-full p-2 border rounded bg-gray-700 text-white"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="ETH">ETH</option>
                  <option value="BTC">BTC</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {phase === 3 && (
          <div>
            <h2 className="text-xl mb-2">Agent Ready!</h2>
            <p className="mb-4">
              Your agent has been configured with guardrails, expertise, and values.
              You can now start interacting with it.
            </p>
            {profile ? (
              <div className="bg-gray-700 p-3 rounded mb-4">
                <h3 className="font-semibold mb-2">Loaded Profile</h3>
                <p>Wallet: {profile.wallet_address}</p>
                <p>Experience: {profile.identity?.experience_level}</p>
              </div>
            ) : (
              <div className="bg-gray-700 p-3 rounded mb-4">
                <p>No existing profile found. The agent will create a new profile upon finalization.</p>
              </div>
            )}
            <div className="space-y-3">
              <button
                onClick={handleNextPhase}
                disabled={phase === 3}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
              >
                {phase === 3 ? 'Finish' : 'Next'}
              </button>
              {phase > 0 && (
                <button
                  onClick={handlePrevPhase}
                  className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition"
                >
                  Previous
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons (outside the card for full width) */}
      <div className="flex justify-between mt-6">
        {phase > 0 && (
          <button
            onClick={handlePrevPhase}
            className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded"
          >
            Previous
          </button>
        )}
        {phase < 3 && (
          <button
            onClick={handleNextPhase}
            disabled={error !== null}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default App;