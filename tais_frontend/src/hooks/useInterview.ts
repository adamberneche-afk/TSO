// TAIS Platform - Interview State Management

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { InterviewState, InterviewAnswers, AgentConfig, SelectedSkill, DeploymentType } from '../types/agent';
import { generateAgentConfig } from '../lib/interview-config';

interface InterviewStore extends InterviewState {
  // Actions
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateAnswers: (answers: Partial<InterviewAnswers>) => void;
  generateConfig: () => void;
  setDeploymentOption: (option: DeploymentType) => void;
  reset: () => void;
  
  // Helper getters
  canProceed: () => boolean;
  getProgress: () => number;
}

const initialState: InterviewState = {
  currentStep: 0,
  totalSteps: 7,
  answers: {
    goals: [],
    skills: [],
    personality: {
      tone: 50,
      verbosity: 50,
      formality: 50,
    },
    autonomy: 'suggest',
    privacy: 'balanced',
    maxCost: 0.1,
    permissions: ['network', 'api'],
    name: '',
  },
  config: null,
  isGenerating: false,
};

export const useInterviewStore = create<InterviewStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCurrentStep: (step: number) => {
        set({ currentStep: Math.max(0, Math.min(step, get().totalSteps)) });
      },

      nextStep: () => {
        const { currentStep, totalSteps } = get();
        if (currentStep < totalSteps) {
          set({ currentStep: currentStep + 1 });
        }
      },

      prevStep: () => {
        const { currentStep } = get();
        if (currentStep > 0) {
          set({ currentStep: currentStep - 1 });
        }
      },

      updateAnswers: (newAnswers: Partial<InterviewAnswers>) => {
        set((state) => ({
          answers: {
            ...state.answers,
            ...newAnswers,
          } as InterviewAnswers,
        }));
      },

      generateConfig: () => {
        const { answers } = get();
        
        // Check if we have all required fields
        if (!answers.name || !answers.goals || answers.goals.length === 0) {
          console.error('Missing required fields for config generation');
          return;
        }

        set({ isGenerating: true });

        try {
          const config = generateAgentConfig(answers as InterviewAnswers);
          set({ config, isGenerating: false });
        } catch (error) {
          console.error('Error generating config:', error);
          set({ isGenerating: false });
        }
      },

      setDeploymentOption: (option: DeploymentType) => {
        set({ deploymentOption: option });
      },

      reset: () => {
        set(initialState);
      },

      canProceed: () => {
        const { currentStep, answers } = get();
        
        switch (currentStep) {
          case 0: // Welcome & Goals
            return (answers.goals?.length ?? 0) > 0;
          case 1: // Skill Selection
            return (answers.skills?.length ?? 0) > 0;
          case 2: // Behavior Configuration
            return true; // Always valid (has defaults)
          case 3: // Privacy & Constraints
            return true; // Always valid (has defaults)
          case 4: // Identity & Naming
            return (answers.name?.length ?? 0) > 0;
          case 5: // Review Configuration
            return true;
          case 6: // Deployment Options
            return true;
          default:
            return false;
        }
      },

      getProgress: () => {
        const { currentStep, totalSteps } = get();
        return (currentStep / totalSteps) * 100;
      },
    }),
    {
      name: 'tais-interview-storage',
      partialize: (state) => ({
        currentStep: state.currentStep,
        answers: state.answers,
        config: state.config,
      }),
    }
  )
);
