// TAIS Platform - Step 3: Behavior Configuration

import React from 'react';
import { Slider } from '../ui/slider';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';

interface BehaviorStepProps {
  personality: {
    tone: number;
    verbosity: number;
    formality: number;
  };
  autonomy: 'confirm' | 'suggest' | 'independent';
  onPersonalityChange: (key: string, value: number) => void;
  onAutonomyChange: (value: 'confirm' | 'suggest' | 'independent') => void;
}

export function BehaviorStep({
  personality,
  autonomy,
  onPersonalityChange,
  onAutonomyChange,
}: BehaviorStepProps) {
  const getToneLabel = (value: number) => {
    if (value < 33) return 'Direct';
    if (value < 66) return 'Balanced';
    return 'Conversational';
  };

  const getVerbosityLabel = (value: number) => {
    if (value < 33) return 'Brief';
    if (value < 66) return 'Balanced';
    return 'Comprehensive';
  };

  const getFormalityLabel = (value: number) => {
    if (value < 33) return 'Casual';
    if (value < 66) return 'Balanced';
    return 'Professional';
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold text-white">Configure Behavior</h2>
        <p className="text-[#888888]">
          Customize how your agent communicates and makes decisions
        </p>
      </div>

      {/* Communication Style */}
      <div className="space-y-6 bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base text-white">Communication Style</Label>
            <span className="text-sm font-medium text-[#3B82F6]">
              {getToneLabel(personality.tone)}
            </span>
          </div>
          <div className="space-y-2">
            <Slider
              value={[personality.tone]}
              onValueChange={([value]) => onPersonalityChange('tone', value)}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-[#888888]">
              <span>Direct</span>
              <span>Conversational</span>
            </div>
          </div>
          <p className="text-sm text-[#888888]">
            {personality.tone < 33
              ? 'Quick, to-the-point responses without extra explanation'
              : personality.tone < 66
              ? 'Balanced communication with clear explanations'
              : 'Friendly, detailed responses with context and examples'}
          </p>
        </div>

        {/* Detail Level */}
        <div className="space-y-4 pt-6 border-t border-[#333333]">
          <div className="flex items-center justify-between">
            <Label className="text-base text-white">Detail Level</Label>
            <span className="text-sm font-medium text-[#3B82F6]">
              {getVerbosityLabel(personality.verbosity)}
            </span>
          </div>
          <div className="space-y-2">
            <Slider
              value={[personality.verbosity]}
              onValueChange={([value]) => onPersonalityChange('verbosity', value)}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-[#888888]">
              <span>Brief</span>
              <span>Comprehensive</span>
            </div>
          </div>
          <p className="text-sm text-[#888888]">
            {personality.verbosity < 33
              ? 'Minimal details, just the essentials'
              : personality.verbosity < 66
              ? 'Moderate detail with key information'
              : 'Comprehensive explanations with full context'}
          </p>
        </div>

        {/* Formality */}
        <div className="space-y-4 pt-6 border-t border-[#333333]">
          <div className="flex items-center justify-between">
            <Label className="text-base text-white">Formality</Label>
            <span className="text-sm font-medium text-[#3B82F6]">
              {getFormalityLabel(personality.formality)}
            </span>
          </div>
          <div className="space-y-2">
            <Slider
              value={[personality.formality]}
              onValueChange={([value]) => onPersonalityChange('formality', value)}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-[#888888]">
              <span>Casual</span>
              <span>Professional</span>
            </div>
          </div>
          <p className="text-sm text-[#888888]">
            {personality.formality < 33
              ? 'Relaxed, friendly tone with informal language'
              : personality.formality < 66
              ? 'Professional yet approachable communication'
              : 'Formal, business-appropriate language'}
          </p>
        </div>
      </div>

      {/* Autonomy Level */}
      <div className="space-y-4 bg-[#1a1a1a] border border-[#333333] rounded-lg p-6">
        <Label className="text-base text-white">Autonomy Level</Label>
        <p className="text-sm text-[#888888]">
          How much freedom should your agent have to act independently?
        </p>

        <RadioGroup value={autonomy} onValueChange={onAutonomyChange}>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-4 rounded-lg border border-[#333333] hover:border-[#3B82F6] transition-colors cursor-pointer">
              <RadioGroupItem value="confirm" id="confirm" />
              <div className="flex-1">
                <Label htmlFor="confirm" className="cursor-pointer text-white font-medium">
                  Ask before every action
                </Label>
                <p className="text-sm text-[#888888] mt-1">
                  Maximum control - agent always waits for your approval
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 rounded-lg border border-[#333333] hover:border-[#3B82F6] transition-colors cursor-pointer">
              <RadioGroupItem value="suggest" id="suggest" />
              <div className="flex-1">
                <Label htmlFor="suggest" className="cursor-pointer text-white font-medium">
                  Suggest actions, wait for confirmation
                </Label>
                <p className="text-sm text-[#888888] mt-1">
                  Balanced - agent proposes actions and explains reasoning
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 rounded-lg border border-[#333333] hover:border-[#3B82F6] transition-colors cursor-pointer">
              <RadioGroupItem value="independent" id="independent" />
              <div className="flex-1">
                <Label htmlFor="independent" className="cursor-pointer text-white font-medium">
                  Act independently within constraints
                </Label>
                <p className="text-sm text-[#888888] mt-1">
                  Maximum efficiency - agent acts autonomously within your defined limits
                </p>
              </div>
            </div>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}
