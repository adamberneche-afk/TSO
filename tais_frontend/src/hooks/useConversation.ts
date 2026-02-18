import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message, ConversationSession, FixedQuestion, ExtractedEntity } from '../types/conversation';
import { FIXED_QUESTIONS } from '../types/conversation';

interface ConversationState {
  sessions: Record<string, ConversationSession>;
  currentSessionId: string | null;
  isProcessing: boolean;
  currentQuestionIndex: number;
  messages: Message[];
  
  // Actions
  createSession: () => string;
  loadSession: (sessionId: string) => void;
  addMessage: (content: string, role: 'user' | 'assistant', entities?: ExtractedEntity[]) => void;
  getCurrentQuestion: () => FixedQuestion | null;
  advanceQuestion: () => void;
  reset: () => void;
  getSession: (sessionId: string) => ConversationSession | undefined;
  getAllSessions: () => ConversationSession[];
  deleteSession: (sessionId: string) => void;
}

const createNewSession = (): ConversationSession => ({
  id: crypto.randomUUID(),
  messages: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  extractedData: {
    skills: [],
    experience: [],
    technologies: [],
    proficiencies: {}
  }
});

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      sessions: {},
      currentSessionId: null,
      isProcessing: false,
      currentQuestionIndex: 0,
      messages: [],

      createSession: () => {
        const session = createNewSession();
        set((state) => ({
          sessions: { ...state.sessions, [session.id]: session },
          currentSessionId: session.id,
          messages: [{
            id: crypto.randomUUID(),
            content: FIXED_QUESTIONS[0].question,
            role: 'assistant',
            timestamp: Date.now()
          }],
          currentQuestionIndex: 0,
          isProcessing: false
        }));
        return session.id;
      },

      loadSession: (sessionId: string) => {
        const session = get().sessions[sessionId];
        if (session) {
          set({
            currentSessionId: sessionId,
            messages: session.messages,
            currentQuestionIndex: Math.min(session.messages.filter(m => m.role === 'user').length, FIXED_QUESTIONS.length - 1)
          });
        }
      },

      addMessage: (content: string, role: 'user' | 'assistant', entities?: ExtractedEntity[]) => {
        const { currentSessionId, sessions } = get();
        if (!currentSessionId) return;

        const newMessage: Message = {
          id: crypto.randomUUID(),
          content,
          role,
          timestamp: Date.now(),
          entities
        };

        const updatedMessages = [...get().messages, newMessage];
        
        set((state) => ({
          messages: updatedMessages,
          sessions: {
            ...state.sessions,
            [currentSessionId]: {
              ...state.sessions[currentSessionId],
              messages: updatedMessages,
              updatedAt: Date.now()
            }
          }
        }));

        // Update extracted data if entities are provided
        if (entities && entities.length > 0) {
          const session = sessions[currentSessionId];
          const updatedData = { ...session.extractedData };
          
          entities.forEach(entity => {
            switch (entity.type) {
              case 'skill':
                if (!updatedData.skills.includes(entity.value)) {
                  updatedData.skills.push(entity.value);
                }
                break;
              case 'technology':
                if (!updatedData.technologies.includes(entity.value)) {
                  updatedData.technologies.push(entity.value);
                }
                break;
              case 'experience':
                if (!updatedData.experience.includes(entity.value)) {
                  updatedData.experience.push(entity.value);
                }
                break;
              case 'proficiency':
                updatedData.proficiencies[entity.value] = entity.confidence;
                break;
            }
          });

          set((state) => ({
            sessions: {
              ...state.sessions,
              [currentSessionId]: {
                ...state.sessions[currentSessionId],
                extractedData: updatedData
              }
            }
          }));
        }
      },

      getCurrentQuestion: () => {
        const { currentQuestionIndex } = get();
        return currentQuestionIndex < FIXED_QUESTIONS.length ? FIXED_QUESTIONS[currentQuestionIndex] : null;
      },

      advanceQuestion: () => {
        const { currentQuestionIndex, currentSessionId } = get();
        if (currentQuestionIndex < FIXED_QUESTIONS.length - 1) {
          const nextIndex = currentQuestionIndex + 1;
          const nextQuestion = FIXED_QUESTIONS[nextIndex];
          
          set((state) => ({
            currentQuestionIndex: nextIndex,
            messages: [...state.messages, {
              id: crypto.randomUUID(),
              content: nextQuestion.question,
              role: 'assistant',
              timestamp: Date.now()
            }]
          }));
        }
      },

      reset: () => set({
        currentSessionId: null,
        isProcessing: false,
        currentQuestionIndex: 0,
        messages: []
      }),

      getSession: (sessionId: string) => get().sessions[sessionId],
      
      getAllSessions: () => Object.values(get().sessions).sort((a, b) => b.updatedAt - a.updatedAt),
      
      deleteSession: (sessionId: string) => {
        set((state) => {
          const { [sessionId]: _, ...remainingSessions } = state.sessions;
          return {
            sessions: remainingSessions,
            currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId
          };
        });
      }
    }),
    {
      name: 'conversation-storage',
      partialize: (state) => ({ sessions: state.sessions })
    }
  )
);
