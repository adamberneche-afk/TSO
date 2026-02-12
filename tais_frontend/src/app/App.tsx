// TAIS Platform - Main Application

import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { InterviewWizard } from './components/interview/InterviewWizard';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

type View = 'landing' | 'interview' | 'dashboard';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('landing');

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

  return (
    <ErrorBoundary>
      {currentView === 'landing' && (
        <>
          <LandingPage 
            onStartInterview={() => setCurrentView('interview')}
            onViewDashboard={() => setCurrentView('dashboard')}
            onPublishSkill={handlePublishSkill}
            onAuditSkill={handleAuditSkill}
          />
          <Toaster position="top-right" />
        </>
      )}
      {currentView === 'interview' && (
        <>
          <InterviewWizard onExit={() => setCurrentView('landing')} />
          <Toaster position="top-right" />
        </>
      )}
      {currentView === 'dashboard' && (
        <>
          <Dashboard
            onBackToLanding={() => setCurrentView('landing')}
            onStartNewInterview={() => setCurrentView('interview')}
          />
          <Toaster position="top-right" />
        </>
      )}
    </ErrorBoundary>
  );
}