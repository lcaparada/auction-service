import createError from 'http-errors';
import { ObjectId } from 'mongodb';
import { AuctionStatus } from '@/domain/entities/auction.entity';
import { handler } from '../get-auction-by-id';

const mockGetById = jest.fn();

jest.mock('@/infra/db/mongodb', () => ({
  connectToDatabase: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/infra/repository/auction.repository', () => ({
  AuctionRepository: jest.fn().mockImplementation(() => ({
    getById: mockGetById,
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
  overrides: Partial<{ pathParameters: { auctionId?: string } | null }> = {}
): Parameters<typeof handler>[0] =>
  ({
    pathParameters: { auctionId: new ObjectId().toString() },
    ...overrides,
  }) as Parameters<typeof handler>[0];

const emptyContext = {} as Parameters<typeof handler>[1];
const noopCallback = (() => {}) as Parameters<typeof handler>[2];
const invoke = (event: Parameters<typeof handler>[0]) =>
  handler(event, emptyContext, noopCallback);

const auctionDoc = {
  _id: new ObjectId(),
  title: 'Test Auction',
  status: AuctionStatus.OPEN,
  highestBid: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('get-auction-by-id handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetById.mockResolvedValue(auctionDoc);
  });

  describe('success', () => {
    it('should return 200 and auction when found', async () => {
      const id = new ObjectId().toString();
      const event = makeEvent({ pathParameters: { auctionId: id } });

      const result = await invoke(event);

      expect(result?.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.message).toBe('Auction found');
      expect(body.auction).toBeDefined();
      expect(body.auction.title).toBe('Test Auction');
      expect(body.auction.status).toBe(AuctionStatus.OPEN);
      expect(mockGetById).toHaveBeenCalledWith(id);
    });
  });

  describe('pathParameters.auctionId', () => {
    it('should throw BadRequest when pathParameters is null', async () => {
      const event = makeEvent({ pathParameters: null });

      await expect(invoke(event)).rejects.toThrow(createError.BadRequest);
      await expect(invoke(event)).rejects.toThrow('Auction ID is required');
      expect(mockGetById).not.toHaveBeenCalled();
    });

    it('should throw BadRequest when auctionId is undefined', async () => {
      const event = makeEvent({ pathParameters: {} });

      await expect(invoke(event)).rejects.toThrow('Auction ID is required');
      expect(mockGetById).not.toHaveBeenCalled();
    });

    it('should throw BadRequest when auctionId is not a valid ObjectId', async () => {
      const event = makeEvent({ pathParameters: { auctionId: 'invalid' } });

      await expect(invoke(event)).rejects.toThrow(createError.BadRequest);
      await expect(invoke(event)).rejects.toThrow('Auction ID is invalid');
      expect(mockGetById).not.toHaveBeenCalled();
    });
  });

  describe('auction not found', () => {
    it('should throw NotFound when getById returns null', async () => {
      mockGetById.mockResolvedValue(null);
      const id = new ObjectId().toString();
      const event = makeEvent({ pathParameters: { auctionId: id } });

      await expect(invoke(event)).rejects.toThrow(createError.NotFound);
      await expect(invoke(event)).rejects.toThrow('Auction not found');
    });
  });
});
