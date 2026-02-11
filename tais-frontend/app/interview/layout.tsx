"use client";

import { Button } from "@/components/ui/button";
import { ProgressBar, StepIndicator } from "@/components/interview/progress";
import { useInterviewStore, interviewSteps } from "@/hooks/use-interview-store";
import { cn } from "@/lib/utils";

export default function InterviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentStep, totalSteps, nextStep, prevStep, isCompleted } = useInterviewStore();
  const stepNames = interviewSteps.map((s) => s.title);
  
  // Don't show navigation on welcome or success screens
  const showNavigation = currentStep > 1 && currentStep < totalSteps && !isCompleted;
  const isLastStep = currentStep === totalSteps;
  
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="border-b border-[var(--border-default)] px-4 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[var(--accent-primary)]">TAIS</span>
            <span className="text-sm text-[var(--text-muted)]">Interview</span>
          </div>
          {currentStep > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = "/"}
            >
              Exit
            </Button>
          )}
        </div>
      </header>

      {/* Progress Bar */}
      {currentStep > 1 && currentStep < totalSteps && (
        <div className="border-b border-[var(--border-default)] px-4 py-4">
          <div className="mx-auto max-w-4xl">
            <StepIndicator
              steps={stepNames.slice(1, -1)} // Exclude Welcome and Deploy
              currentStep={currentStep - 1} // Adjust for hidden welcome step
              className="mb-4"
            />
            <ProgressBar
              currentStep={currentStep - 1}
              totalSteps={totalSteps - 2}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="px-4 py-8">
        <div className="mx-auto max-w-4xl">
          {children}
        </div>
      </main>

      {/* Navigation Footer */}
      {showNavigation && (
        <footer className="fixed bottom-0 left-0 right-0 border-t border-[var(--border-default)] bg-[var(--background)] px-4 py-4">
          <div className="mx-auto max-w-4xl flex justify-between items-center">
            <Button
              variant="secondary"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              ← Back
            </Button>
            
            <div className="text-sm text-[var(--text-muted)]">
              Step {currentStep} of {totalSteps}
            </div>
            
            <Button
              onClick={nextStep}
              disabled={isLastStep}
            >
              {isLastStep ? "Finish" : "Next →"}
            </Button>
          </div>
        </footer>
      )}
      
      {/* Spacer for fixed footer */}
      {showNavigation && <div className="h-20" />}
    </div>
  );
}
