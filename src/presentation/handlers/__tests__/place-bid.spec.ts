import createError from 'http-errors';
import { ObjectId } from 'mongodb';
import { AuctionStatus } from '@/domain/entities/auction.entity';
import { handler } from '../place-bid';

const mockGetById = jest.fn();
const mockPlaceBid = jest.fn();

jest.mock('@/infra/db/mongodb', () => ({
  connectToDatabase: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/infra/repository/auction.repository', () => ({
  AuctionRepository: jest.fn().mockImplementation(() => ({
    getById: mockGetById,
    placeBid: mockPlaceBid,
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
  overrides: Partial<{
    pathParameters: { id?: string } | null;
    body: string;
  }> = {}
): Parameters<typeof handler>[0] =>
  ({
    pathParameters: { id: new ObjectId().toString() },
    body: JSON.stringify({ amount: 100 }),
    ...overrides,
  }) as Parameters<typeof handler>[0];

const emptyContext = {} as Parameters<typeof handler>[1];
const noopCallback = (() => {}) as Parameters<typeof handler>[2];
const invoke = (event: Parameters<typeof handler>[0]) => handler(event, emptyContext, noopCallback);

const openAuction = {
  _id: new ObjectId(),
  title: 'Test',
  status: AuctionStatus.OPEN,
  highestBid: 50,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('place-bid handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetById.mockResolvedValue(openAuction);
    mockPlaceBid.mockResolvedValue({ modifiedCount: 1 });
  });

  describe('success', () => {
    it('should return 200 and place bid when auction exists and amount is higher', async () => {
      const id = new ObjectId().toString();
      const event = makeEvent({ pathParameters: { id }, body: JSON.stringify({ amount: 200 }) });

      const result = await invoke(event);

      expect(result).toEqual({
        statusCode: 200,
        body: JSON.stringify({
          message: 'Bid placed',
          bid: { modifiedCount: 1 },
        }),
      });
      expect(mockGetById).toHaveBeenCalledWith(id);
      expect(mockPlaceBid).toHaveBeenCalledWith(id, 200);
    });
  });

  describe('pathParameters.id', () => {
    it('should throw BadRequest when pathParameters is null', async () => {
      const event = makeEvent({ pathParameters: null });

      await expect(invoke(event)).rejects.toThrow(createError.BadRequest);
      await expect(invoke(event)).rejects.toThrow('Auction ID is required');
      expect(mockGetById).not.toHaveBeenCalled();
    });

    it('should throw BadRequest when id is undefined', async () => {
      const event = makeEvent({ pathParameters: {} });

      await expect(invoke(event)).rejects.toThrow('Auction ID is required');
      expect(mockGetById).not.toHaveBeenCalled();
    });

    it('should throw BadRequest when id is not a valid ObjectId', async () => {
      const event = makeEvent({ pathParameters: { id: 'invalid-id' } });

      await expect(invoke(event)).rejects.toThrow(createError.BadRequest);
      await expect(invoke(event)).rejects.toThrow('Invalid auction ID');
      expect(mockGetById).not.toHaveBeenCalled();
    });
  });

  describe('auction not found', () => {
    it('should throw NotFound when getById returns null', async () => {
      mockGetById.mockResolvedValue(null);
      const id = new ObjectId().toString();
      const event = makeEvent({ pathParameters: { id } });

      await expect(invoke(event)).rejects.toThrow(createError.NotFound);
      await expect(invoke(event)).rejects.toThrow('Auction not found');
      expect(mockPlaceBid).not.toHaveBeenCalled();
    });
  });

  describe('auction not open', () => {
    it('should throw BadRequest when auction status is not OPEN', async () => {
      mockGetById.mockResolvedValue({
        ...openAuction,
        status: AuctionStatus.CLOSED,
      });
      const id = new ObjectId().toString();
      const event = makeEvent({ pathParameters: { id } });

      await expect(invoke(event)).rejects.toThrow(createError.BadRequest);
      await expect(invoke(event)).rejects.toThrow('Auction is not open');
      expect(mockPlaceBid).not.toHaveBeenCalled();
    });
  });

  describe('bid amount', () => {
    it('should throw BadRequest when amount is less than or equal to highestBid', async () => {
      const id = new ObjectId().toString();
      const event = makeEvent({
        pathParameters: { id },
        body: JSON.stringify({ amount: 50 }),
      });

      await expect(invoke(event)).rejects.toThrow(createError.BadRequest);
      await expect(invoke(event)).rejects.toThrow('Bid amount is less than the highest bid');
      expect(mockPlaceBid).not.toHaveBeenCalled();
    });

    it('should throw when body amount is invalid (ZodError)', async () => {
      const id = new ObjectId().toString();
      const event = makeEvent({
        pathParameters: { id },
        body: JSON.stringify({ amount: -10 }),
      });

      await expect(invoke(event)).rejects.toThrow();
      expect(mockPlaceBid).not.toHaveBeenCalled();
    });

    it('should throw when body is missing amount', async () => {
      const id = new ObjectId().toString();
      const event = makeEvent({
        pathParameters: { id },
        body: JSON.stringify({}),
      });

      await expect(invoke(event)).rejects.toThrow();
      expect(mockPlaceBid).not.toHaveBeenCalled();
    });
  });
});
