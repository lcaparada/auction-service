import { EmailQueueService } from '../email-queue.service';
import type { EmailMessage } from '@/infra/types/email.types';

const mockSend = jest.fn().mockResolvedValue({ MessageId: 'msg-123' });
type SendMessageInput = { QueueUrl?: string; MessageBody?: string };
const mockSendMessageCommand = jest.fn((input: SendMessageInput) => input);

jest.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  SendMessageCommand: jest.fn().mockImplementation((input: SendMessageInput) => mockSendMessageCommand(input)),
}));

jest.mock('@/presentation/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

const makeMessage = (overrides: Partial<EmailMessage> = {}): EmailMessage => ({
  to: 'user@example.com',
  subject: 'Test',
  body: 'Body',
  ...overrides,
});

describe('EmailQueueService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, SQS_QUEUE_URL: 'https://sqs.us-east-1.amazonaws.com/123/mail-queue' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('sendMessage', () => {
    it('should call SQS send with QueueUrl and MessageBody', async () => {
      const service = new EmailQueueService();
      const message = makeMessage({ to: 'a@test.com', subject: 'Hi', body: 'Hello' });

      await service.sendMessage(message);

      expect(mockSendMessageCommand).toHaveBeenCalledWith({
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/mail-queue',
        MessageBody: JSON.stringify(message),
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith({
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/mail-queue',
        MessageBody: JSON.stringify(message),
      });
    });

    it('should throw when SQS send fails', async () => {
      const service = new EmailQueueService();
      mockSend.mockRejectedValueOnce(new Error('SQS error'));

      await expect(service.sendMessage(makeMessage())).rejects.toThrow('SQS error');
    });
  });
});
