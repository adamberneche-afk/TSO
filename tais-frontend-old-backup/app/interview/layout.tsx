"use client";

import { Button } from "@/components/ui/button";
import { ProgressBar, StepIndicator } from "@/components/interview/progress";
import { useInterviewStore, interviewSteps } from "@/hooks/use-interview-store";

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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-4">
        <div className="container mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-blue-500">TAIS</span>
            <span className="text-sm text-gray-500">Interview</span>
          </div>
          {currentStep > 1 && (
            <Button
              variant="secondary"
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
        <div className="border-b border-gray-800 px-4 py-4">
          <div className="container mx-auto max-w-6xl">
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
      <main className="container mx-auto max-w-6xl px-4 py-8 pb-24">
        {children}
      </main>

      {/* Navigation Footer */}
      {showNavigation && (
        <footer className="fixed bottom-0 left-0 right-0 border-t border-gray-800 bg-black px-4 py-4 z-50">
          <div className="container mx-auto max-w-6xl flex justify-between items-center">
            <Button
              variant="secondary"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              ← Back
            </Button>
            
            <div className="text-sm text-gray-500">
              Step {currentStep - 1} of {totalSteps - 2}
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
    </div>
  );
}
