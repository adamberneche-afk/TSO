// TAIS Platform - Step 1: Welcome & Goals

import React from 'react';
import { Card } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Target, Briefcase, GraduationCap, Palette, Calendar, Sparkles } from 'lucide-react';

interface WelcomeStepProps {
  selectedGoals: string[];
  description: string;
  onGoalsChange: (goals: string[]) => void;
  onDescriptionChange: (description: string) => void;
}

const GOAL_OPTIONS = [
  {
    id: 'work',
    label: 'Work/Professional',
    description: 'Boost productivity and manage professional tasks',
    icon: Briefcase,
  },
  {
    id: 'learning',
    label: 'Learning/Education',
    description: 'Support education and skill development',
    icon: GraduationCap,
  },
  {
    id: 'creative',
    label: 'Creative Projects',
    description: 'Enhance creative work and artistic projects',
    icon: Palette,
  },
  {
    id: 'organization',
    label: 'Personal Organization',
    description: 'Organize life and manage daily activities',
    icon: Calendar,
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    description: 'Enhance leisure and entertainment experiences',
    icon: Sparkles,
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Custom use cases and specialized needs',
    icon: Target,
  },
];

export function WelcomeStep({
  selectedGoals,
  description,
  onGoalsChange,
  onDescriptionChange,
}: WelcomeStepProps) {
  const toggleGoal = (goalId: string) => {
    if (selectedGoals.includes(goalId)) {
      onGoalsChange(selectedGoals.filter((g) => g !== goalId));
    } else {
      onGoalsChange([...selectedGoals, goalId]);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-5xl font-bold text-white">Build Your AI Agent</h1>
        <p className="text-xl text-[#888888] max-w-2xl mx-auto">
          Answer a few questions to create a custom AI agent tailored to your needs.
          No coding required.
        </p>
      </div>

      {/* Goals Selection */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-2">
            What will your agent help you with?
          </h2>
          <p className="text-[#888888]">Select one or more goals (you can choose multiple)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {GOAL_OPTIONS.map((goal) => {
            const Icon = goal.icon;
            const isSelected = selectedGoals.includes(goal.id);

            return (
              <Card
                key={goal.id}
                className={`cursor-pointer transition-all hover:border-[#3B82F6] bg-[#1a1a1a] border-[#333333] ${
                  isSelected ? 'border-[#3B82F6] ring-2 ring-[rgba(59,130,246,0.2)]' : ''
                }`}
                onClick={() => toggleGoal(goal.id)}
              >
                <div className="p-6">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                      isSelected ? 'bg-[#3B82F6]' : 'bg-[#222222]'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-[#888888]'}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{goal.label}</h3>
                  <p className="text-sm text-[#888888]">{goal.description}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Optional Description */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-2">
            Describe your ideal day with this agent
          </h2>
          <p className="text-[#888888]">Optional - Help us understand your vision</p>
        </div>

        <Textarea
          placeholder="Example: My agent checks my calendar each morning, summarizes my emails, and suggests priorities for the day..."
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="min-h-[120px] bg-[#111111] border-[#333333] text-white placeholder:text-[#555555] resize-none"
        />
      </div>
    </div>
  );
}
