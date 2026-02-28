import request from 'supertest';
import app from '../../index';

const TEST_WALLET = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E';
const TEST_WALLET_2 = '0x8Ba1f109551bD432803012645Ac136ddd64DBA72';

describe('Billing E2E', () => {
  describe('GET /billing/summary', () => {
    it('should require wallet parameter', async () => {
      const response = await request(app)
        .get('/api/v1/billing/summary')
        .expect(400);

      expect(response.body.error).toContain('wallet');
    });

    it('should return billing summary for valid wallet', async () => {
      const response = await request(app)
        .get('/api/v1/billing/summary')
        .query({ wallet: TEST_WALLET })
        .expect(200);

      expect(response.body.wallet).toBe(TEST_WALLET.toLowerCase());
      expect(response.body.tier).toBeDefined();
      expect(response.body.plan).toBeDefined();
      expect(response.body.limits).toBeDefined();
      expect(response.body.usage).toBeDefined();
      expect(response.body.pricing).toBeDefined();
    });

    it('should include free tier limits', async () => {
      const response = await request(app)
        .get('/api/v1/billing/summary')
        .query({ wallet: TEST_WALLET })
        .expect(200);

      expect(response.body.limits.free).toBe(1000);
      expect(response.body.limits.verified).toBe(50000);
    });

    it('should include pricing info', async () => {
      const response = await request(app)
        .get('/api/v1/billing/summary')
        .query({ wallet: TEST_WALLET })
        .expect(200);

      expect(response.body.pricing.per1kInteractions).toBe(0.10);
      expect(response.body.pricing.currency).toBe('USD');
    });
  });

  describe('GET /billing/usage', () => {
    it('should require wallet parameter', async () => {
      const response = await request(app)
        .get('/api/v1/billing/usage')
        .expect(400);

      expect(response.body.error).toContain('wallet');
    });

    it('should return usage data', async () => {
      const response = await request(app)
        .get('/api/v1/billing/usage')
        .query({ wallet: TEST_WALLET })
        .expect(200);

      expect(response.body.wallet).toBe(TEST_WALLET.toLowerCase());
      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.totalInteractions).toBeDefined();
      expect(response.body.summary.totalCost).toBeDefined();
      expect(response.body.byApp).toBeInstanceOf(Array);
      expect(response.body.byDay).toBeInstanceOf(Array);
    });

    it('should filter by app_id', async () => {
      const response = await request(app)
        .get('/api/v1/billing/usage')
        .query({ wallet: TEST_WALLET, app_id: 'test-app' })
        .expect(200);

      expect(response.body.summary).toBeDefined();
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/v1/billing/usage')
        .query({ 
          wallet: TEST_WALLET, 
          start_date: '2026-01-01',
          end_date: '2026-12-31' 
        })
        .expect(200);

      expect(response.body.period).toBeDefined();
    });
  });

  describe('GET /billing/invoices', () => {
    it('should require wallet parameter', async () => {
      const response = await request(app)
        .get('/api/v1/billing/invoices')
        .expect(400);

      expect(response.body.error).toContain('wallet');
    });

    it('should return invoices', async () => {
      const response = await request(app)
        .get('/api/v1/billing/invoices')
        .query({ wallet: TEST_WALLET })
        .expect(200);

      expect(response.body.wallet).toBe(TEST_WALLET.toLowerCase());
      expect(response.body.invoices).toBeInstanceOf(Array);
      expect(response.body.currentInvoice).toBeDefined();
    });

    it('should include invoice details', async () => {
      const response = await request(app)
        .get('/api/v1/billing/invoices')
        .query({ wallet: TEST_WALLET })
        .expect(200);

      const invoice = response.body.currentInvoice;
      expect(invoice.id).toBeDefined();
      expect(invoice.period).toBeDefined();
      expect(invoice.status).toBeDefined();
      expect(invoice.total).toBeDefined();
    });
  });
});

describe('Enterprise E2E', () => {
  describe('GET /enterprise/activity', () => {
    it('should require wallet parameter', async () => {
      const response = await request(app)
        .get('/api/v1/enterprise/activity')
        .expect(400);

      expect(response.body.error).toContain('wallet');
    });

    it('should return activity log', async () => {
      const response = await request(app)
        .get('/api/v1/enterprise/activity')
        .query({ wallet: TEST_WALLET })
        .expect(200);

      expect(response.body.wallet).toBe(TEST_WALLET.toLowerCase());
      expect(response.body.activities).toBeInstanceOf(Array);
      expect(response.body.total).toBeDefined();
    });

    it('should support limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/enterprise/activity')
        .query({ wallet: TEST_WALLET, limit: '5' })
        .expect(200);

      expect(response.body.activities).toBeInstanceOf(Array);
    });
  });

  describe('GET /enterprise/audit-log', () => {
    it('should require wallet parameter', async () => {
      const response = await request(app)
        .get('/api/v1/enterprise/audit-log')
        .expect(400);

      expect(response.body.error).toContain('wallet');
    });

    it('should return audit log', async () => {
      const response = await request(app)
        .get('/api/v1/enterprise/audit-log')
        .query({ wallet: TEST_WALLET })
        .expect(200);

      expect(response.body.wallet).toBe(TEST_WALLET.toLowerCase());
      expect(response.body.auditLog).toBeInstanceOf(Array);
    });
  });
});
