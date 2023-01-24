import { httpClient } from '@cauri/commons';
import { config } from '../config';
import { serviceTokenProvider } from '../serviceToken';

// notifications llama a accounts-api como servicio (client credentials, client "notifications").
const serviceToken = serviceTokenProvider({
  issuer: config.keycloakIssuer,
  clientId: config.keycloakClientId,
  clientSecret: config.keycloakClientSecret,
});

const accountsApi = httpClient({
  baseUrl: config.accountsApiUrl,
  getToken: () => serviceToken.getToken(),
  retries: 2,
  timeoutMs: 5000,
});

export interface Account {
  id: string;
  customer_id: string;
  currency: string;
  balance: string;
  status: string;
  customer: {
    email: string;
    full_name: string;
  };
}

export async function getAccount(accountId: string): Promise<Account> {
  return accountsApi.get<Account>(`/v1/accounts/${accountId}`);
}
