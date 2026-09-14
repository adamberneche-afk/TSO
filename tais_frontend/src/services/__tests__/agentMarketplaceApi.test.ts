// Agent Marketplace client (docs/AGENT_MARKETPLACE_DATA_MODEL.md).
// Proves every call sends its body directly to api.post/api.patch, not
// wrapped in `{ data: ... }` -- the pre-existing bug found in
// authApi.ts/oauthApi.ts this file deliberately avoids repeating (see
// enterpriseAuthApi.test.ts for the same class of regression test).

import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();
const post = vi.fn();
const put = vi.fn();
const del = vi.fn();

vi.mock('@/api/client', () => ({
  api: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    put: (...args: unknown[]) => put(...args),
    delete: (...args: unknown[]) => del(...args),
  },
}));

import { agentMarketplaceApi } from '../agentMarketplaceApi';

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  put.mockReset();
  del.mockReset();
});

describe('agentMarketplaceApi', () => {
  it('browse is unauthenticated and forwards filters as query params', async () => {
    get.mockResolvedValue({ listings: [], total: 0, limit: 20, offset: 0 });
    await agentMarketplaceApi.browse({ category: 'productivity', query: 'research' });
    expect(get).toHaveBeenCalledWith('/api/v1/agent-listings', {
      params: { category: 'productivity', query: 'research' },
      useAuth: false,
    });
  });

  it('create sends the input object directly', async () => {
    post.mockResolvedValue({ id: 'l1' });
    await agentMarketplaceApi.create({ configurationId: 'c1', name: 'Research Assistant' });
    expect(post).toHaveBeenCalledWith('/api/v1/agent-listings', { configurationId: 'c1', name: 'Research Assistant' });
  });

  it('update PUTs the input object directly', async () => {
    put.mockResolvedValue({ id: 'l1' });
    await agentMarketplaceApi.update('l1', { description: 'New pitch' });
    expect(put).toHaveBeenCalledWith('/api/v1/agent-listings/l1', { description: 'New pitch' });
  });

  it('withdraw calls DELETE on the listing', async () => {
    del.mockResolvedValue({});
    await agentMarketplaceApi.withdraw('l1');
    expect(del).toHaveBeenCalledWith('/api/v1/agent-listings/l1');
  });

  it('install POSTs with no body', async () => {
    post.mockResolvedValue({ configuration: { id: 'c2' } });
    await agentMarketplaceApi.install('l1');
    expect(post).toHaveBeenCalledWith('/api/v1/agent-listings/l1/install');
  });

  it('adminQueue defaults to the PENDING status filter', async () => {
    get.mockResolvedValue({ listings: [], count: 0 });
    await agentMarketplaceApi.adminQueue();
    expect(get).toHaveBeenCalledWith('/api/v1/admin/agent-listings', { params: { status: 'PENDING' } });
  });

  it('admin moderation calls send { reason } directly, not wrapped', async () => {
    post.mockResolvedValue({ listing: {} });
    await agentMarketplaceApi.approve('l1', 'Looks good');
    expect(post).toHaveBeenCalledWith('/api/v1/admin/agent-listings/l1/approve', { reason: 'Looks good' });

    await agentMarketplaceApi.reject('l1', 'Not a fit');
    expect(post).toHaveBeenCalledWith('/api/v1/admin/agent-listings/l1/reject', { reason: 'Not a fit' });

    await agentMarketplaceApi.suspend('l1', 'Reported');
    expect(post).toHaveBeenCalledWith('/api/v1/admin/agent-listings/l1/suspend', { reason: 'Reported' });
  });
});
