import React, { useEffect, useRef, useCallback } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, X, Download, Trash2, MessageSquare, ShieldCheck, Zap, Terminal } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { InputArea } from './InputArea';
import { FixedQuestions } from './FixedQuestions';
import { useConversationStore } from '../../../hooks/useConversation';
import { useWorkingMemory } from '../../../hooks/useWorkingMemory';
import { extractEntities, analyzeSemantics } from '../../../services/entityExtraction';
import { calculateSimilarity, classifyIntent } from '../../../services/tensorflow';
import { FIXED_QUESTIONS } from '../../../types/conversation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface ConversationContainerProps {
  onClose?: () => void;
  showSidebar?: boolean;
}

const intentDefinitions = {
  'describing_experience': [
    'I worked on', 'I have experience', 'I built', 'I developed',
    'I was responsible for', 'my role was', 'I led', 'I managed'
  ],
  'listing_skills': [
    'I know', 'I am proficient in', 'my skills include', 'I am good at',
    'I have expertise in', 'I specialize in', 'I am experienced with'
  ],
  'expressing_goals': [
    'I want to', 'I am looking for', 'my goal is', 'I hope to',
    'I aim to', 'I aspire', 'in the future', 'next step'
  ],
  'clarifying': [
    'I mean', 'in other words', 'to clarify', 'let me explain',
    'what I meant was', 'essentially'
  ]
};

