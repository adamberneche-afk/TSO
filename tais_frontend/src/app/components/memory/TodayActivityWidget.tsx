'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ActiveMemoryAPI } from '@/services/memory/memoryAPI';

interface Session {
  id: string;
  appContext: string;
  durationMinutes: number;
  summary: string;
  messageCount: number;
  timestamp: Date;
}

export function TodayActivityWidget() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    loadTodaySessions();
  }, []);

  const loadTodaySessions = async () => {
    try {
      const activeMemory = new ActiveMemoryAPI();
      const memories = await activeMemory.listForToday();

      const sessionsData: Session[] = memories.map(m => ({
        id: m.memoryId,
        appContext: m.sessionSummary.appContext,
        durationMinutes: m.sessionSummary.durationMinutes,
        summary: m.sessionSummary.conversationSummary,
        messageCount: m.interactions.length,
        timestamp: new Date(m.timestamp),
      }));

      setSessions(sessionsData);
    } catch (error) {
      console.error('Failed to load today sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full mt-2" />
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No activity today. Start a conversation with your agent!
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const totalMessages = sessions.reduce((acc, s) => acc + s.messageCount, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Today&apos;s Activity</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">{sessions.length} sessions</Badge>
            <Badge variant="secondary">{totalMinutes}m</Badge>
            <Badge variant="secondary">{totalMessages} messages</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sessions.map(session => (
            <div
              key={session.id}
              className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              onClick={() => setExpanded(expanded === session.id ? null : session.id)}
            >
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">
                  {session.appContext}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {session.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-xs text-muted-foreground">
                  {session.durationMinutes}m
                </span>
              </div>
              <p className="text-sm line-clamp-2">
                {session.summary}
              </p>
              
              {expanded === session.id && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    {session.messageCount} messages exchanged
                  </p>
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default TodayActivityWidget;
