// TAIS Platform - Keyboard Shortcuts Hook

import { useEffect } from 'react';

interface KeyboardShortcuts {
  onNext?: () => void;
  onPrev?: () => void;
  onEscape?: () => void;
  onSave?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onNext,
  onPrev,
  onEscape,
  onSave,
  enabled = true,
}: KeyboardShortcuts) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || 
                     target.tagName === 'TEXTAREA' || 
                     target.isContentEditable;

      // Escape key
      if (event.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }

      // Skip other shortcuts if in input
      if (isInput) return;

      // Arrow navigation
      if (event.key === 'ArrowRight' && onNext && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        onNext();
      } else if (event.key === 'ArrowLeft' && onPrev && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        onPrev();
      }

      // Cmd/Ctrl + S to save/download
      if ((event.ctrlKey || event.metaKey) && event.key === 's' && onSave) {
        event.preventDefault();
        onSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onEscape, onSave, enabled]);
}
