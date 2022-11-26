import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { config } from './config';

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
});

export interface Preferences {
  customer_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  device_token: string | null;
  updated_at: Date;
}

const DEFAULT_PREFERENCES = { email_enabled: true, push_enabled: true, device_token: null };

/** Preferencias del cliente, o el default (todo habilitado) si nunca las seteó. */
export async function getPreferences(customerId: string): Promise<Omit<Preferences, 'updated_at'>> {
  const { rows } = await pool.query<Preferences>(
    'SELECT customer_id, email_enabled, push_enabled, device_token FROM preferences WHERE customer_id = $1',
    [customerId],
  );
  if (rows[0]) return rows[0];
  return { customer_id: customerId, ...DEFAULT_PREFERENCES };
}

export async function upsertPreferences(
  customerId: string,
  input: { email_enabled: boolean; push_enabled: boolean; device_token: string | null },
): Promise<Preferences> {
  const { rows } = await pool.query<Preferences>(
    `INSERT INTO preferences (customer_id, email_enabled, push_enabled, device_token, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (customer_id) DO UPDATE
       SET email_enabled = EXCLUDED.email_enabled,
           push_enabled = EXCLUDED.push_enabled,
           device_token = EXCLUDED.device_token,
           updated_at = now()
     RETURNING customer_id, email_enabled, push_enabled, device_token, updated_at`,
    [customerId, input.email_enabled, input.push_enabled, input.device_token],
  );
  return rows[0];
}

export type DeliveryChannel = 'email' | 'push';

export async function insertDelivery(input: {
  customerId: string;
  channel: DeliveryChannel;
  template: string;
  providerRef: string | null;
  status: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO deliveries (id, customer_id, channel, template, provider_ref, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())`,
    [randomUUID(), input.customerId, input.channel, input.template, input.providerRef, input.status],
  );
}
