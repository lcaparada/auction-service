import { ObjectId } from 'mongodb';
import { AuctionStatus } from '@/domain/entities/auction.entity';
import { handler } from '../process-auctions';

const mockEnsureIndexes = jest.fn().mockResolvedValue(undefined);
const mockGetAuctionsToProcess = jest.fn();
const mockUpdateStatus = jest.fn().mockResolvedValue(undefined);
const mockSendMessage = jest.fn().mockResolvedValue(undefined);

jest.mock('@/infra/db/mongodb', () => ({
  connectToDatabase: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/infra/repository/auction.repository', () => ({
  AuctionRepository: jest.fn().mockImplementation(() => ({
    ensureIndexes: mockEnsureIndexes,
    getAuctionsToProcess: mockGetAuctionsToProcess,
    updateStatus: mockUpdateStatus,
  })),
}));

jest.mock('@/infra/services/email-queue.service', () => ({
  EmailQueueService: jest.fn().mockImplementation(() => ({
    sendMessage: mockSendMessage,
  })),
}));

jest.mock('@/presentation/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

jest.mock('@/presentation/utils/http-error', () => ({
  toHttpError: jest.fn((err: unknown) => {
    throw err;
  }),
}));

const makeEvent = (overrides: Partial<{ time: string }> = {}): Parameters<typeof handler>[0] =>
  ({
    time: new Date().toISOString(),
    ...overrides,
  }) as Parameters<typeof handler>[0];

const emptyContext = {} as Parameters<typeof handler>[1];
const noopCallback = (() => {}) as Parameters<typeof handler>[2];
const invoke = (event: Parameters<typeof handler>[0]) => handler(event, emptyContext, noopCallback);

const auctionDoc = {
  _id: new ObjectId(),
  title: 'To Close',
  status: AuctionStatus.OPEN,
  highestBid: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  endingAt: new Date(Date.now() - 1000),
};

describe('process-auctions handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuctionsToProcess.mockResolvedValue([]);
  });

  describe('success', () => {
    it('should call ensureIndexes and getAuctionsToProcess', async () => {
      await invoke(makeEvent());

      expect(mockEnsureIndexes).toHaveBeenCalledTimes(1);
      expect(mockGetAuctionsToProcess).toHaveBeenCalledTimes(1);
    });

    it('should not call updateStatus when no auctions to process', async () => {
      await invoke(makeEvent());

      expect(mockUpdateStatus).not.toHaveBeenCalled();
    });

    it('should call updateStatus once with CLOSED when one auction to process', async () => {
      mockGetAuctionsToProcess.mockResolvedValue([auctionDoc]);

      await invoke(makeEvent());

      expect(mockUpdateStatus).toHaveBeenCalledTimes(1);
      const [entity] = mockUpdateStatus.mock.calls[0];
      expect(entity.status).toBe(AuctionStatus.CLOSED);
    });

    it('should call updateStatus for each auction when multiple to process', async () => {
      const doc2 = {
        ...auctionDoc,
        _id: new ObjectId(),
        title: 'Second',
      };
      mockGetAuctionsToProcess.mockResolvedValue([auctionDoc, doc2]);

      await invoke(makeEvent());

      expect(mockUpdateStatus).toHaveBeenCalledTimes(2);
      expect(mockUpdateStatus.mock.calls[0][0].status).toBe(AuctionStatus.CLOSED);
      expect(mockUpdateStatus.mock.calls[1][0].status).toBe(AuctionStatus.CLOSED);
      expect(mockUpdateStatus.mock.calls[1][0].title).toBe('Second');
    });

    it('should call sendMessage with email for each auction processed', async () => {
      mockGetAuctionsToProcess.mockResolvedValue([auctionDoc]);

      await invoke(makeEvent());

      expect(mockSendMessage).toHaveBeenCalledTimes(1);
      expect(mockSendMessage).toHaveBeenCalledWith({
        to: 'lcaparada@gmail.com',
        subject: 'Auction closed',
        body: 'The auction has been closed',
      });
    });
  });

  describe('error handling', () => {
    it('should rethrow when getAuctionsToProcess throws', async () => {
      mockGetAuctionsToProcess.mockRejectedValue(new Error('DB error'));

      await expect(invoke(makeEvent())).rejects.toThrow('DB error');
    });

    it('should rethrow when updateStatus throws', async () => {
      mockGetAuctionsToProcess.mockResolvedValue([auctionDoc]);
      mockUpdateStatus.mockRejectedValue(new Error('Update failed'));

      await expect(invoke(makeEvent())).rejects.toThrow('Update failed');
    });
  });
});
