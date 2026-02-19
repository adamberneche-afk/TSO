// TAIS Platform - Main Application

import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { InterviewWizard } from './components/interview/InterviewWizard';
import { Dashboard } from './components/Dashboard';
import { PublicRAGManager } from './components/rag/PublicRAGManager';
import { PrivateRAGManager } from './components/rag/PrivateRAGManager';
import { DynamicConversationContainer } from './components/conversation/DynamicConversationContainer';
import { LLMSettingsPanel } from './components/llm/LLMSettings';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { useInterviewStore } from '../hooks/useInterview';

type View = 'landing' | 'interview' | 'dashboard' | 'publicRAG' | 'privateRAG' | 'conversation' | 'llmSettings';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('landing');
  const resetInterview = useInterviewStore((state) => state.reset);

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
          />
          <Toaster position="top-right" />
        </>
      )}
      {currentView === 'interview' && (
        <>
          <InterviewWizard onExit={() => {
            resetInterview();
            setCurrentView('landing');
          }} />
          <Toaster position="top-right" />
        </>
      )}
      {currentView === 'dashboard' && (
        <>
          <Dashboard
            onBackToLanding={() => setCurrentView('landing')}
            onStartNewInterview={startNewInterview}
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
    </ErrorBoundary>
  );
}