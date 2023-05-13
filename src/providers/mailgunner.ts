import { config } from '../config';

interface MailgunnerResponse {
  id: string;
}

export async function sendEmail(to: string, subject: string, text: string): Promise<string> {
  const res = await fetch(`${config.mailgunnerUrl}/v3/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.mailgunnerApiKey}`,
    },
    body: JSON.stringify({ to, subject, text }),
  });

  if (!res.ok) {
    throw new Error(`mailgunner respondio ${res.status}`);
  }
  const body = (await res.json()) as MailgunnerResponse;
  return body.id;
}
