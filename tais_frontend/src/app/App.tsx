// TAIS Platform - Main Application

import React, { useState, useEffect, lazy, Suspense } from 'react';
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
import { GitHubOAuthCallback } from './components/oauth/GitHubOAuthCallback';
import { PlatformSettingsPage } from './components/settings/PlatformSettings';

const PublicRAGManager = lazy(() => import('./components/rag/PublicRAGManager').then(m => ({ default: m.PublicRAGManager })));
const PrivateRAGManager = lazy(() => import('./components/rag/PrivateRAGManager').then(m => ({ default: m.PrivateRAGManager })));
const DynamicConversationContainer = lazy(() => import('./components/conversation/DynamicConversationContainer').then(m => ({ default: m.DynamicConversationContainer })));
const MemoryArchivePage = lazy(() => import('./components/memory/MemoryArchivePage').then(m => ({ default: m.MemoryArchivePage })));
const DeveloperPortal = lazy(() => import('./components/DeveloperPortal').then(m => ({ default: m.DeveloperPortal })));
const PublishSkillForm = lazy(() => import('./components/skills/PublishSkillForm').then(m => ({ default: m.PublishSkillForm })));
const EnterprisePage = lazy(() => import('./components/enterprise/EnterprisePage').then(m => ({ default: m.EnterprisePage })));
const InvitationAccept = lazy(() => import('./components/enterprise/InvitationAccept').then(m => ({ default: m.InvitationAccept })));
const ResetPasswordForm = lazy(() => import('./components/enterprise/ResetPasswordForm').then(m => ({ default: m.ResetPasswordForm })));
const AgentMarketplacePage = lazy(() => import('./components/marketplace/AgentMarketplacePage').then(m => ({ default: m.AgentMarketplacePage })));

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}

type View = 'landing' | 'interview' | 'dashboard' | 'publicRAG' | 'privateRAG' | 'conversation' | 'llmSettings' | 'doc-guided-discovery' | 'doc-nft-integration' | 'doc-configuration' | 'doc-skills-registry' | 'goldTier' | 'memory' | 'developer' | 'oauth-authorize' | 'settings' | 'github-callback' | 'publishSkill' | 'enterprise' | 'enterprise-invitation-accept' | 'enterprise-reset-password' | 'marketplace';

// Enterprise RAG (docs/ENTERPRISE_RAG_IDENTITY.md) routes carry a token as
// their last path segment -- an invitation-accept link (from an org
// admin's invite email) or a password-reset link, neither of which fits
// this app's existing exact-pathname route table above.
function detectEnterpriseRoute(pathname: string): { view: View; token?: string } | null {
  if (pathname === '/enterprise') {
    return { view: 'enterprise' };
  }
  const invitationMatch = pathname.match(/^\/orgs\/invitations\/([^/]+)$/);
  if (invitationMatch) {
    return { view: 'enterprise-invitation-accept', token: invitationMatch[1] };
  }
  const resetMatch = pathname.match(/^\/auth\/reset-password\/([^/]+)$/);
  if (resetMatch) {
    return { view: 'enterprise-reset-password', token: resetMatch[1] };
  }
  return null;
}

