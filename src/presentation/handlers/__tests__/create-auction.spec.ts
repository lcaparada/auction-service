import { AuctionStatus } from '@/domain/entities/auction.entity';
import { handler } from '../create-auction';

const mockCreate = jest.fn();

jest.mock('@/infra/db/mongodb', () => ({
  connectToDatabase: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/infra/repository/auction.repository', () => ({
  AuctionRepository: jest.fn().mockImplementation(() => ({
    create: mockCreate,
  })),
}));

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn() },
}));

jest.mock('../../utils/http-error', () => ({
  toHttpError: jest.fn((err: unknown) => {
    throw err;
  }),
}));

const makeEvent = (
  overrides: Partial<{ body: string }> = {}
): Parameters<typeof handler>[0] =>
  ({
    body: JSON.stringify({
      title: 'Valid Auction Title',
      status: AuctionStatus.OPEN,
    }),
    ...overrides,
  }) as Parameters<typeof handler>[0];

const emptyContext = {} as Parameters<typeof handler>[1];
const noopCallback = (() => {}) as Parameters<typeof handler>[2];
const invoke = (event: Parameters<typeof handler>[0]) =>
  handler(event, emptyContext, noopCallback);

describe('create-auction handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue(undefined);
  });

  describe('success', () => {
    it('should return 200 and create auction when body is valid', async () => {
      const event = makeEvent();

      const result = await invoke(event);

      expect(result?.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.message).toBe('Auction created');
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('validation', () => {
    it('should throw when title has less than 3 characters', async () => {
      const event = makeEvent({
        body: JSON.stringify({ title: 'Ab', status: AuctionStatus.OPEN }),
      });

      await expect(invoke(event)).rejects.toThrow();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should throw when status is not OPEN (entity validate)', async () => {
      const event = makeEvent({
        body: JSON.stringify({
          title: 'Valid Title',
          status: AuctionStatus.CLOSED,
        }),
      });

      await expect(invoke(event)).rejects.toThrow('Auction must be open to update highest bid');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should throw when body is invalid (ZodError)', async () => {
      const event = makeEvent({
        body: JSON.stringify({ title: 'Ab', status: 'INVALID' }),
      });

      await expect(invoke(event)).rejects.toThrow();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should throw when body is empty or missing required fields', async () => {
      const event = makeEvent({ body: '{}' });

      await expect(invoke(event)).rejects.toThrow();
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });
});
