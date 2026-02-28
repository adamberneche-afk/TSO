// TAIS Platform - Main Application

import React, { useState, lazy, Suspense } from 'react';
import { LandingPage } from './components/LandingPage';
import { GuidedDiscoveryWizard } from './components/interview/GuidedDiscoveryWizard';
import { Dashboard } from './components/Dashboard';
import { LLMSettingsPanel } from './components/llm/LLMSettings';
import { GoldTierDashboard } from './components/GoldTierDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { useInterviewStore } from '../hooks/useInterview';
import { GuidedDiscoveryDoc, NFTIntegrationDoc, ConfigurationDoc, SkillsRegistryDoc } from './docs';
import { OAuthAuthorize } from './components/oauth/OAuthAuthorize';

const PublicRAGManager = lazy(() => import('./components/rag/PublicRAGManager').then(m => ({ default: m.PublicRAGManager })));
const PrivateRAGManager = lazy(() => import('./components/rag/PrivateRAGManager').then(m => ({ default: m.PrivateRAGManager })));
const DynamicConversationContainer = lazy(() => import('./components/conversation/DynamicConversationContainer').then(m => ({ default: m.DynamicConversationContainer })));
const MemoryArchivePage = lazy(() => import('./components/memory/MemoryArchivePage').then(m => ({ default: m.MemoryArchivePage })));
const DeveloperPortal = lazy(() => import('./components/DeveloperPortal').then(m => ({ default: m.DeveloperPortal })));

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}

type View = 'landing' | 'interview' | 'dashboard' | 'publicRAG' | 'privateRAG' | 'conversation' | 'llmSettings' | 'doc-guided-discovery' | 'doc-nft-integration' | 'doc-configuration' | 'doc-skills-registry' | 'goldTier' | 'memory' | 'developer' | 'oauth-authorize';

