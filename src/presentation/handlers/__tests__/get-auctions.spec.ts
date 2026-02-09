import { ObjectId } from 'mongodb';
import { AuctionStatus } from '@/domain/entities/auction.entity';
import { handler } from '../get-auctions';

const mockGetAuctions = jest.fn();

jest.mock('@/infra/db/mongodb', () => ({
  connectToDatabase: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/infra/repository/auction.repository', () => ({
  AuctionRepository: jest.fn().mockImplementation(() => ({
    getAuctions: mockGetAuctions,
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

const makeEvent = (): Parameters<typeof handler>[0] => ({} as Parameters<typeof handler>[0]);

const emptyContext = {} as Parameters<typeof handler>[1];
const noopCallback = (() => {}) as Parameters<typeof handler>[2];
const invoke = (event: Parameters<typeof handler>[0]) =>
  handler(event, emptyContext, noopCallback);

describe('get-auctions handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuctions.mockResolvedValue([]);
  });

  describe('success', () => {
    it('should return 200 and empty auction array when no auctions', async () => {
      const result = await invoke(makeEvent());

      expect(result?.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.message).toBe('Auctions found');
      expect(body.auction).toEqual([]);
      expect(mockGetAuctions).toHaveBeenCalledTimes(1);
    });

    it('should return 200 and map auctions to JSON', async () => {
      const docs = [
        {
          _id: new ObjectId(),
          title: 'First',
          status: AuctionStatus.OPEN,
          highestBid: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          title: 'Second',
          status: AuctionStatus.CLOSED,
          highestBid: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockGetAuctions.mockResolvedValue(docs);

      const result = await invoke(makeEvent());

      expect(result?.statusCode).toBe(200);
      const body = JSON.parse(result!.body);
      expect(body.message).toBe('Auctions found');
      expect(body.auction).toHaveLength(2);
      expect(body.auction[0].title).toBe('First');
      expect(body.auction[1].title).toBe('Second');
      expect(mockGetAuctions).toHaveBeenCalledTimes(1);
    });
  });
});
