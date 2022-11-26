function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`missing required env var ${name}`);
  }
  return value;
}

export const config = {
  serviceName: process.env.SERVICE_NAME ?? 'notifications',
  env: process.env.ENV ?? 'staging',
  port: Number(process.env.PORT ?? 8080),
  logLevel: process.env.LOG_LEVEL ?? 'info',

  db: {
    host: required('DB_HOST', 'localhost'),
    port: Number(process.env.DB_PORT ?? 5432),
    name: process.env.DB_NAME ?? 'notifications',
    user: required('DB_USER', 'cauri'),
    password: required('DB_PASSWORD', ''),
  },

  keycloakIssuer: required('KEYCLOAK_ISSUER'),
  keycloakClientId: process.env.KEYCLOAK_CLIENT_ID ?? 'notifications',
  keycloakClientSecret: required('KEYCLOAK_CLIENT_SECRET', ''),

  aws: {
    endpointUrl: process.env.AWS_ENDPOINT_URL,
    region: process.env.AWS_REGION ?? 'us-east-1',
  },
  sqsQueuePrefix: process.env.SQS_QUEUE_PREFIX ?? '',

  accountsApiUrl: required('ACCOUNTS_API_URL', 'http://accounts-api:8080'),

  mailgunnerUrl: required('MAILGUNNER_URL'),
  mailgunnerApiKey: required('MAILGUNNER_API_KEY', ''),
  pushlyUrl: required('PUSHLY_URL'),
  pushlyApiKey: required('PUSHLY_API_KEY', ''),
};

export function notificationsQueueUrl(): string {
  // LocalStack acepta tanto el nombre de cola como URL completa; armamos la URL
  // "clásica" para no depender de una llamada extra a GetQueueUrl.
  const base = config.aws.endpointUrl ?? 'http://localstack.platform.svc:4566';
  return `${base}/000000000000/${config.sqsQueuePrefix}notifications`;
}
