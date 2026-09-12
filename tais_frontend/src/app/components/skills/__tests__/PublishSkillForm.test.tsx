// @vitest-environment jsdom
//
// Covers the real skill-publishing flow (docs/DOCS_VS_CODEBASE.md row 22):
// gated behind a connected wallet, client-side validation matching the
// server's Zod schema, and a real call to the (now-fixed)
// registryClient.publishSkill on submit.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';

const connect = vi.fn();
const publishSkill = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

let walletState = {
  address: null as string | null,
  isConnected: false,
  isConnecting: false,
};

vi.mock('../../../../hooks/useWallet', () => ({
  useWallet: () => ({ ...walletState, connect, disconnect: vi.fn(), hasGenesisNFT: false, checkGenesisNFT: vi.fn(), error: null }),
}));

vi.mock('../../../../lib/registry-client', () => ({
  registryClient: { publishSkill: (...args: unknown[]) => publishSkill(...args) },
}));

vi.mock('sonner', () => ({
  toast: { success: (...args: unknown[]) => toastSuccess(...args), error: (...args: unknown[]) => toastError(...args) },
}));

import { PublishSkillForm } from '../PublishSkillForm';

const VALID_CID = 'Qm' + 'a'.repeat(44);
const VALID_MANIFEST_CID = 'Qm' + 'b'.repeat(44);

function fillValidFormExcept(overrides: Partial<{ skillHash: string; manifestCid: string }> = {}) {
  fireEvent.change(screen.getByPlaceholderText('my-skill-name'), { target: { value: 'my-skill' } });
  fireEvent.change(screen.getByPlaceholderText('1.0.0'), { target: { value: '1.0.0' } });
  const [skillHashInput, manifestCidInput] = screen.getAllByPlaceholderText('Qm...');
  fireEvent.change(skillHashInput, { target: { value: overrides.skillHash ?? VALID_CID } });
  fireEvent.change(manifestCidInput, { target: { value: overrides.manifestCid ?? VALID_MANIFEST_CID } });
}

describe('PublishSkillForm', () => {
  beforeEach(() => {
    connect.mockReset();
    publishSkill.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    walletState = { address: null, isConnected: false, isConnecting: false };
  });

  afterEach(() => {
    cleanup();
  });

  it('gates publishing behind a connected wallet', () => {
    render(<PublishSkillForm />);

    expect(screen.getByText('Connect to Publish')).toBeTruthy();
    expect(screen.queryByText('Publish a Skill')).toBeNull();
  });

  it('rejects an invalid IPFS CID client-side without calling publishSkill', async () => {
    walletState = { address: '0x1111111111111111111111111111111111111111', isConnected: true, isConnecting: false };
    render(<PublishSkillForm />);

    // Deliberately invalid -- not a real CIDv0.
    fillValidFormExcept({ skillHash: 'not-a-real-cid' });

    fireEvent.click(screen.getByRole('button', { name: 'Publish Skill' }));

    expect(publishSkill).not.toHaveBeenCalled();
    expect(await screen.findByText('Must be a valid IPFS CIDv0 (starts with Qm)')).toBeTruthy();
  });

  it('publishes with a real, correctly-shaped DTO and shows the result', async () => {
    const address = '0x1111111111111111111111111111111111111111';
    walletState = { address, isConnected: true, isConnecting: false };
    publishSkill.mockResolvedValue({
      id: 's1',
      name: 'my-skill',
      version: '1.0.0',
      skillHash: VALID_CID,
    });
    render(<PublishSkillForm />);

    fillValidFormExcept();

    fireEvent.click(screen.getByRole('button', { name: 'Publish Skill' }));

    await waitFor(() =>
      expect(publishSkill).toHaveBeenCalledWith({
        name: 'my-skill',
        version: '1.0.0',
        description: undefined,
        skillHash: VALID_CID,
        manifestCid: VALID_MANIFEST_CID,
        packageCid: undefined,
        author: address,
      })
    );
    expect(await screen.findByText('my-skill@1.0.0 published')).toBeTruthy();
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("surfaces the server's real error (e.g. missing Publisher NFT) via toast", async () => {
    walletState = { address: '0x1111111111111111111111111111111111111111', isConnected: true, isConnecting: false };
    publishSkill.mockRejectedValue(new Error('Publishing skills requires a THINK Genesis NFT or Publisher NFT'));
    render(<PublishSkillForm />);

    fillValidFormExcept();

    fireEvent.click(screen.getByRole('button', { name: 'Publish Skill' }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('Publishing skills requires a THINK Genesis NFT or Publisher NFT')
    );
  });
});
