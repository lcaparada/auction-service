import { SESService } from '../ses.service';

const mockSend = jest.fn().mockResolvedValue({ MessageId: 'msg-123' });

jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  SendEmailCommand: jest.fn().mockImplementation((input: unknown) => input),
}));

jest.mock('@/presentation/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

describe('SESService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SES_FROM_EMAIL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('sendEmail', () => {
    it('should call SES send with Source, Destination and Message', async () => {
      const service = new SESService();
      await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test subject',
        body: 'Test body',
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const sent = mockSend.mock.calls[0][0];
      expect(sent).toMatchObject({
        Source: 'noreply@example.com',
        Destination: { ToAddresses: ['user@example.com'] },
        Message: {
          Subject: { Data: 'Test subject' },
          Body: { Text: { Data: 'Test body' } },
        },
      });
    });

    it('should use email.source when provided', async () => {
      const service = new SESService();
      await service.sendEmail({
        to: 'user@example.com',
        subject: 'S',
        body: 'B',
        source: 'custom@domain.com',
      });

      const sent = mockSend.mock.calls[0][0];
      expect(sent.Source).toBe('custom@domain.com');
    });

    it('should use SES_FROM_EMAIL when email.source is not provided', async () => {
      process.env.SES_FROM_EMAIL = 'env@domain.com';
      const service = new SESService();
      await service.sendEmail({
        to: 'user@example.com',
        subject: 'S',
        body: 'B',
      });

      const sent = mockSend.mock.calls[0][0];
      expect(sent.Source).toBe('env@domain.com');
    });

    it('should throw when SES send fails', async () => {
      const service = new SESService();
      mockSend.mockRejectedValueOnce(new Error('SES error'));

      await expect(
        service.sendEmail({ to: 'u@x.com', subject: 'S', body: 'B' }),
      ).rejects.toThrow('SES error');
    });
  });
});
