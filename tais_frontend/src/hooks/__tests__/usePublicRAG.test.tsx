// @vitest-environment jsdom
//
// Regression tests for two usePublicRAG bugs.
//
// 1. usePublicRAG()'s mount effect had no way to opt out of auto-calling
//    store.initialize() (a MetaMask signature prompt) -- any component
//    that called the hook at all triggered it on mount, regardless of
//    what that component actually wanted. Dashboard.tsx's own code
//    comment says "Don't auto-initialize RAG on mount -- only when user
//    clicks Edit or Add RAG", but merely calling usePublicRAG() broke
//    that promise every time Dashboard mounted.
// 2. usePublicRAGUpload's progress-simulating setInterval was only
//    cleared on the success path. A failed upload skipped straight to
//    the catch block, leaving the interval running forever.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const initialize = vi.fn().mockResolvedValue(undefined);
const uploadDocument = vi.fn();

vi.mock('zustand', async () => {
  const actual = await vi.importActual<typeof import('zustand')>('zustand');
  return actual;
});

vi.mock('../../services/rag/publicRAGClient', () => ({
  getPublicRAGClient: () => ({}),
}));
vi.mock('../../services/rag/e2eeEncryption', () => ({
  getE2EEEncryptionService: () => ({ getPublicKey: () => null }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { usePublicRAGStore, usePublicRAG, usePublicRAGUpload } from '../usePublicRAG';

describe('usePublicRAG auto-initialize opt-out', () => {
  beforeEach(() => {
    initialize.mockClear();
    usePublicRAGStore.setState({
      isInitialized: false,
      isAuthenticating: false,
      initialize,
    } as any);
  });

  it('does not call initialize on mount when autoInitialize is false', async () => {
    renderHook(() => usePublicRAG(false));

    // Give any errant effect a tick to fire.
    await act(async () => {});

    expect(initialize).not.toHaveBeenCalled();
  });

  it('still auto-initializes by default, for callers that want it', async () => {
    renderHook(() => usePublicRAG());

    await waitFor(() => expect(initialize).toHaveBeenCalledTimes(1));
  });
});

describe('usePublicRAGUpload interval cleanup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    uploadDocument.mockReset();
    usePublicRAGStore.setState({ uploadDocument } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears the progress interval when the upload fails', async () => {
    uploadDocument.mockRejectedValue(new Error('upload failed'));
    const { result } = renderHook(() => usePublicRAGUpload());

    await act(async () => {
      await expect(result.current.upload('t', 'c', false, [])).rejects.toThrow('upload failed');
    });

    const progressAfterFailure = result.current.uploadProgress;

    // If the interval were still running, advancing time would keep
    // incrementing uploadProgress via setUploadProgress. Render again
    // (renderHook doesn't auto re-render on state set outside React) by
    // advancing timers and checking the hook's own reported progress is
    // unchanged rather than climbing toward 90.
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.uploadProgress).toBe(progressAfterFailure);
    expect(result.current.isUploading).toBe(false);
  });

  it('still reaches 100 and resets on a successful upload', async () => {
    uploadDocument.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePublicRAGUpload());

    await act(async () => {
      await result.current.upload('t', 'c', false, []);
    });

    expect(result.current.uploadProgress).toBe(100);

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(result.current.uploadProgress).toBe(0);
    expect(result.current.isUploading).toBe(false);
  });
});
