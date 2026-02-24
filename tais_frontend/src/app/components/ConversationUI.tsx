import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ConversationContainer } from './conversation/ConversationContainer';
import { useTensorFlow } from '../../hooks/useTensorFlow';
import { useConversationStore } from '../../hooks/useConversation';
import { Brain, MessageSquare, Cpu, Database, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const ConversationUI: React.FC = () => {
  const [isStarted, setIsStarted] = useState(false);
  const { isReady, isLoading, progress, error } = useTensorFlow();
  const sessions = useConversationStore(state => state.getAllSessions());
  const createSession = useConversationStore(state => state.createSession);

  const handleStart = () => {
    if (!isReady) {
      toast.error('Please wait for the AI model to load');
      return;
    }
    createSession();
    setIsStarted(true);
    toast.success('Interview session started!');
  };

  const handleResume = (sessionId: string) => {
    useConversationStore.getState().loadSession(sessionId);
    setIsStarted(true);
    toast.success('Session resumed');
  };

  if (isStarted) {
    return (
      <ConversationContainer 
        onClose={() => setIsStarted(false)} 
        showSidebar={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Skill Interview Assistant</h1>
          <p className="text-gray-600">
            AI-powered conversation to extract and analyze your professional skills
          </p>
        </div>

        {/* TensorFlow Status */}
        <Card className={isReady ? 'border-green-200 bg-green-50/50' : error ? 'border-red-200 bg-red-50/50' : ''}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isReady ? 'bg-green-100' : error ? 'bg-red-100' : 'bg-blue-100'
              }`}>
                {isReady ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : error ? (
                  <AlertCircle className="w-6 h-6 text-red-600" />
                ) : (
                  <Brain className="w-6 h-6 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  {isReady ? 'AI Model Ready' : error ? 'Loading Failed' : 'Loading AI Model'}
                </h3>
                <p className="text-sm text-gray-600">
                  {isReady 
                    ? 'Universal Sentence Encoder loaded successfully'
                    : error 
                      ? `Error: ${error.message}`
                      : 'Initializing TensorFlow.js and USE model...'}
                </p>
                {isLoading && (
                  <div className="mt-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">{progress}% complete</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Smart Conversation</h3>
              <p className="text-sm text-gray-600">Natural language processing with 3 guided questions</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-100 flex items-center justify-center">
                <Cpu className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Entity Extraction</h3>
              <p className="text-sm text-gray-600">Automatically identifies skills, technologies, and experience</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                <Database className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Persistent Storage</h3>
              <p className="text-sm text-gray-600">Conversations saved locally with export options</p>
            </CardContent>
          </Card>
        </div>

        {/* Previous Sessions */}
        {sessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Previous Sessions
              </CardTitle>
              <CardDescription>Resume or review your past conversations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sessions.slice(0, 5).map(session => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-sm">Session {session.id}</p>
                        <p className="text-xs text-gray-500">
                          {session.messages.length} messages • {new Date(session.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {session.extractedData.skills.length} skills
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResume(session.id)}
                      >
                        Resume
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Start Button */}
        <div className="text-center">
          <Button
            size="lg"
            onClick={handleStart}
            disabled={!isReady || isLoading}
            className="px-8 py-6 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Loading AI...
              </>
            ) : (
              <>
                <MessageSquare className="w-5 h-5 mr-2" />
                Start New Interview
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
