import { useEffect, useCallback, useRef } from 'react';
import { WorkingMemoryAPI, ActiveMemoryAPI } from '@/services/memory';

const WORKING_MEMORY_KEY = 'tais_active_working_memory';

export function useWorkingMemory(sessionId?: string) {
  const workingMemoryRef = useRef<WorkingMemoryAPI | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize working memory on mount
  useEffect(() => {
    const init = async () => {
      const storedSessionId = sessionStorage.getItem(WORKING_MEMORY_KEY);
      
      if (storedSessionId && !sessionId) {
        // Resume existing session
        const wm = new WorkingMemoryAPI(storedSessionId);
        await wm.load();
        workingMemoryRef.current = wm;
      } else if (sessionId) {
        // New session
        const wm = new WorkingMemoryAPI(sessionId);
        await wm.initialize('conversation');
        workingMemoryRef.current = wm;
        sessionStorage.setItem(WORKING_MEMORY_KEY, wm.getSessionId());
      }
      
      isInitializedRef.current = true;
    };

    if (!isInitializedRef.current) {
      init();
    }
  }, [sessionId]);

  // Add user message to working memory
  const addUserMessage = useCallback(async (content: string) => {
    if (workingMemoryRef.current) {
      await workingMemoryRef.current.addMessage('user', content);
    }
  }, []);

  // Add assistant message to working memory
  const addAssistantMessage = useCallback(async (content: string) => {
    if (workingMemoryRef.current) {
      await workingMemoryRef.current.addMessage('assistant', content);
    }
  }, []);

  // Set user intent (for context)
  const setUserIntent = useCallback(async (intent: string) => {
    if (workingMemoryRef.current) {
      await workingMemoryRef.current.setUserIntent(intent);
    }
  }, []);

  // Add pending action
  const addPendingAction = useCallback(async (action: string) => {
    if (workingMemoryRef.current) {
      await workingMemoryRef.current.addPendingAction(action);
    }
  }, []);

  // Remove pending action when completed
  const removePendingAction = useCallback(async (action: string) => {
    if (workingMemoryRef.current) {
      await workingMemoryRef.current.removePendingAction(action);
    }
  }, []);

  // End session - save to Active Memory
  const endSession = useCallback(async () => {
    if (workingMemoryRef.current) {
      const wm = await workingMemoryRef.current.load();
      if (wm) {
        const activeMemoryAPI = new ActiveMemoryAPI();
        await activeMemoryAPI.createFromSession(wm);
        await workingMemoryRef.current.clear();
        sessionStorage.removeItem(WORKING_MEMORY_KEY);
      }
    }
  }, []);

  // Get current context for LLM
  const getContext = useCallback(async () => {
    if (workingMemoryRef.current) {
      return await workingMemoryRef.current.getContext();
    }
    return null;
  }, []);

  return {
    addUserMessage,
    addAssistantMessage,
    setUserIntent,
    addPendingAction,
    removePendingAction,
    endSession,
    getContext,
    sessionId: workingMemoryRef.current?.getSessionId(),
  };
}