export default function App() {
  const [enterpriseToken, setEnterpriseToken] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>(() => {
    // Detect OAuth routes on load
    if (window.location.pathname === '/oauth/authorize') {
      return 'oauth-authorize';
    }
    if (window.location.pathname === '/auth/github/callback') {
      return 'github-callback';
    }
    const enterpriseRoute = detectEnterpriseRoute(window.location.pathname);
    if (enterpriseRoute) {
      return enterpriseRoute.view;
    }
    return 'landing';
  });
  // Populate the token for whichever enterprise route matched above --
  // read once more here since the lazy useState initializer above only
  // returns the view, not the token, to keep that initializer's return
  // type a plain View.
  useEffect(() => {
    const enterpriseRoute = detectEnterpriseRoute(window.location.pathname);
    if (enterpriseRoute?.token) {
      setEnterpriseToken(enterpriseRoute.token);
    }
  }, []);
  const resetInterview = useInterviewStore((state) => state.reset);

   useEffect(() => {
     // Listen for manual URL changes (if any)
     const handlePopState = () => {
       if (window.location.pathname === '/oauth/authorize') {
         setCurrentView('oauth-authorize');
       } else if (window.location.pathname === '/auth/github/callback') {
         setCurrentView('github-callback');
       } else {
         const enterpriseRoute = detectEnterpriseRoute(window.location.pathname);
         if (enterpriseRoute) {
           setCurrentView(enterpriseRoute.view);
           setEnterpriseToken(enterpriseRoute.token ?? null);
         } else if (currentView !== 'landing') {
           // Only navigate to landing if we're not already there
           setCurrentView('landing');
         }
       }
     };
     window.addEventListener('popstate', handlePopState);
     return () => window.removeEventListener('popstate', handlePopState);
   }, []); // Empty deps - only run once on mount

  const handlePublishSkill = () => {
    setCurrentView('publishSkill');
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
            onViewSettings={() => setCurrentView('settings')}
            onViewEnterprise={() => setCurrentView('enterprise')}
            onViewMarketplace={() => setCurrentView('marketplace')}
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
      {currentView === 'publishSkill' && (
        <>
          <div className="min-h-screen bg-black text-white">
            <header className="border-b border-[#333333] bg-[#111111] p-4">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <h1 className="text-2xl font-bold">Publish Skill</h1>
                <button
                  onClick={() => setCurrentView('landing')}
                  className="text-[#888888] hover:text-white"
                >
                  Back
                </button>
              </div>
            </header>
            <PublishSkillForm />
          </div>
          <Toaster position="top-right" />
        </>
      )}
      {currentView === 'enterprise' && (
        <>
          <div className="min-h-screen bg-black text-white">
            <header className="border-b border-[#333333] bg-[#111111] p-4">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <h1 className="text-2xl font-bold">Enterprise RAG</h1>
                <button onClick={() => setCurrentView('landing')} className="text-[#888888] hover:text-white">
                  Back
                </button>
              </div>
            </header>
            <EnterprisePage />
          </div>
          <Toaster position="top-right" />
        </>
      )}
      {currentView === 'enterprise-invitation-accept' && enterpriseToken && (
        <>
          <div className="min-h-screen bg-black text-white">
            <InvitationAccept
              token={enterpriseToken}
              onAccepted={() => {
                window.history.pushState({}, '', '/enterprise');
                setCurrentView('enterprise');
              }}
            />
          </div>
          <Toaster position="top-right" />
        </>
      )}
      {currentView === 'enterprise-reset-password' && enterpriseToken && (
        <>
          <div className="min-h-screen bg-black text-white">
            <ResetPasswordForm
              token={enterpriseToken}
              onDone={() => {
                window.history.pushState({}, '', '/enterprise');
                setCurrentView('enterprise');
              }}
            />
          </div>
          <Toaster position="top-right" />
        </>
      )}
      {currentView === 'marketplace' && (
        <>
          <div className="border-b border-[#333333] bg-[#111111] p-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Agent Marketplace</h1>
              <button onClick={() => setCurrentView('landing')} className="text-[#888888] hover:text-white">
                Back
              </button>
            </div>
          </div>
          <AgentMarketplacePage />
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

      {currentView === 'github-callback' && (
        <>
          <GitHubOAuthCallback onSuccess={() => {
            window.history.pushState({}, '', '/');
            setCurrentView('goldTier');
          }} />
          <Toaster position="top-right" />
        </>
      )}

      {currentView === 'settings' && (
        <>
          <PlatformSettingsPage onBack={() => setCurrentView('landing')} />
          <Toaster position="top-right" />
        </>
      )}
      </Suspense>
    </ErrorBoundary>
  );
}