import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Entity {
  type: string;
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  entities?: Entity[];
  embedding?: number[];
  metadata?: {
    processingTime?: number;
    modelVersion?: string;
  };
}

export interface ConversationState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sessionId: string;
  entities: Map<string, Entity[]>;
  
  // Actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  deleteMessage: (id: string) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSessionId: (sessionId: string) => void;
  addEntities: (messageId: string, entities: Entity[]) => void;
  getEntitiesByType: (type: string) => Entity[];
  getAllEntities: () => Entity[];
}

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      messages: [],
      isLoading: false,
      error: null,
      sessionId: generateId(),
      entities: new Map(),

      addMessage: (message) => {
        const newMessage: Message = {
          ...message,
          id: generateId(),
          timestamp: Date.now(),
        };
        
        set((state) => ({
          messages: [...state.messages, newMessage],
        }));

        // If message has entities, add them to the entities map
        if (message.entities && message.entities.length > 0) {
          get().addEntities(newMessage.id, message.entities);
        }

        return newMessage.id;
      },

      updateMessage: (id, updates) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
          ),
        }));
      },

      deleteMessage: (id) => {
        set((state) => {
          const newEntities = new Map(state.entities);
          newEntities.delete(id);
          return {
            messages: state.messages.filter((msg) => msg.id !== id),
            entities: newEntities,
          };
        });
      },

      clearMessages: () => {
        set({
          messages: [],
          entities: new Map(),
          sessionId: generateId(),
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      setSessionId: (sessionId) => set({ sessionId }),

      addEntities: (messageId, entities) => {
        set((state) => {
          const newEntities = new Map(state.entities);
          newEntities.set(messageId, entities);
          return { entities: newEntities };
        });
      },

      getEntitiesByType: (type) => {
        const allEntities: Entity[] = [];
        get().entities.forEach((entities) => {
          allEntities.push(...entities.filter((e) => e.type === type));
        });
        return allEntities;
      },

      getAllEntities: () => {
        const allEntities: Entity[] = [];
        get().entities.forEach((entities) => {
          allEntities.push(...entities);
        });
        return allEntities;
      },
    }),
    {
      name: 'tais-conversation-storage',
      partialize: (state) => ({
        messages: state.messages,
        sessionId: state.sessionId,
        entities: Array.from(state.entities.entries()),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert entities array back to Map after rehydration
          state.entities = new Map(state.entities as [string, Entity[]][]);
        }
      },
    }
  )
);
