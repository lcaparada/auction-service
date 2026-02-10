import { logger } from '@/presentation/utils/logger';
import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';

export class SESService {
  private readonly sesClient: SESClient;

  constructor() {
    this.sesClient = new SESClient({ region: 'us-east-1' });
  }

  async sendEmail(email: { to: string; subject: string; body: string; source?: string }): Promise<void> {
    const source = email.source ?? process.env.SES_FROM_EMAIL ?? 'noreply@example.com';
    try {
      const command = new SendEmailCommand({
        Source: source,
        Destination: {
          ToAddresses: [email.to],
        },
        Message: {
          Subject: { Data: email.subject },
          Body: { Text: { Data: email.body } },
        },
      });
      await this.sesClient.send(command);
      logger.info('Email sent', { to: email.to, subject: email.subject });
    } catch (error) {
      logger.error('Error sending email', { error: JSON.stringify(error) });
      throw error;
    }
  }
}
