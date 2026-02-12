// TAIS Platform - Main Application

import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { InterviewWizard } from './components/interview/InterviewWizard';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';

type View = 'landing' | 'interview' | 'dashboard';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('landing');

  return (
    <ErrorBoundary>
      {currentView === 'landing' && (
        <>
          <LandingPage 
            onStartInterview={() => setCurrentView('interview')}
            onViewDashboard={() => setCurrentView('dashboard')}
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