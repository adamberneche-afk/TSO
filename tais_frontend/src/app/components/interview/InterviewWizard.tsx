// TAIS Platform - Main Interview Wizard Component

import React, { useEffect } from 'react';
import { useInterviewStore } from '../../../hooks/useInterview';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { ProgressBar, StepIndicator } from './ProgressBar';
import { Navigation } from './Navigation';
import { WelcomeStep } from './WelcomeStep';
import { SkillSelector } from './SkillSelector';
import { BehaviorStep } from './BehaviorStep';
import { PrivacyStep } from './PrivacyStep';
import { IdentityStep } from './IdentityStep';
import { ConfigPreview } from './ConfigPreview';
import { KeyboardShortcutsHelp } from '../KeyboardShortcutsHelp';
import { SelectedSkill } from '../../../types/agent';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'motion/react';

const STEP_LABELS = [
  'Goals',
  'Skills',
  'Behavior',
  'Privacy',
  'Identity',
  'Review',
  'Deploy',
];

interface InterviewWizardProps {
  onExit?: () => void;
}

export function InterviewWizard({ onExit }: InterviewWizardProps) {
  const {
    currentStep,
    totalSteps,
    answers,
    config,
    updateAnswers,
    nextStep,
    prevStep,
    canProceed,
    getProgress,
    generateConfig,
  } = useInterviewStore();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNext: canProceed() && currentStep < 6 ? nextStep : undefined,
    onPrev: currentStep > 0 ? prevStep : undefined,
    onEscape: () => {
      if (confirm('Are you sure you want to exit? Your progress will be saved.')) {
        window.location.href = '/';
      }
    },
    onSave: config && currentStep === 5 ? () => {
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.agent.name}-config.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } : undefined,
    enabled: true,
  });

  // Generate config when reaching review step
  useEffect(() => {
    if (currentStep === 5 && !config) {
      generateConfig();
    }
  }, [currentStep, config, generateConfig]);

  const handleSkillToggle = (skill: SelectedSkill) => {
    const currentSkills = answers.skills || [];
    const isSelected = currentSkills.some((s) => s.id === skill.id);

    if (isSelected) {
      updateAnswers({
        skills: currentSkills.filter((s) => s.id !== skill.id),
      });
    } else {
      updateAnswers({
        skills: [...currentSkills, skill],
      });
    }
  };

  const handlePersonalityChange = (key: string, value: number) => {
    updateAnswers({
      personality: {
        ...answers.personality!,
        [key]: value,
      },
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <WelcomeStep
            selectedGoals={answers.goals || []}
            description={answers.description || ''}
            onGoalsChange={(goals) => updateAnswers({ goals })}
            onDescriptionChange={(description) => updateAnswers({ description })}
          />
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold text-white">Select Skills</h2>
              <p className="text-[#888888]">
                Choose skills from the registry to enhance your agent's capabilities
              </p>
            </div>
            <SkillSelector
              selectedGoals={answers.goals || []}
              selectedSkills={answers.skills || []}
              onSkillToggle={handleSkillToggle}
            />
          </div>
        );

      case 2:
        return (
          <BehaviorStep
            personality={answers.personality || { tone: 50, verbosity: 50, formality: 50 }}
            autonomy={answers.autonomy || 'suggest'}
            onPersonalityChange={handlePersonalityChange}
            onAutonomyChange={(autonomy) => updateAnswers({ autonomy })}
          />
        );

      case 3:
        return (
          <PrivacyStep
            privacy={answers.privacy || 'balanced'}
            maxCost={answers.maxCost || 0.1}
            permissions={answers.permissions || ['network', 'api']}
            onPrivacyChange={(privacy) => updateAnswers({ privacy })}
            onMaxCostChange={(maxCost) => updateAnswers({ maxCost })}
            onPermissionsChange={(permissions) => updateAnswers({ permissions })}
          />
        );

      case 4:
        return (
          <IdentityStep
            name={answers.name || ''}
            walletAddress={answers.walletAddress}
            onNameChange={(name) => updateAnswers({ name })}
            onWalletConnect={(walletAddress) => updateAnswers({ walletAddress })}
          />
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold text-white">Review Configuration</h2>
              <p className="text-[#888888]">
                Review your agent's configuration and make any final adjustments
              </p>
            </div>

            {config && <ConfigPreview config={config} editable={true} />}

            {!config && (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4 py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-semibold text-white">
                Your Agent is Ready!
              </h2>
              <p className="text-[#888888] max-w-2xl mx-auto">
                Congratulations! Your AI agent "{answers.name}" has been configured successfully.
                Choose how you'd like to deploy it.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              <DeploymentOption
                title="Web Agent"
                description="Run in your browser"
                features={['Chat interface', 'Instant access', 'No installation']}
                icon="🌐"
                disabled
              />
              <DeploymentOption
                title="Desktop App"
                description="Download for Windows/Mac/Linux"
                features={['Local execution', 'Offline capable', 'Full privacy']}
                icon="💻"
                disabled
              />
              <DeploymentOption
                title="API Endpoint"
                description="Access via HTTP API"
                features={['Integrate into apps', 'Programmatic access', 'Scalable']}
                icon="⚡"
                disabled
              />
              {config && (
                <DeploymentOption
                  title="Export Config"
                  description="Download raw JSON"
                  features={['Self-host anywhere', 'Full control', 'Portable']}
                  icon="📦"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${config.agent.name}-config.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                />
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-[#333333] bg-[#111111]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold text-white">TAIS</h1>
            {currentStep > 0 && currentStep < 6 && (
              <div className="hidden md:block">
                <StepIndicator
                  currentStep={currentStep}
                  totalSteps={totalSteps}
                  stepLabels={STEP_LABELS}
                />
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            className="text-[#888888] hover:text-white"
            onClick={() => onExit ? onExit() : window.location.href = '/'}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Exit
          </Button>
        </div>
      </header>

      {/* Progress Bar */}
      {currentStep > 0 && currentStep < 6 && (
        <div className="bg-[#111111] border-b border-[#333333]">
          <div className="max-w-7xl mx-auto px-6 py-2">
            <ProgressBar progress={getProgress()} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {renderStep()}

          {/* Navigation */}
          {currentStep < 6 && (
            <Navigation
              onNext={nextStep}
              onPrev={prevStep}
              canProceed={canProceed()}
              isFirstStep={currentStep === 0}
              isLastStep={currentStep === 5}
              nextLabel={currentStep === 5 ? 'Finish' : 'Continue'}
            />
          )}
        </div>
      </main>
    </div>
  );
}

interface DeploymentOptionProps {
  title: string;
  description: string;
  features: string[];
  icon: string;
  onClick?: () => void;
  disabled?: boolean;
}

function DeploymentOption({
  title,
  description,
  features,
  icon,
  onClick,
  disabled,
}: DeploymentOptionProps) {
  return (
    <div
      className={`bg-[#1a1a1a] border border-[#333333] rounded-lg p-6 ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:border-[#3B82F6] cursor-pointer transition-all'
      }`}
      onClick={!disabled ? onClick : undefined}
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-[#888888] mb-4">{description}</p>
      <ul className="space-y-2">
        {features.map((feature, i) => (
          <li key={i} className="text-sm text-[#888888] flex items-center gap-2">
            <span className="text-[#10B981]">✓</span>
            {feature}
          </li>
        ))}
      </ul>
      {disabled && (
        <p className="text-xs text-[#888888] mt-4 italic">Coming soon</p>
      )}
    </div>
  );
}