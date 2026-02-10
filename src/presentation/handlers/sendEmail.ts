import type { SQSEvent } from 'aws-lambda';
import { SESService } from '@/infra/services/ses.service';
import { logger } from '../utils/logger';
import { EmailMessage } from '@/infra/types/email.types';

export const handler = async (event: SQSEvent) => {
  try {
    const sesService = new SESService();
    for (const record of event.Records) {
      const message = JSON.parse(record.body) as EmailMessage;
      await sesService.sendEmail({
        to: message.to,
        subject: message.subject,
        body: message.body,
      });
      logger.info('Email sent', { to: message.to, subject: message.subject });
    }
  } catch (error) {
    logger.error('Error sending email', { error: JSON.stringify(error) });
    throw error;
  }
};
