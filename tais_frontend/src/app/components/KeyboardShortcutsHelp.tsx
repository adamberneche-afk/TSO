// TAIS Platform - Keyboard Shortcuts Help

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Keyboard } from 'lucide-react';

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Show shortcuts with Cmd/Ctrl + /
      if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const shortcuts = [
    {
      keys: ['←', '→'],
      description: 'Navigate between steps',
    },
    {
      keys: ['Esc'],
      description: 'Exit interview (with confirmation)',
    },
    {
      keys: ['Cmd/Ctrl', 'S'],
      description: 'Download configuration (on review step)',
    },
    {
      keys: ['Cmd/Ctrl', '/'],
      description: 'Show this help dialog',
    },
  ];

  return (
    <>
      {/* Floating help button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#333333] hover:border-[#3B82F6] flex items-center justify-center text-[#888888] hover:text-white transition-all shadow-lg z-50"
        title="Keyboard shortcuts (Cmd/Ctrl + /)"
      >
        <Keyboard className="w-5 h-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#333333] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-[#3B82F6]" />
              Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#111111] border border-[#333333]"
              >
                <span className="text-[#888888]">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, i) => (
                    <React.Fragment key={i}>
                      <kbd className="px-2 py-1 rounded bg-[#222222] border border-[#333333] text-white text-xs font-mono">
                        {key}
                      </kbd>
                      {i < shortcut.keys.length - 1 && (
                        <span className="text-[#555555] text-xs">+</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-[#888888] text-center">
            Press any key to close this dialog
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
