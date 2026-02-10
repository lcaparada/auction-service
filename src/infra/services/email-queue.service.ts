import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { EmailMessage } from '../types/email.types';
import { logger } from '@/presentation/utils/logger';

export class EmailQueueService {
  private readonly sqsClient: SQSClient;

  constructor() {
    this.sqsClient = new SQSClient({ region: 'us-east-1' });
  }

  async sendMessage(message: EmailMessage): Promise<void> {
    try {
      const command = new SendMessageCommand({
        QueueUrl: process.env.SQS_QUEUE_URL,
        MessageBody: JSON.stringify(message),
      });
      await this.sqsClient.send(command);
      logger.info('Message sent', { message: JSON.stringify(message) });
    } catch (error) {
      logger.error('Error sending message', { error: JSON.stringify(error) });
      throw error;
    }
  }
}
