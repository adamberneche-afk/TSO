'use client';

import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DriftAnalysis } from '@/services/memory/driftDetector';

interface DriftAlertWidgetProps {
  analysis: DriftAnalysis | null;
  onContinue: () => void;
  onDismiss: () => void;
  onShowEvidence: () => void;
}

export function DriftAlertWidget({ analysis, onContinue, onDismiss, onShowEvidence }: DriftAlertWidgetProps) {
  if (!analysis || !analysis.hasDrift) {
    return null;
  }

  const { severity, strategy, evidence } = analysis;

  if (strategy === 'gentle_nudge') {
    return (
      <GentleNudgeAlert
        evidence={evidence}
        onContinue={onContinue}
        onShowEvidence={onShowEvidence}
      />
    );
  }

  if (strategy === 'socratic_challenge') {
    return (
      <SocraticChallengeDialog
        analysis={analysis}
        onContinue={onContinue}
        onShowEvidence={onShowEvidence}
      />
    );
  }

  if (strategy === 'strong_challenge') {
    return (
      <StrongChallengeDialog
        analysis={analysis}
        onContinue={onContinue}
      />
    );
  }

  return null;
}

function GentleNudgeAlert({ 
  evidence, 
  onContinue, 
  onShowEvidence 
}: { 
  evidence: DriftAnalysis['evidence']; 
  onContinue: () => void; 
  onShowEvidence: () => void;
}) {
  const pattern = evidence.recentPattern;

  return (
    <Alert className="mb-4 border-blue-300 bg-blue-50 dark:bg-blue-950">
      <AlertTitle className="flex items-center gap-2">
        <span>Pattern Notice</span>
        <Badge variant="outline" className="text-xs">Low Severity</Badge>
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          {pattern 
            ? `You've been ${pattern.description.toLowerCase()} for a while. This is your first different request.`
            : 'We noticed a subtle shift in your behavior.'}
        </p>
        
        <div className="flex gap-2">
          <Button size="sm" onClick={onContinue}>
            Continue Anyway
          </Button>
          <Button size="sm" variant="outline" onClick={onShowEvidence}>
            Tell Me More
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

function SocraticChallengeDialog({ 
  analysis, 
  onContinue, 
  onShowEvidence 
}: { 
  analysis: DriftAnalysis; 
  onContinue: () => void; 
  onShowEvidence: () => void;
}) {
  const [open, setOpen] = useState(true);
  const contradicted = analysis.evidence.contradictedMemories[0];

  const handleContinue = () => {
    setOpen(false);
    onContinue();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>I'm Confused</span>
            <Badge variant="outline" className="text-xs">Medium Severity</Badge>
          </DialogTitle>
          <DialogDescription>
            Your request seems to contradict a core memory.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {contradicted && (
            <Alert variant="warning">
              <AlertTitle className="text-sm font-medium">Core Memory ({contradicted.mutability})</AlertTitle>
              <AlertDescription className="text-sm">
                "{contradicted.content}"
              </AlertDescription>
              <AlertDescription className="text-xs text-muted-foreground mt-1">
                Promoted: {new Date(contradicted.promotedAt).toLocaleDateString()}
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm">
            <p>But you're now asking for something different.</p>
            <p className="text-muted-foreground mt-1">Has your approach changed?</p>
          </div>

          <Button variant="outline" size="sm" onClick={onShowEvidence}>
            Show Evidence
          </Button>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleContinue}>
            Yes, I Changed My Mind
          </Button>
          <Button onClick={handleContinue}>
            This is an Exception
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StrongChallengeDialog({ 
  analysis, 
  onContinue 
}: { 
  analysis: DriftAnalysis; 
  onContinue: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [explanation, setExplanation] = useState('');
  const [mustCancel, setMustCancel] = useState(false);

  const contradicted = analysis.evidence.contradictedMemories[0];

  const handleOverride = () => {
    if (!explanation.trim()) {
      alert('Please explain why this situation is different.');
      return;
    }
    // Would save the override learning here
    setOpen(false);
    onContinue();
  };

  const handleCancel = () => {
    setMustCancel(true);
    setOpen(false);
  };

  if (mustCancel) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen} disableEscapeKeyDown>
      <DialogContent className="sm:max-w-[500px]" hideClose>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Strong Concern</span>
            <Badge variant="destructive" className="text-xs">High Severity</Badge>
          </DialogTitle>
          <DialogDescription>
            This request contradicts a recent, high-confidence constraint.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {contradicted && (
            <Alert variant="destructive">
              <AlertTitle className="text-sm font-medium">
                Core Memory ({contradicted.mutability}) - {contradicted.mutability === 'eternal' ? 'Eternal' : 'Recent'}
              </AlertTitle>
              <AlertDescription className="text-sm">
                "{contradicted.content}"
              </AlertDescription>
              <AlertDescription className="text-xs text-muted-foreground mt-1">
                Promoted: {new Date(contradicted.promotedAt).toLocaleDateString()}
              </AlertDescription>
            </Alert>
          )}

          <div>
            <label className="text-sm font-medium block mb-2">
              Why is this situation different? (Required)
            </label>
            <Textarea
              placeholder="Help me understand when to apply this exception..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleOverride}>
            Override (Requires Explanation)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DriftAlertWidget;
