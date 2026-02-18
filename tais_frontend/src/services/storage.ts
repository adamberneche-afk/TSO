import type { ConversationSession } from '../types/conversation';

const STORAGE_KEY = 'conversation_sessions';

export const storageService = {
  // Save all sessions to localStorage
  saveSessions: (sessions: Record<string, ConversationSession>): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save sessions to localStorage:', error);
      // If storage is full, remove old sessions
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        const oldestSessions = Object.values(sessions)
          .sort((a, b) => a.updatedAt - b.updatedAt)
          .slice(0, Math.ceil(Object.keys(sessions).length / 2));
        
        const reducedSessions: Record<string, ConversationSession> = {};
        Object.values(sessions).forEach(session => {
          if (!oldestSessions.find(s => s.id === session.id)) {
            reducedSessions[session.id] = session;
          }
        });
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reducedSessions));
      }
    }
  },

  // Load all sessions from localStorage
  loadSessions: (): Record<string, ConversationSession> => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Failed to load sessions from localStorage:', error);
      return {};
    }
  },

  // Save a single session
  saveSession: (session: ConversationSession): void => {
    try {
      const sessions = storageService.loadSessions();
      sessions[session.id] = session;
      storageService.saveSessions(sessions);
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  },

  // Get a single session
  getSession: (sessionId: string): ConversationSession | null => {
    try {
      const sessions = storageService.loadSessions();
      return sessions[sessionId] || null;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  },

  // Delete a session
  deleteSession: (sessionId: string): void => {
    try {
      const sessions = storageService.loadSessions();
      delete sessions[sessionId];
      storageService.saveSessions(sessions);
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  },

  // Clear all sessions
  clearAllSessions: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear sessions:', error);
    }
  },

  // Get storage usage info
  getStorageInfo: (): { used: number; total: number; sessions: number } => {
    try {
      const data = localStorage.getItem(STORAGE_KEY) || '';
      const used = new Blob([data]).size;
      // localStorage is typically limited to 5-10MB
      const total = 5 * 1024 * 1024; // 5MB estimate
      const sessions = Object.keys(storageService.loadSessions()).length;
      
      return { used, total, sessions };
    } catch (error) {
      return { used: 0, total: 5 * 1024 * 1024, sessions: 0 };
    }
  },

  // Export sessions as JSON
  exportSessions: (): string => {
    const sessions = storageService.loadSessions();
    return JSON.stringify(sessions, null, 2);
  },

  // Import sessions from JSON
  importSessions: (json: string): boolean => {
    try {
      const sessions = JSON.parse(json);
      if (typeof sessions === 'object' && sessions !== null) {
        storageService.saveSessions(sessions);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import sessions:', error);
      return false;
    }
  }
};
