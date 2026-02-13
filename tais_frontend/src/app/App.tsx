// TAIS Platform - Main Application

import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { InterviewWizard } from './components/interview/InterviewWizard';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { useInterviewStore } from '../hooks/useInterview';

type View = 'landing' | 'interview' | 'dashboard';

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
    </ErrorBoundary>
  );
}