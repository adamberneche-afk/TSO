// TAIS Platform - Progress Bar Component

import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
}

export function ProgressBar({ progress, className = '' }: ProgressBarProps) {
  return (
    <div className={`w-full bg-[#333333] rounded-full h-1 overflow-hidden ${className}`}>
      <div
        className="h-full bg-[#3B82F6] transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
}

export function StepIndicator({ currentStep, totalSteps, stepLabels }: StepIndicatorProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i);
  
  return (
    <div className="flex items-center justify-between w-full max-w-4xl mx-auto">
      {steps.map((step) => {
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;
        const isUpcoming = step > currentStep;
        
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all duration-200 ${
                  isCompleted
                    ? 'bg-[#10B981] text-white'
                    : isCurrent
                    ? 'bg-[#3B82F6] text-white ring-4 ring-[rgba(59,130,246,0.2)]'
                    : 'bg-[#333333] text-[#888888]'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step + 1
                )}
              </div>
              {stepLabels && stepLabels[step] && (
                <span className={`mt-2 text-xs text-center ${isCurrent ? 'text-white font-medium' : 'text-[#888888]'}`}>
                  {stepLabels[step]}
                </span>
              )}
            </div>
            {step < totalSteps - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${
                  isCompleted ? 'bg-[#10B981]' : 'bg-[#333333]'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
