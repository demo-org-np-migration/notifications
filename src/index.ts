import express, { type ErrorRequestHandler } from 'express';
import { logger } from '@cauri/commons';
import { config } from './config';
import { runMigrations } from './migrate';
import { auth } from './auth';
import { preferencesRouter } from './routes/preferences';
import { startConsumer } from './consumer';

const log = logger(config.serviceName, config.env);

function buildApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use(auth.express(), preferencesRouter);

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    log.error({ err }, 'unhandled error');
    res.status(500).json({ error: { code: 'internal_error', message: 'unexpected error' } });
  };
  app.use(errorHandler);

  return app;
}

async function main() {
  await runMigrations();

  const app = buildApp();
  app.listen(config.port, () => {
    log.info({ port: config.port }, 'notifications listening');
  });

  // El consumer corre en el mismo proceso que la API de preferencias (sin
  // telemetría propia, así que no necesita un pod aparte para este servicio).
  startConsumer().catch((err) => {
    log.error({ err }, 'consumer crashed');
    process.exit(1);
  });
}

main().catch((err) => {
  log.error({ err }, 'failed to start notifications');
  process.exit(1);
});
