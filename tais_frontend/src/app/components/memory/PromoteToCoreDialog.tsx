'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReflectiveMemoryAPI, CoreMemoryAPI } from '@/services/memory';
import type { ReflectiveMemory } from '@/services/memory/types';

interface Learning {
  type: string;
  content: string;
  confidence: number;
  evidence: string[];
  actionableImplication: string;
  applicableContexts: string[];
}

interface PromoteToCoreDialogProps {
  learning: Learning;
  memoryId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPromoted?: () => void;
}

export function PromoteToCoreDialog({ learning, memoryId, open, onOpenChange, onPromoted }: PromoteToCoreDialogProps) {
  const [mutability, setMutability] = useState<'eternal' | 'stable' | 'adaptive' | 'experimental'>('adaptive');
  const [promoting, setPromoting] = useState(false);

  const mutabilityOptions = [
    {
      value: 'eternal',
      label: 'Eternal',
      description: 'Core value that never changes (e.g., privacy preferences)',
      challengeLevel: 'Always challenged if contradicted',
      color: 'text-red-500',
    },
    {
      value: 'stable',
      label: 'Stable',
      description: 'Strong preference that rarely changes (e.g., communication style)',
      challengeLevel: 'Socratic challenge if contradicted',
      color: 'text-orange-500',
    },
    {
      value: 'adaptive',
      label: 'Adaptive',
      description: 'Tactical decision that may change (e.g., strategic focus)',
      challengeLevel: 'Gentle nudge if contradicted',
      color: 'text-blue-500',
    },
    {
      value: 'experimental',
      label: 'Experimental',
      description: 'Temporary rule that will change soon (e.g., sprint goals)',
      challengeLevel: 'No challenge, just reminder',
      color: 'text-gray-500',
    },
  ];

  const handlePromote = async () => {
    setPromoting(true);
    try {
      const coreAPI = new CoreMemoryAPI();
      await coreAPI.promote(memoryId, mutability);
      onPromoted?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to promote to core:', error);
    } finally {
      setPromoting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Promote to Core Memory</DialogTitle>
          <DialogDescription>
            Mark this learning as a critical preference that guides agent behavior.
          </DialogDescription>
        </DialogHeader>

        <Alert className="mb-4">
          <AlertTitle className="text-sm font-medium mb-1">{learning.content}</AlertTitle>
          <AlertDescription className="text-xs">
            Confidence: {Math.round(learning.confidence * 100)}%
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <Label className="text-sm font-medium">How stable is this preference?</Label>

          <RadioGroup value={mutability} onValueChange={(v) => setMutability(v as any)} className="space-y-3">
            {mutabilityOptions.map((option) => (
              <div
                key={option.value}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  mutability === option.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-gray-800'
                }`}
                onClick={() => setMutability(option.value as any)}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{option.label}</span>
                      <Badge variant="outline" className={option.color}>
                        {option.challengeLevel}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        <Alert variant="outline" className="mt-4">
          <AlertTitle className="text-xs">What does this mean?</AlertTitle>
          <AlertDescription className="text-xs">
            This classification determines how the agent challenges you if your behavior contradicts this memory.
            More stable memories get stronger challenges.
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePromote} disabled={promoting}>
            {promoting ? 'Promoting...' : 'Promote to Core Memory'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CoreMemoryCardProps {
  memory: {
    memoryId: string;
    content: string;
    mutability: string;
    promotedAt: string;
    confidence: number;
    evidence: string[];
    implications: string;
    applicableContexts: string[];
  };
  onDelete?: (id: string) => void;
}

export function CoreMemoryCard({ memory, onDelete }: CoreMemoryCardProps) {
  const mutabilityColors: Record<string, string> = {
    eternal: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    stable: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    adaptive: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    experimental: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  };

  return (
    <Card className="border-2 border-yellow-200 dark:border-yellow-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge className={mutabilityColors[memory.mutability] || 'bg-gray-100'}>
            {memory.mutability}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(memory.promotedAt).toLocaleDateString()}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="font-medium mb-2">{memory.content}</p>
        {memory.applicableContexts.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-2">
            {memory.applicableContexts.map((ctx) => (
              <Badge key={ctx} variant="outline" className="text-xs">
                {ctx}
              </Badge>
            ))}
          </div>
        )}
        {memory.confidence > 0 && (
          <p className="text-xs text-muted-foreground">
            Confidence: {Math.round(memory.confidence * 100)}%
          </p>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-red-500 hover:text-red-700"
            onClick={() => onDelete(memory.memoryId)}
          >
            Remove
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default PromoteToCoreDialog;
