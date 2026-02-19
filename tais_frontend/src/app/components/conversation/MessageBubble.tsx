import React from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { User, Bot, Sparkles, Terminal, Shield } from 'lucide-react';
import type { Message, ExtractedEntity } from '../../../types/conversation';
import { motion } from 'motion/react';

interface MessageBubbleProps {
  message: Message;
  showEntities?: boolean;
}

const getEntityStyles = (type: ExtractedEntity['type']): string => {
  switch (type) {
    case 'skill':
      return 'border-[#3B82F6] text-[#3B82F6] bg-[#3B82F6]/5';
    case 'technology':
      return 'border-[#8B5CF6] text-[#8B5CF6] bg-[#8B5CF6]/5';
    case 'experience':
      return 'border-[#4ADE80] text-[#4ADE80] bg-[#4ADE80]/5';
    case 'duration':
      return 'border-[#F59E0B] text-[#F59E0B] bg-[#F59E0B]/5';
    case 'proficiency':
      return 'border-[#EC4899] text-[#EC4899] bg-[#EC4899]/5';
    case 'role':
      return 'border-[#6366F1] text-[#6366F1] bg-[#6366F1]/5';
    case 'company':
      return 'border-[#06B6D4] text-[#06B6D4] bg-[#06B6D4]/5';
    default:
      return 'border-[#262626] text-[#A1A1A1] bg-[#141415]';
  }
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, showEntities = true }) => {
  const isUser = message.role === 'user';
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-8`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded border ${isUser ? 'bg-white text-black border-white' : 'bg-[#141415] text-[#3B82F6] border-[#262626]'} flex items-center justify-center flex-shrink-0 shadow-sm`}>
        {isUser ? <User className="w-4 h-4" /> : <Terminal className="w-4 h-4" />}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'} space-y-2`}>
        {/* Label */}
        <div className="flex items-center gap-2 px-1">
          <label className="text-[9px] uppercase tracking-[0.2em] text-[#717171] font-bold">
            {isUser ? 'TRANSMISSION' : 'NEURAL_LINK'}
          </label>
          <span className="text-[9px] font-mono text-[#444] uppercase">{timestamp}</span>
        </div>

        {/* Bubble */}
        <div
          className={`px-5 py-3 rounded-lg text-sm leading-relaxed border ${
            isUser
              ? 'bg-[#141415] text-white border-[#3B82F6]/30'
              : 'bg-[#141415] text-[#EDEDED] border-[#262626]'
          } shadow-sm`}
        >
          {message.content}
        </div>

        {/* Extracted Entities */}
        {showEntities && isUser && message.entities && message.entities.length > 0 && (
          <div className="mt-3 w-full bg-[#0F0F10] border border-[#262626] rounded-md p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-[#717171] font-bold">
                <Sparkles className="w-3 h-3 text-[#3B82F6]" />
                <span>Extracted Telemetry</span>
              </div>
              <Badge variant="outline" className="text-[8px] border-[#262626] text-[#444]">NLP_V1</Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {message.entities.map((entity, index) => (
                <Badge
                  key={`${entity.type}-${index}`}
                  variant="outline"
                  className={`text-[9px] uppercase font-mono tracking-wider px-2 py-0.5 border ${getEntityStyles(entity.type)} transition-all hover:brightness-110`}
                >
                  {entity.value}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Intent & Sentiment */}
        {showEntities && isUser && (message.intent || message.sentiment !== undefined) && (
          <div className="flex gap-3 px-1">
            {message.intent && (
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-[#3B82F6]" />
                <span className="text-[9px] uppercase tracking-widest text-[#717171] font-bold">
                  INTENT: {message.intent}
                </span>
              </div>
            )}
            {message.sentiment !== undefined && (
              <div className="flex items-center gap-1.5">
                <div className={`w-1 h-1 rounded-full ${message.sentiment > 0.6 ? 'bg-[#4ADE80]' : message.sentiment < 0.4 ? 'bg-red-500' : 'bg-[#717171]'}`} />
                <span className="text-[9px] uppercase tracking-widest text-[#717171] font-bold">
                  SENTIMENT: {Math.round(message.sentiment * 100)}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