export default function App() {
  const [currentView, setCurrentView] = useState<View>(() => {
    // Detect OAuth route on load
    if (window.location.pathname === '/oauth/authorize') {
      return 'oauth-authorize';
    }
    return 'landing';
  });
  const resetInterview = useInterviewStore((state) => state.reset);

  useEffect(() => {
    // Listen for manual URL changes (if any)
    const handlePopState = () => {
      if (window.location.pathname === '/oauth/authorize') {
        setCurrentView('oauth-authorize');
      } else if (currentView === 'oauth-authorize') {
        setCurrentView('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentView]);

  const handlePublishSkill = () => {
    toast.info('Skill Publishing', {
      description: 'Connect your wallet to publish skills. Feature requires $THINK token staking.',
      duration: 5000,
    });
  };

  const handleAuditSkill = () => {
    toast.info('Skill Auditing', {
      description: 'Connect your wallet to audit skills. Feature requires Level 2+ verification.',
      duration: 5000,
    });
  };

  const startNewInterview = () => {
    // Reset interview state to start fresh
    resetInterview();
    setCurrentView('interview');
  };

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        {currentView === 'landing' && (
        <>
          <LandingPage 
            onStartInterview={startNewInterview}
            onViewDashboard={() => setCurrentView('dashboard')}
            onPublishSkill={handlePublishSkill}
            onAuditSkill={handleAuditSkill}
            onViewPublicRAG={() => setCurrentView('publicRAG')}
            onViewPrivateRAG={() => setCurrentView('privateRAG')}
            onViewConversation={() => setCurrentView('conversation')}
            onViewLLMSettings={() => setCurrentView('llmSettings')}
            onViewGoldTier={() => setCurrentView('goldTier')}
            onViewDoc={(doc) => setCurrentView(doc as View)}
            onViewDeveloper={() => setCurrentView('developer')}
          />
          <Toaster position="top-right" />
        </>
      )}
      {currentView === 'interview' && (
        <>
          <GuidedDiscoveryWizard 
            onCancel={() => {
              setCurrentView('landing');
            }}
            onComplete={() => {
              setCurrentView('dashboard');
            }}
          />
          <Toaster position="top-right" />
        </>
      )}
      {currentView === 'dashboard' && (
        <>
          <Dashboard
            onBackToLanding={() => setCurrentView('landing')}
            onStartNewInterview={startNewInterview}
            onViewMemory={() => setCurrentView('memory')}
          />
          <Toaster position="top-right" />
        </>
      )}
      {currentView === 'publicRAG' && (
        <>
          <div className="min-h-screen bg-black text-white">
            <header className="border-b border-[#333333] bg-[#111111] p-4">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <h1 className="text-2xl font-bold">Public RAG</h1>
                <button 
                  onClick={() => setCurrentView('landing')}
                  className="text-[#888888] hover:text-white"
                >
                  Back
                </button>
              </div>
            </header>
            <PublicRAGManager />
          </div>
          <Toaster position="top-right" />
        </>
      )}
      {currentView === 'privateRAG' && (
        <>
          <div className="min-h-screen bg-black text-white">
            <header className="border-b border-[#333333] bg-[#111111] p-4">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <h1 className="text-2xl font-bold">Private RAG</h1>
                <button 
                  onClick={() => setCurrentView('landing')}
                  className="text-[#888888] hover:text-white"
                >
                  Back
                </button>
              </div>
            </header>
            <PrivateRAGManager />
          </div>
          <Toaster position="top-right" />
        </>
      )}
      {currentView === 'conversation' && (
        <>
          <div className="min-h-screen bg-black text-white">
            <header className="border-b border-[#333333] bg-[#111111] p-4">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <h1 className="text-2xl font-bold">AI Interview</h1>
                <button 
                  onClick={() => setCurrentView('landing')}
                  className="text-[#888888] hover:text-white"
                >
                  Back
                </button>
              </div>
            </header>
            <DynamicConversationContainer />
          </div>
          <Toaster position="top-right" />
        </>
      )}
      {currentView === 'llmSettings' && (
        <>
          <div className="min-h-screen bg-black text-white">
            <header className="border-b border-[#333333] bg-[#111111] p-4">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <h1 className="text-2xl font-bold">LLM Settings</h1>
                <button 
                  onClick={() => setCurrentView('landing')}
                  className="text-[#888888] hover:text-white"
                >
                  Back
                </button>
              </div>
            </header>
            <div className="max-w-4xl mx-auto p-6">
              <LLMSettingsPanel onComplete={() => setCurrentView('landing')} />
            </div>
          </div>
          <Toaster position="top-right" />
        </>
      )}

      {/* Doc Pages */}
      {currentView === 'doc-guided-discovery' && (
        <GuidedDiscoveryDoc onBack={() => setCurrentView('landing')} />
      )}
      {currentView === 'doc-nft-integration' && (
        <NFTIntegrationDoc onBack={() => setCurrentView('landing')} />
      )}
      {currentView === 'doc-configuration' && (
        <ConfigurationDoc onBack={() => setCurrentView('landing')} />
      )}
      {currentView === 'doc-skills-registry' && (
        <SkillsRegistryDoc onBack={() => setCurrentView('landing')} />
      )}

      {currentView === 'goldTier' && (
        <>
          <GoldTierDashboard onBack={() => setCurrentView('landing')} />
          <Toaster position="top-right" />
        </>
      )}

      {currentView === 'memory' && (
        <>
          <MemoryArchivePage />
          <Toaster position="top-right" />
        </>
      )}

      {currentView === 'developer' && (
        <>
          <DeveloperPortal onBack={() => setCurrentView('landing')} />
          <Toaster position="top-right" />
        </>
      )}

      {currentView === 'oauth-authorize' && (
        <>
          <OAuthAuthorize onComplete={() => {
            window.history.pushState({}, '', '/');
            setCurrentView('landing');
          }} />
          <Toaster position="top-right" />
        </>
      )}
      </Suspense>
    </ErrorBoundary>
  );
}