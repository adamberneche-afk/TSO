import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface InterviewAnswers {
  // Step 1: Goals
  goals: string[];
  description?: string;
  
  // Step 2: Skills
  selectedSkills: SelectedSkill[];
  
  // Step 3: Personality
  personality: {
    tone: number;        // 0-100 slider
    verbosity: number;   // 0-100 slider
    formality: number;   // 0-100 slider
  };
  
  // Step 4: Autonomy & Privacy
  autonomy: "confirm" | "suggest" | "independent";
  privacy: "local" | "balanced" | "cloud";
  maxCost: number;
  permissions: string[];
  
  // Step 5: Identity
  name: string;
  walletAddress?: string;
}

export interface SelectedSkill {
  id: string;
  name: string;
  version: string;
  trustScore: number;
  description?: string;
  skillHash: string;
  permissions?: Record<string, any>;
}

export interface InterviewState {
  // Progress
  currentStep: number;
  totalSteps: number;
  isCompleted: boolean;
  
  // Answers
  answers: InterviewAnswers;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateAnswers: (answers: Partial<InterviewAnswers>) => void;
  addSkill: (skill: SelectedSkill) => void;
  removeSkill: (skillId: string) => void;
  toggleSkill: (skill: SelectedSkill) => void;
  reset: () => void;
  complete: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

const initialAnswers: InterviewAnswers = {
  goals: [],
  selectedSkills: [],
  personality: {
    tone: 50,
    verbosity: 50,
    formality: 50,
  },
  autonomy: "suggest",
  privacy: "balanced",
  maxCost: 0.1,
  permissions: ["network", "filesystem"],
  name: "",
};

export const useInterviewStore = create<InterviewState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      totalSteps: 8,
      isCompleted: false,
      answers: initialAnswers,
      isLoading: false,
      error: null,
      
      setStep: (step) => set({ currentStep: step }),
      
      nextStep: () => {
        const { currentStep, totalSteps } = get();
        if (currentStep < totalSteps) {
          set({ currentStep: currentStep + 1 });
        }
      },
      
      prevStep: () => {
        const { currentStep } = get();
        if (currentStep > 1) {
          set({ currentStep: currentStep - 1 });
        }
      },
      
      updateAnswers: (newAnswers) => set((state) => ({
        answers: { ...state.answers, ...newAnswers },
      })),
      
      addSkill: (skill) => set((state) => ({
        answers: {
          ...state.answers,
          selectedSkills: [...state.answers.selectedSkills, skill],
        },
      })),
      
      removeSkill: (skillId) => set((state) => ({
        answers: {
          ...state.answers,
          selectedSkills: state.answers.selectedSkills.filter((s) => s.id !== skillId),
        },
      })),
      
      toggleSkill: (skill) => {
        const { selectedSkills } = get().answers;
        const exists = selectedSkills.find((s) => s.id === skill.id);
        if (exists) {
          get().removeSkill(skill.id);
        } else {
          get().addSkill(skill);
        }
      },
      
      reset: () => set({
        currentStep: 1,
        isCompleted: false,
        answers: initialAnswers,
        error: null,
      }),
      
      complete: () => set({ isCompleted: true }),
      
      setError: (error) => set({ error }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "tais-interview-storage",
      partialize: (state) => ({
        currentStep: state.currentStep,
        answers: state.answers,
        isCompleted: state.isCompleted,
      }),
    }
  )
);

// Interview steps configuration
export const interviewSteps = [
  { id: 1, title: "Welcome", description: "Introduction and goals" },
  { id: 2, title: "Goals", description: "Define your agent's purpose" },
  { id: 3, title: "Skills", description: "Select capabilities" },
  { id: 4, title: "Behavior", description: "Configure personality" },
  { id: 5, title: "Privacy", description: "Set constraints" },
  { id: 6, title: "Identity", description: "Name your agent" },
  { id: 7, title: "Review", description: "Preview configuration" },
  { id: 8, title: "Deploy", description: "Launch your agent" },
];
