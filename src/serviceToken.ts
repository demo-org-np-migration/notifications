// @cauri/commons v1.1.0 (la versión que fijamos en package.json) todavía no trae
// `serviceTokenProvider` -- lo agregaron recién en 1.2.0. Hasta que actualicemos,
// pedimos nosotros mismos el token de client credentials contra Keycloak.

interface ServiceTokenOpts {
  issuer: string;
  clientId: string;
  clientSecret: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

// Margen de seguridad para no usar un token que expira mientras viaja la request.
const EXPIRY_MARGIN_MS = 10_000;

export function serviceTokenProvider(opts: ServiceTokenOpts) {
  const tokenUrl = `${opts.issuer}/protocol/openid-connect/token`;
  let cachedToken: string | undefined;
  let expiresAt = 0;

  async function fetchToken(): Promise<TokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new Error(`failed to get service token from ${tokenUrl}: ${res.status}`);
    }
    return (await res.json()) as TokenResponse;
  }

  async function getToken(): Promise<string> {
    if (cachedToken && Date.now() < expiresAt) {
      return cachedToken;
    }
    const token = await fetchToken();
    cachedToken = token.access_token;
    expiresAt = Date.now() + token.expires_in * 1000 - EXPIRY_MARGIN_MS;
    return cachedToken;
  }

  return { getToken };
}
