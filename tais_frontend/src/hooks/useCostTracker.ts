import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CostSettings } from '../types/llm';
import { DEFAULT_COST_SETTINGS } from '../types/llm';
import { toast } from 'sonner';

interface CostTrackerState {
  currentCost: number;
  maxCost: number;
  warningThreshold: number;
  isTracking: boolean;
  sessionCosts: Record<string, number>; // sessionId -> cost
  
  // Actions
  startTracking: (settings?: Partial<CostSettings>) => void;
  trackCost: (cost: number, sessionId?: string) => boolean;
  getCurrentSpend: () => number;
  getRemainingBudget: () => number;
  getProgressPercentage: () => number;
  reset: () => void;
  canMakeRequest: (estimatedCost?: number) => boolean;
}

export const useCostTracker = create<CostTrackerState>()(
  persist(
    (set, get) => ({
      currentCost: 0,
      maxCost: DEFAULT_COST_SETTINGS.maxCostPerInterview,
      warningThreshold: DEFAULT_COST_SETTINGS.warningThreshold,
      isTracking: false,
      sessionCosts: {},

      startTracking: (settings) => {
        set({
          currentCost: 0,
          maxCost: settings?.maxCostPerInterview ?? DEFAULT_COST_SETTINGS.maxCostPerInterview,
          warningThreshold: settings?.warningThreshold ?? DEFAULT_COST_SETTINGS.warningThreshold,
          isTracking: true,
          sessionCosts: {}
        });
      },

      trackCost: (cost: number, sessionId?: string) => {
        const state = get();
        const newCost = state.currentCost + cost;
        
        // Update session costs if sessionId provided
        if (sessionId) {
          set((state) => ({
            sessionCosts: {
              ...state.sessionCosts,
              [sessionId]: (state.sessionCosts[sessionId] || 0) + cost
            }
          }));
        }
        
        // Check warning threshold
        if (newCost >= state.maxCost * state.warningThreshold && state.currentCost < state.maxCost * state.warningThreshold) {
          toast.warning('Cost Warning', {
            description: `You've used ${Math.round((newCost / state.maxCost) * 100)}% of your budget ($${newCost.toFixed(3)} / $${state.maxCost.toFixed(2)})`
          });
        }
        
        // Check if exceeded
        if (newCost >= state.maxCost) {
          toast.error('Budget Exceeded', {
            description: `Cost limit of $${state.maxCost.toFixed(2)} reached. Interview will stop.`
          });
          set({ currentCost: newCost });
          return false;
        }
        
        set({ currentCost: newCost });
        return true;
      },

      getCurrentSpend: () => get().currentCost,

      getRemainingBudget: () => {
        const state = get();
        return Math.max(0, state.maxCost - state.currentCost);
      },

      getProgressPercentage: () => {
        const state = get();
        return Math.min(100, (state.currentCost / state.maxCost) * 100);
      },

      reset: () => {
        set({
          currentCost: 0,
          isTracking: false,
          sessionCosts: {}
        });
      },

      canMakeRequest: (estimatedCost = 0.01) => {
        const state = get();
        return (state.currentCost + estimatedCost) < state.maxCost;
      }
    }),
    {
      name: 'cost-tracker',
      partialize: (state) => ({ 
        sessionCosts: state.sessionCosts 
      })
    }
  )
);

// Helper hook for UI components
export function useCostDisplay() {
  const { 
    currentCost, 
    maxCost, 
    getProgressPercentage, 
    getRemainingBudget,
    isTracking 
  } = useCostTracker();

  return {
    currentCost,
    maxCost,
    remainingBudget: getRemainingBudget(),
    progressPercentage: getProgressPercentage(),
    isTracking,
    formattedCurrent: `$${currentCost.toFixed(3)}`,
    formattedMax: `$${maxCost.toFixed(2)}`,
    formattedRemaining: `$${getRemainingBudget().toFixed(3)}`,
    isWarning: getProgressPercentage() >= 80 && getProgressPercentage() < 100,
    isExceeded: getProgressPercentage() >= 100
  };
}
