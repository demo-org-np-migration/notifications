import { createJwtAuth } from '@cauri/commons';
import { config } from './config';

// Valida JWT de Keycloak contra el issuer del realm (las convenciones internas de API: no se valida `aud`).
export const auth = createJwtAuth({ issuer: config.keycloakIssuer });
