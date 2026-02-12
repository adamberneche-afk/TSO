"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export function ProgressBar({ currentStep, totalSteps, className }: ProgressBarProps) {
  const progress = ((currentStep) / totalSteps) * 100;
  
  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-between text-sm text-[var(--text-secondary)] mb-2">
        <span>Step {currentStep} of {totalSteps}</span>
        <span>{Math.round(progress)}% complete</span>
      </div>
      <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
        <div 
          className="h-full bg-[var(--accent-primary)] transition-all duration-500 ease-out rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <div className={cn("flex items-center justify-between w-full", className)}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        const isUpcoming = stepNumber > currentStep;
        
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                  isActive && "bg-[var(--accent-primary)] text-white",
                  isCompleted && "bg-[var(--color-success)] text-white",
                  isUpcoming && "bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border-default)]"
                )}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>
              <span
                className={cn(
                  "text-xs mt-1 hidden sm:block max-w-[80px] text-center",
                  isActive && "text-[var(--accent-primary)] font-medium",
                  isCompleted && "text-[var(--color-success)]",
                  isUpcoming && "text-[var(--text-muted)]"
                )}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 transition-all duration-300",
                  isCompleted ? "bg-[var(--color-success)]" : "bg-[var(--border-default)]"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