export const ConversationContainer: React.FC<ConversationContainerProps> = ({
  onClose,
  showSidebar = true
}) => {
  const {
    messages,
    currentQuestionIndex,
    isProcessing,
    currentSessionId,
    addMessage,
    advanceQuestion,
    getCurrentQuestion,
    createSession
  } = useConversationStore();

  // Memory: Track conversation for persistent memory
  const { addUserMessage, addAssistantMessage, endSession } = useWorkingMemory(currentSessionId || undefined);

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize session if needed
  useEffect(() => {
    if (!currentSessionId) {
      createSession();
    }
  }, [currentSessionId, createSession]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Process user message
  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isProcessing) return;

    // Extract entities and analyze
    const entities = extractEntities(content);
    const semantics = analyzeSemantics(content);
    
    // Classify intent using TensorFlow
    let intent = semantics.intent;
    try {
      const intentResult = await classifyIntent(content, intentDefinitions);
      if (intentResult && intentResult.confidence > 0.5) {
        intent = intentResult.intent;
      }
    } catch (error) {
      console.error('Intent classification failed:', error);
    }

    // Add user message
    addMessage(content, 'user', entities.map(e => ({ ...e, intent, sentiment: semantics.sentiment })));
    
    // Memory: Track user message
    addUserMessage(content);

    // Check similarity with current question
    const currentQuestion = getCurrentQuestion();
    if (currentQuestion) {
      try {
        const similarity = await calculateSimilarity(content, currentQuestion.question);
        console.log(`Similarity with current question: ${similarity}`);
      } catch (error) {
        console.error('Similarity calculation failed:', error);
      }
    }

    // Simulate AI response
    const processingTimeout = setTimeout(() => {
      let response = '';
      
      if (currentQuestionIndex < FIXED_QUESTIONS.length - 1) {
        // Acknowledge the response and move to next question
        const entitiesFound = entities && entities.length > 0 
          ? `I noted your experience with ${entities.map(e => e.value).join(', ')}. `
          : '';
        
        response = `${entitiesFound}Thank you for sharing that. `;
        
        // Move to next question
        advanceQuestion();
      } else {
        // Final response
        const extractedSkills = entities.filter(e => e.type === 'skill' || e.type === 'technology');
        response = `Thank you for completing the interview! I've identified ${extractedSkills.length} skills and technologies from our conversation. You can review your profile in the dashboard.`;
        
        toast.success('Interview Complete!', {
          description: 'Your profile has been updated with the extracted information.'
        });
      }

      addMessage(response, 'assistant');
      
      // Memory: Track assistant response
      addAssistantMessage(response);
    }, 1000);

    return () => clearTimeout(processingTimeout);
  }, [addMessage, addUserMessage, addAssistantMessage, advanceQuestion, currentQuestionIndex, getCurrentQuestion, isProcessing]);

  const handleExport = () => {
    const data = JSON.stringify({
      messages,
      timestamp: Date.now(),
      sessionId: currentSessionId
    }, null, 2);
    
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${currentSessionId || 'export'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Conversation exported');
  };

  const handleClear = async () => {
    if (confirm('Are you sure you want to clear this conversation?')) {
      // Memory: Save session before clearing
      await endSession();
      useConversationStore.getState().reset();
      createSession();
      toast.success('Conversation cleared');
    }
  };

  return (
    <div className="flex h-full bg-[#0A0A0B] animate-in fade-in duration-700">
      {/* Sidebar with Questions */}
      {showSidebar && (
        <aside className="w-80 bg-[#0F0F10] border-r border-[#262626] hidden lg:flex flex-col">
          <div className="p-6 border-b border-[#262626]">
            <label className="text-[10px] uppercase tracking-[0.3em] text-[#3B82F6] font-bold block mb-1">Navigation</label>
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">Interview Path</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <FixedQuestions
              currentIndex={currentQuestionIndex}
              completedIndices={messages
                .filter(m => m.role === 'assistant' && m.content !== FIXED_QUESTIONS[0]?.question)
                .map((_, i) => i)}
            />
          </div>
          <div className="p-4 border-t border-[#262626] bg-[#0A0A0B]/50">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded border border-white/10">
              <ShieldCheck className="w-4 h-4 text-[#4ADE80]" />
              <div className="text-[10px] uppercase tracking-widest font-bold text-[#A1A1A1]">Session Secured</div>
            </div>
          </div>
        </aside>
      )}

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="bg-[#141415] border-b border-[#262626] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-md bg-[#0A0A0B] border border-[#262626] flex items-center justify-center">
              <Terminal className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-white">Neural Interface</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
                <p className="text-[10px] font-mono text-[#717171] uppercase tracking-widest">
                  {currentSessionId ? `SES_ID: ${currentSessionId}` : 'ESTABLISHING...'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              disabled={messages.length === 0}
              className="px-3 py-1.5 border border-[#262626] rounded text-[9px] font-bold uppercase tracking-[0.2em] text-[#A1A1A1] hover:text-white hover:bg-white/5 transition-all disabled:opacity-30"
            >
              Export
            </button>
            <button
              onClick={handleClear}
              disabled={messages.length === 0}
              className="px-3 py-1.5 border border-[#262626] rounded text-[9px] font-bold uppercase tracking-[0.2em] text-red-500 hover:bg-red-500/5 transition-all disabled:opacity-30"
            >
              Purge
            </button>
            {onClose && (
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-white/5 rounded transition-colors"
              >
                <X className="w-4 h-4 text-[#717171]" />
              </button>
            )}
          </div>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1 bg-[#0A0A0B]" ref={scrollRef}>
          <div className="max-w-3xl mx-auto py-10 px-6 space-y-8">
            <AnimatePresence initial={false}>
              {messages.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-20 text-center border border-dashed border-[#262626] rounded-xl bg-[#141415]/30"
                >
                  <div className="w-16 h-16 bg-[#0A0A0B] border border-[#262626] rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <MessageSquare className="w-8 h-8 text-[#3B82F6]" />
                  </div>
                  <h3 className="text-lg font-bold uppercase tracking-widest text-white mb-2">Initiate Agent Protocol</h3>
                  <p className="text-[#717171] text-xs uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                    Awaiting user telemetry. Please respond to the initial inquiry to begin profiling.
                  </p>
                </motion.div>
              ) : (
                messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </ScrollArea>

        {/* Input Area Wrapper */}
        <footer className="p-6 bg-gradient-to-t from-[#0A0A0B] to-transparent border-t border-[#262626]/30">
          <div className="max-w-3xl mx-auto">
            <InputArea
              onSend={handleSendMessage}
              isProcessing={isProcessing}
              disabled={currentQuestionIndex >= FIXED_QUESTIONS.length}
              placeholder={
                currentQuestionIndex >= FIXED_QUESTIONS.length
                  ? 'PROTOCOL COMPLETE.'
                  : 'ENTER RESPONSE...'
              }
            />
            <div className="flex justify-between items-center mt-4">
              <div className="flex gap-4">
                <Badge variant="outline" className="text-[8px] border-[#262626] text-[#717171] tracking-widest">
                  ENC: AES-256
                </Badge>
                <Badge variant="outline" className="text-[8px] border-[#262626] text-[#717171] tracking-widest">
                  MODE: DYNAMIC
                </Badge>
              </div>
              <p className="text-[8px] text-[#444] uppercase tracking-[0.3em] font-bold">
                ThinkAgents Secure Uplink
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default ConversationContainer;
