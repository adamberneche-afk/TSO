import React, { useEffect, useRef, useCallback } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Loader2, X, Download, Trash2 } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { InputArea } from './InputArea';
import { FixedQuestions } from './FixedQuestions';
import { useConversationStore } from '../../../hooks/useConversation';
import { extractEntities, analyzeSemantics } from '../../../services/entityExtraction';
import { calculateSimilarity, classifyIntent } from '../../../services/tensorflow';
import { FIXED_QUESTIONS } from '../../../types/conversation';
import { toast } from 'sonner';

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
        const entitiesFound = entities.length > 0 
          ? `I noted your experience with ${entities.slice(0, 3).map(e => e.value).join(', ')}. `
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
    }, 1000);

    return () => clearTimeout(processingTimeout);
  }, [addMessage, advanceQuestion, currentQuestionIndex, getCurrentQuestion, isProcessing]);

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
    a.download = `conversation-${currentSessionId?.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Conversation exported');
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear this conversation?')) {
      useConversationStore.getState().reset();
      createSession();
      toast.success('Conversation cleared');
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-50">
      {/* Sidebar with Questions */}
      {showSidebar && (
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <FixedQuestions
            currentIndex={currentQuestionIndex}
            completedIndices={messages
              .filter(m => m.role === 'assistant' && m.content !== FIXED_QUESTIONS[0]?.question)
              .map((_, i) => i)}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Skill Interview</h2>
              <p className="text-xs text-gray-500">
                {currentSessionId ? `Session: ${currentSessionId.slice(0, 8)}` : 'Starting new session...'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={messages.length === 0}
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={messages.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-2xl">👋</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Welcome to Your Skill Interview</h3>
                <p className="text-gray-600 text-sm">
                  I'll ask you a few questions about your professional background and skills. 
                  Your responses will be analyzed to build your skill profile.
                </p>
              </Card>
            ) : (
              messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <InputArea
          onSend={handleSendMessage}
          isProcessing={isProcessing}
          disabled={currentQuestionIndex >= FIXED_QUESTIONS.length}
          placeholder={
            currentQuestionIndex >= FIXED_QUESTIONS.length
              ? 'Interview complete. Thank you!'
              : 'Type your response...'
          }
        />
      </div>
    </div>
  );
};
