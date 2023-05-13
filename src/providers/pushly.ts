import { config } from '../config';

interface PushlyResponse {
  id: string;
}

export async function sendPush(deviceToken: string, title: string, body: string): Promise<string> {
  const res = await fetch(`${config.pushlyUrl}/v1/push`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.pushlyApiKey}`,
    },
    body: JSON.stringify({ device_token: deviceToken, title, body }),
  });

  if (!res.ok) {
    throw new Error(`pushly respondio ${res.status}`);
  }
  const parsed = (await res.json()) as PushlyResponse;
  return parsed.id;
}
