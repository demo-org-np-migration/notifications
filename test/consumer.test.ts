import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.KEYCLOAK_ISSUER = 'http://keycloak.test/realms/cauri-test';
process.env.KEYCLOAK_CLIENT_ID = 'notifications';
process.env.KEYCLOAK_CLIENT_SECRET = 'test-secret';
process.env.DB_HOST = 'db.test';
process.env.DB_USER = 'cauri';
process.env.DB_PASSWORD = 'test';
process.env.AWS_ENDPOINT_URL = 'http://localstack.test:4566';
process.env.AWS_REGION = 'us-east-1';
process.env.SQS_QUEUE_PREFIX = 'test-';
process.env.ACCOUNTS_API_URL = 'http://accounts-api.test';
process.env.MAILGUNNER_URL = 'http://mailgunner.test';
process.env.MAILGUNNER_API_KEY = 'mg-key';
process.env.PUSHLY_URL = 'http://pushly.test';
process.env.PUSHLY_API_KEY = 'pushly-key';

const account = {
  id: 'account-1',
  customer_id: 'customer-1',
  currency: 'ARS',
  balance: '1000.00',
  status: 'active',
  customer: { email: 'ana@example.com', full_name: 'Ana Cliente' },
};

vi.mock('../src/clients/accounts', () => ({
  getAccount: vi.fn(async () => account),
}));

const getPreferences = vi.fn();
const insertDelivery = vi.fn(async () => undefined);
vi.mock('../src/db', () => ({
  getPreferences: (...args: unknown[]) => getPreferences(...args),
  insertDelivery: (...args: unknown[]) => insertDelivery(...args),
}));

const sendEmail = vi.fn(async () => 'mailgunner-id-1');
vi.mock('../src/providers/mailgunner', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}));

const sendPush = vi.fn(async () => 'pushly-id-1');
vi.mock('../src/providers/pushly', () => ({
  sendPush: (...args: unknown[]) => sendPush(...args),
}));

const { processMessage } = await import('../src/consumer');

const message = {
  type: 'payment.completed' as const,
  account_id: 'account-1',
  payment_id: 'payment-1',
  amount: '1250.50',
  currency: 'ARS',
};

describe('consumer.processMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('manda email y push cuando las preferencias los tienen habilitados y hay device_token', async () => {
    getPreferences.mockResolvedValue({
      customer_id: 'customer-1',
      email_enabled: true,
      push_enabled: true,
      device_token: 'device-abc',
    });

    await processMessage(message);

    expect(sendEmail).toHaveBeenCalledWith('ana@example.com', expect.any(String), expect.any(String));
    expect(sendPush).toHaveBeenCalledWith('device-abc', expect.any(String), expect.any(String));
    expect(insertDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'customer-1', channel: 'email', status: 'sent' }),
    );
    expect(insertDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'customer-1', channel: 'push', status: 'sent' }),
    );
  });

  it('sin device_token no manda push aunque push_enabled sea true', async () => {
    getPreferences.mockResolvedValue({
      customer_id: 'customer-1',
      email_enabled: true,
      push_enabled: true,
      device_token: null,
    });

    await processMessage(message);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendPush).not.toHaveBeenCalled();
    expect(insertDelivery).toHaveBeenCalledTimes(1);
    expect(insertDelivery).toHaveBeenCalledWith(expect.objectContaining({ channel: 'email' }));
  });

  it('con email_enabled y push_enabled en false no manda nada', async () => {
    getPreferences.mockResolvedValue({
      customer_id: 'customer-1',
      email_enabled: false,
      push_enabled: false,
      device_token: 'device-abc',
    });

    await processMessage(message);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendPush).not.toHaveBeenCalled();
    expect(insertDelivery).not.toHaveBeenCalled();
  });
});
