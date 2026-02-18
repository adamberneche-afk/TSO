import React from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { User, Bot, Sparkles } from 'lucide-react';
import type { Message, ExtractedEntity } from '../../../types/conversation';

interface MessageBubbleProps {
  message: Message;
  showEntities?: boolean;
}

const getEntityColor = (type: ExtractedEntity['type']): string => {
  switch (type) {
    case 'skill':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'technology':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'experience':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'duration':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'proficiency':
      return 'bg-pink-100 text-pink-800 border-pink-200';
    case 'role':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'company':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    case 'date':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getEntityIcon = (type: ExtractedEntity['type']): string => {
  switch (type) {
    case 'skill':
      return '🎯';
    case 'technology':
      return '💻';
    case 'experience':
      return '💼';
    case 'duration':
      return '⏱️';
    case 'proficiency':
      return '📊';
    case 'role':
      return '👤';
    case 'company':
      return '🏢';
    case 'date':
      return '📅';
    default:
      return '📌';
  }
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, showEntities = true }) => {
  const isUser = message.role === 'user';
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}>
      {/* Avatar */}
      <Avatar className={`w-8 h-8 ${isUser ? 'bg-blue-500' : 'bg-purple-500'}`}>
        <AvatarFallback className={isUser ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Bubble */}
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-blue-500 text-white rounded-br-md'
              : 'bg-gray-100 text-gray-800 rounded-bl-md'
          }`}
        >
          {message.content}
        </div>

        {/* Timestamp */}
        <span className="text-xs text-gray-400 mt-1 px-1">
          {timestamp}
        </span>

        {/* Extracted Entities */}
        {showEntities && isUser && message.entities && message.entities.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Extracted entities:</span>
            </div>
            {message.entities.map((entity, index) => (
              <Badge
                key={`${entity.type}-${index}`}
                variant="outline"
                className={`text-xs px-2 py-0.5 ${getEntityColor(entity.type)}`}
                title={`Confidence: ${Math.round(entity.confidence * 100)}%`}
              >
                <span className="mr-1">{getEntityIcon(entity.type)}</span>
                {entity.value}
              </Badge>
            ))}
          </div>
        )}

        {/* Intent & Sentiment (for user messages) */}
        {showEntities && isUser && (message.intent || message.sentiment !== undefined) && (
          <div className="mt-1 flex gap-2 text-xs text-gray-400">
            {message.intent && (
              <span className="bg-gray-50 px-2 py-0.5 rounded">
                Intent: {message.intent}
              </span>
            )}
            {message.sentiment !== undefined && (
              <span 
                className={`px-2 py-0.5 rounded ${
                  message.sentiment > 0.6 
                    ? 'bg-green-50 text-green-600' 
                    : message.sentiment < 0.4 
                      ? 'bg-red-50 text-red-600' 
                      : 'bg-gray-50 text-gray-600'
                }`}
              >
                Sentiment: {Math.round(message.sentiment * 100)}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
