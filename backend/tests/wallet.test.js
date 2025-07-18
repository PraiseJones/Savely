const request = require('supertest');
const app = require('../server'); // You'll need to export app from server.js
const supabase = require('../services/supabaseClient');

// Mock Supabase for testing
jest.mock('../services/supabaseClient');

describe('Wallet API Tests', () => {
  let authToken;
  let testUserId = 'test-user-id';

  beforeAll(async () => {
    // Setup test user and get auth token
    const registerResponse = await request(app)
      .post('/api/users/register')
      .send({
        name: 'Test User',
        phone: '1234567890',
        password: 'TestPass123!'
      });

    const loginResponse = await request(app)
      .post('/api/users/login')
      .send({
        phone: '1234567890',
        password: 'TestPass123!'
      });

    authToken = loginResponse.body.token;
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('GET /api/wallets/banks', () => {
    it('should return available banks', async () => {
      const response = await request(app)
        .get('/api/wallets/banks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('banks');
      expect(Array.isArray(response.body.banks)).toBe(true);
      expect(response.body.banks.length).toBeGreaterThan(0);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/wallets/banks');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/wallets/balance', () => {
    it('should return wallet balance', async () => {
      // Mock wallet data
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { balance: 1000, created_at: '2024-01-01T00:00:00Z' },
              error: null
            })
          })
        })
      });

      const response = await request(app)
        .get('/api/wallets/balance')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('balance');
      expect(response.body).toHaveProperty('created_at');
    });

    it('should handle wallet not found', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      });

      const response = await request(app)
        .get('/api/wallets/balance')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/wallets/fund', () => {
    it('should fund wallet successfully', async () => {
      // Mock wallet data
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { balance: 1000 },
              error: null
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        }),
        insert: jest.fn().mockResolvedValue({ error: null })
      });

      const response = await request(app)
        .post('/api/wallets/fund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 500 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('amount_funded');
      expect(response.body).toHaveProperty('new_balance');
    });

    it('should validate amount', async () => {
      const response = await request(app)
        .post('/api/wallets/fund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: -100 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/wallets/fund')
        .send({ amount: 500 });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/wallets/withdraw', () => {
    it('should withdraw successfully', async () => {
      // Mock wallet data
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { balance: 1000 },
              error: null
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        }),
        insert: jest.fn().mockResolvedValue({ error: null })
      });

      const response = await request(app)
        .post('/api/wallets/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 500,
          account_number: '1234567890',
          bank_name: 'First National Bank'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('amount_withdrawn');
      expect(response.body).toHaveProperty('account_holder_name');
    });

    it('should validate insufficient balance', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { balance: 100 },
              error: null
            })
          })
        })
      });

      const response = await request(app)
        .post('/api/wallets/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 500,
          account_number: '1234567890',
          bank_name: 'First National Bank'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Insufficient');
    });

    it('should validate bank name', async () => {
      const response = await request(app)
        .post('/api/wallets/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 500,
          account_number: '1234567890',
          bank_name: 'Invalid Bank'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/wallets/transactions', () => {
    it('should return transaction history', async () => {
      // Mock transaction data
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 1,
                    type: 'fund',
                    amount: 1000,
                    balance_after: 1000,
                    description: 'Wallet funding',
                    created_at: '2024-01-01T00:00:00Z'
                  }
                ],
                error: null
              })
            })
          })
        })
      });

      const response = await request(app)
        .get('/api/wallets/transactions?limit=10&offset=0')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('transactions');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/wallets/transactions?limit=1000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
}); 