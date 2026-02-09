import { connectToDatabase, disconnectFromDatabase } from '@/infra/db/mongodb';
import { AuctionRepository } from '../../auction.repository';
import { Db } from 'mongodb';
import { AuctionEntity, AuctionStatus } from '@/domain/entities/auction.entity';

describe('AuctionRepository', () => {
  let db: Db;
  let sut: AuctionRepository;

  beforeEach(async () => {
    db = await connectToDatabase();
    sut = new AuctionRepository(db);
  });

  afterEach(async () => {
    await db.collection('auctions').deleteMany({});
  });

  afterAll(async () => {
    await disconnectFromDatabase();
  });

  describe('create', () => {
    it('should create an auction and persist id, title and status', async () => {
      const auction = new AuctionEntity({ title: 'Test Auction', status: AuctionStatus.OPEN });
      await sut.create(auction);

      const result = await db.collection('auctions').findOne({ title: 'Test Auction' });
      expect(result).toBeDefined();
      expect(result?.id).toBe(auction.id);
      expect(result?.title).toBe('Test Auction');
      expect(result?.status).toBe(AuctionStatus.OPEN);
    });

    it('should persist all provided fields including highestBid, createdAt and updatedAt', async () => {
      const createdAt = new Date('2025-01-01T12:00:00Z');
      const updatedAt = new Date('2025-01-02T12:00:00Z');
      const auction = new AuctionEntity({
        title: 'Full Auction',
        status: AuctionStatus.CLOSED,
        highestBid: 500,
        createdAt,
        updatedAt,
      });
      await sut.create(auction);

      const result = await db.collection('auctions').findOne({ title: 'Full Auction' });
      expect(result).toBeDefined();
      expect(result?.id).toBe(auction.id);
      expect(result?.title).toBe('Full Auction');
      expect(result?.status).toBe(AuctionStatus.CLOSED);
      expect(result?.highestBid).toBe(500);
      expect(new Date(result?.createdAt).toISOString()).toBe(createdAt.toISOString());
      expect(new Date(result?.updatedAt).toISOString()).toBe(updatedAt.toISOString());
    });

    it('should store each auction with its own id', async () => {
      const auction1 = new AuctionEntity({ title: 'Auction One', status: AuctionStatus.OPEN });
      const auction2 = new AuctionEntity({ title: 'Auction Two', status: AuctionStatus.OPEN });
      await sut.create(auction1);
      await sut.create(auction2);

      const docs = await db.collection('auctions').find({}).toArray();
      expect(docs).toHaveLength(2);
      expect(docs.map((d) => d.id).sort()).toEqual([auction1.id, auction2.id].sort());
    });

    it('should persist document with same structure as entity.toJSON()', async () => {
      const auction = new AuctionEntity({ title: 'Structure Test', status: AuctionStatus.CANCELLED });
      const json = auction.toJSON();
      await sut.create(auction);

      const result = await db.collection('auctions').findOne({ title: 'Structure Test' });
      expect(result).toBeDefined();
      expect(result?.id).toBe(json.id);
      expect(result?.title).toBe(json.title);
      expect(result?.status).toBe(json.status);
    });
  });
});
