import path from 'node:path';
import { runner } from 'node-pg-migrate';
import { config } from './config';
import { logger } from '@cauri/commons';

const log = logger(config.serviceName, config.env);

/** Corre las migraciones pendientes de `migrations/` contra la base `notifications`. */
export async function runMigrations(): Promise<void> {
  await runner({
    databaseUrl: {
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      user: config.db.user,
      password: config.db.password,
    },
    dir: path.join(__dirname, '..', 'migrations'),
    direction: 'up',
    migrationsTable: 'pgmigrations',
    log: (msg: string) => log.info({ msg }, 'migration'),
  });
}
