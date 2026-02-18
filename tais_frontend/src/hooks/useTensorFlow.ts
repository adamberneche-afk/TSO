import { useState, useEffect, useCallback } from 'react';
import { loadUSEModel } from '../services/tensorflow';

interface TensorFlowState {
  isReady: boolean;
  isLoading: boolean;
  error: Error | null;
  progress: number;
}

export function useTensorFlow() {
  const [state, setState] = useState<TensorFlowState>({
    isReady: false,
    isLoading: false,
    error: null,
    progress: 0
  });

  const initialize = useCallback(async () => {
    if (state.isLoading || state.isReady) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Update progress simulation
      const progressInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
      }, 200);

      await loadUSEModel();
      
      clearInterval(progressInterval);
      setState({
        isReady: true,
        isLoading: false,
        error: null,
        progress: 100
      });
    } catch (error) {
      setState({
        isReady: false,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to load TensorFlow model'),
        progress: 0
      });
    }
  }, [state.isLoading, state.isReady]);

  useEffect(() => {
    // Auto-initialize on mount
    initialize();
  }, [initialize]);

  return {
    ...state,
    initialize
  };
}
