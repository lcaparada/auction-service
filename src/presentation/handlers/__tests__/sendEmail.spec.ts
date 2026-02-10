import type { SQSEvent } from 'aws-lambda';
import { handler } from '../sendEmail';
import type { EmailMessage } from '@/infra/types/email.types';

const mockSendEmail = jest.fn().mockResolvedValue(undefined);

jest.mock('@/infra/services/ses.service', () => ({
  SESService: jest.fn().mockImplementation(() => ({
    sendEmail: mockSendEmail,
  })),
}));

jest.mock('@/presentation/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

const makeEmailMessage = (overrides: Partial<EmailMessage> = {}): EmailMessage => ({
  to: 'user@example.com',
  subject: 'Test subject',
  body: 'Test body',
  ...overrides,
});

const makeSQSRecord = (message: EmailMessage) => ({
  messageId: 'msg-123',
  receiptHandle: 'receipt-123',
  body: JSON.stringify(message),
  attributes: {},
  messageAttributes: {},
  md5OfBody: '',
  eventSource: 'aws:sqs',
  eventSourceARN: 'arn:aws:sqs:us-east-1:123:mail-queue',
  awsRegion: 'us-east-1',
});

const makeEvent = (records: EmailMessage[] = []): SQSEvent =>
  ({
    Records: records.map(makeSQSRecord),
  }) as SQSEvent;

const invoke = (event: SQSEvent) => handler(event);

describe('sendEmail handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('success', () => {
    it('should not call sendEmail when there are no records', async () => {
      await invoke(makeEvent());

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('should call sendEmail once with parsed message when one record', async () => {
      const message = makeEmailMessage({ to: 'one@test.com', subject: 'Hi', body: 'Hello' });
      await invoke(makeEvent([message]));

      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'one@test.com',
        subject: 'Hi',
        body: 'Hello',
      });
    });

    it('should call sendEmail for each record when multiple records', async () => {
      const msg1 = makeEmailMessage({ to: 'a@test.com', subject: 'A' });
      const msg2 = makeEmailMessage({ to: 'b@test.com', subject: 'B' });
      await invoke(makeEvent([msg1, msg2]));

      expect(mockSendEmail).toHaveBeenCalledTimes(2);
      expect(mockSendEmail).toHaveBeenNthCalledWith(1, { to: 'a@test.com', subject: 'A', body: 'Test body' });
      expect(mockSendEmail).toHaveBeenNthCalledWith(2, { to: 'b@test.com', subject: 'B', body: 'Test body' });
    });
  });

  describe('error handling', () => {
    it('should rethrow when sendEmail throws', async () => {
      const message = makeEmailMessage();
      mockSendEmail.mockRejectedValueOnce(new Error('SES error'));

      await expect(invoke(makeEvent([message]))).rejects.toThrow('SES error');
    });

    it('should rethrow when record body is invalid JSON', async () => {
      const event = {
        Records: [
          {
            ...makeSQSRecord(makeEmailMessage()),
            body: 'not valid json {{{',
          },
        ],
      } as SQSEvent;

      await expect(invoke(event)).rejects.toThrow();
    });
  });
});
