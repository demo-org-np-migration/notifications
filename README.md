# notifications

Owner: Gonzalo Peralta (`gperalta-cauri`).

## Qué es esto

Servicio chiquito que manda las notificaciones a los clientes cuando pasa algo con su plata.
Hoy solo tenemos un caso: cuando `payments-api` termina de procesar un pago, este servicio se
entera y le manda un email (y un push si tiene el celu con notificaciones) al cliente contándole
que su pago se completó.

También expone la API para que el cliente configure sus preferencias (si quiere email, push, o
nada) desde la app.

## Stack

Node 20 + TypeScript + Express. `pg` para Postgres (tabla `preferences` y `deliveries`, propias de
este servicio). `@aws-sdk/client-sqs` para leer la cola. `@cauri/commons` para logging, auth de
Keycloak y el cliente HTTP.

## Correr local

```bash
npm install
export DB_HOST=localhost DB_NAME=notifications DB_USER=cauri DB_PASSWORD=cauri
export KEYCLOAK_ISSUER=http://localhost:8180/realms/cauri-staging
export KEYCLOAK_CLIENT_ID=notifications KEYCLOAK_CLIENT_SECRET=<el que te pase infra>
export AWS_ENDPOINT_URL=http://localhost:4566 AWS_REGION=us-east-1 SQS_QUEUE_PREFIX=staging-
export ACCOUNTS_API_URL=http://localhost:8081
export MAILGUNNER_URL=http://localhost:4001 MAILGUNNER_API_KEY=whatever
export PUSHLY_URL=http://localhost:4002 PUSHLY_API_KEY=whatever
npm run dev
```

Las migraciones (`migrations/1_init.js`, node-pg-migrate) corren solas al arrancar el proceso.

## Tests

```bash
npm test
```

`test/consumer.test.ts` mockea SQS, accounts-api, los vendors y la base, y cubre el caso obvio (un
mensaje manda email y push) y el que en algún momento nos mordió en preview: si el cliente no
cargó `device_token` en sus preferencias, no le mandamos push aunque `push_enabled` esté en true.

## Deploy

Estilo A: Actions + YAML pelado (`k8s/staging/`, `k8s/prod/`), como `ledger-core`. `deploy.yml`
buildea y pushea a `ghcr.io/demo-org-np-migration/notifications`, aplica en `staging` y, en tags
`v*`, en `prod` (con approval manual).

Este servicio no expone métricas.

---
owner actual: channels, ver #channels
