// TAIS Platform - Interview Navigation Component

import React from 'react';
import { Button } from '../ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface NavigationProps {
  onNext: () => void;
  onPrev: () => void;
  canProceed: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  nextLabel?: string;
  prevLabel?: string;
}

export function Navigation({
  onNext,
  onPrev,
  canProceed,
  isFirstStep,
  isLastStep,
  nextLabel = 'Continue',
  prevLabel = 'Back',
}: NavigationProps) {
  return (
    <div className="flex items-center justify-between pt-6 border-t border-[#333333]">
      <Button
        onClick={onPrev}
        disabled={isFirstStep}
        variant="ghost"
        className="text-[#3B82F6] hover:text-[#60A5FA]"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {prevLabel}
      </Button>

      <Button
        onClick={onNext}
        disabled={!canProceed}
        className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
      >
        {nextLabel}
        {!isLastStep && <ArrowRight className="w-4 h-4 ml-2" />}
      </Button>
    </div>
  );
}
