import { DeleteMessageCommand, Message, ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { logger } from '@cauri/commons';
import { config, notificationsQueueUrl } from './config';
import { getAccount } from './clients/accounts';
import { getPreferences, insertDelivery } from './db';
import { sendEmail } from './providers/mailgunner';
import { sendPush } from './providers/pushly';

const log = logger(config.serviceName, config.env);

const sqs = new SQSClient({
  endpoint: config.aws.endpointUrl,
  region: config.aws.region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
  },
});

export interface PaymentCompletedMessage {
  type: 'payment.completed';
  account_id: string;
  payment_id: string;
  amount: string;
  currency: string;
}

/**
 * Resuelve el cliente por accounts-api, aplica sus preferencias y manda
 * email y/o push. Un mensaje sin `device_token` en preferencias no manda push,
 * aunque `push_enabled` esté en true (las convenciones internas de API).
 */
export async function processMessage(message: PaymentCompletedMessage): Promise<void> {
  const account = await getAccount(message.account_id);
  const prefs = await getPreferences(account.customer_id);

  const subject = 'Tu pago fue procesado';
  const text = `Tu pago de ${message.amount} ${message.currency} fue completado (ref ${message.payment_id}).`;

  if (prefs.email_enabled) {
    let providerRef: string | null = null;
    let status = 'sent';
    try {
      providerRef = await sendEmail(account.customer.email, subject, text);
    } catch (err) {
      status = 'failed';
      log.error({ err, account_id: message.account_id }, 'mailgunner failed');
    }
    await insertDelivery({
      customerId: account.customer_id,
      channel: 'email',
      template: message.type,
      providerRef,
      status,
    });
  }

  if (prefs.push_enabled && prefs.device_token) {
    let providerRef: string | null = null;
    let status = 'sent';
    try {
      providerRef = await sendPush(prefs.device_token, subject, text);
    } catch (err) {
      status = 'failed';
      log.error({ err, account_id: message.account_id }, 'pushly failed');
    }
    await insertDelivery({
      customerId: account.customer_id,
      channel: 'push',
      template: message.type,
      providerRef,
      status,
    });
  }
}

async function handleRaw(raw: Message): Promise<void> {
  if (!raw.Body) return;
  const message = JSON.parse(raw.Body) as PaymentCompletedMessage;
  await processMessage(message);
}

/** Long polling sobre `<SQS_QUEUE_PREFIX>notifications` (las convenciones internas de API). */
export async function startConsumer(): Promise<never> {
  const queueUrl = notificationsQueueUrl();
  log.info({ queueUrl }, 'notifications consumer started');

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { Messages } = await sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
      }),
    );

    for (const raw of Messages ?? []) {
      try {
        await handleRaw(raw);
        if (raw.ReceiptHandle) {
          await sqs.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: raw.ReceiptHandle }));
        }
      } catch (err) {
        // No borramos el mensaje: vuelve a estar visible y se reintenta.
        log.error({ err, messageId: raw.MessageId }, 'failed to process notification message');
      }
    }
  }
}
