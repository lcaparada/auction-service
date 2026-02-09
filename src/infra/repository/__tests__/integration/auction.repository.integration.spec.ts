import { connectToDatabase, disconnectFromDatabase } from '@/infra/db/mongodb';
import { AuctionRepository } from '../../auction.repository';
import { Db, ObjectId } from 'mongodb';
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

  describe('getById', () => {
    it('should return the auction when it exists', async () => {
      const id = new ObjectId();
      await db.collection('auctions').insertOne({
        _id: id,
        title: 'Find Me',
        status: AuctionStatus.OPEN,
        highestBid: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await sut.getById(id.toString());

      expect(result).toBeDefined();
      expect(result?._id.toString()).toBe(id.toString());
      expect(result?.title).toBe('Find Me');
      expect(result?.status).toBe(AuctionStatus.OPEN);
    });

    it('should return null when no auction has the given id', async () => {
      const nonExistentId = new ObjectId();

      const result = await sut.getById(nonExistentId.toString());

      expect(result).toBeNull();
    });

    it('should return document with all stored fields', async () => {
      const id = new ObjectId();
      const createdAt = new Date('2025-01-01T12:00:00Z');
      const updatedAt = new Date('2025-01-02T12:00:00Z');
      await db.collection('auctions').insertOne({
        _id: id,
        title: 'Full Doc',
        status: AuctionStatus.CLOSED,
        highestBid: 999,
        createdAt,
        updatedAt,
      });

      const result = await sut.getById(id.toString());

      expect(result).toBeDefined();
      expect(result?.title).toBe('Full Doc');
      expect(result?.status).toBe(AuctionStatus.CLOSED);
      expect(result?.highestBid).toBe(999);
      expect(new Date(result!.createdAt).toISOString()).toBe(createdAt.toISOString());
      expect(new Date(result!.updatedAt).toISOString()).toBe(updatedAt.toISOString());
    });
  });

  describe('getAuctions', () => {
    it('should return empty array when no auctions exist', async () => {
      const result = await sut.getAuctions();
      expect(result).toEqual([]);
    });

    it('should return all auctions in the collection', async () => {
      const id1 = new ObjectId();
      const id2 = new ObjectId();
      await db.collection('auctions').insertMany([
        {
          _id: id1,
          title: 'First',
          status: AuctionStatus.OPEN,
          highestBid: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: id2,
          title: 'Second',
          status: AuctionStatus.CLOSED,
          highestBid: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await sut.getAuctions();

      expect(result).toHaveLength(2);
      const titles = result.map((r) => r.title).sort();
      expect(titles).toEqual(['First', 'Second']);
    });

    it('should return documents with _id, title, status and highestBid', async () => {
      const id = new ObjectId();
      await db.collection('auctions').insertOne({
        _id: id,
        title: 'Single',
        status: AuctionStatus.OPEN,
        highestBid: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await sut.getAuctions();

      expect(result).toHaveLength(1);
      expect(result[0]._id.toString()).toBe(id.toString());
      expect(result[0].title).toBe('Single');
      expect(result[0].status).toBe(AuctionStatus.OPEN);
      expect(result[0].highestBid).toBe(50);
    });
  });

  describe('placeBid', () => {
    it('should update highestBid when auction exists', async () => {
      const id = new ObjectId();
      await db.collection('auctions').insertOne({
        _id: id,
        title: 'Bid Auction',
        status: AuctionStatus.OPEN,
        highestBid: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await sut.placeBid(id.toString(), 250);

      expect(result.modifiedCount).toBe(1);
      const updated = await db.collection('auctions').findOne({ _id: id });
      expect(updated?.highestBid).toBe(250);
    });

    it('should not modify any document when id does not exist', async () => {
      const nonExistentId = new ObjectId();

      const result = await sut.placeBid(nonExistentId.toString(), 100);

      expect(result.matchedCount).toBe(0);
      expect(result.modifiedCount).toBe(0);
    });

    it('should only update highestBid and leave other fields unchanged', async () => {
      const id = new ObjectId();
      const createdAt = new Date('2025-01-01');
      const updatedAt = new Date('2025-01-02');
      await db.collection('auctions').insertOne({
        _id: id,
        title: 'Keep Title',
        status: AuctionStatus.OPEN,
        highestBid: 0,
        createdAt,
        updatedAt,
      });

      await sut.placeBid(id.toString(), 999);

      const updated = await db.collection('auctions').findOne({ _id: id });
      expect(updated?.highestBid).toBe(999);
      expect(updated?.title).toBe('Keep Title');
      expect(updated?.status).toBe(AuctionStatus.OPEN);
    });
  });

  describe('ensureIndexes', () => {
    it('should create index for getAuctionsToProcess without throwing', async () => {
      await expect(sut.ensureIndexes()).resolves.toBeUndefined();
    });
  });

  describe('getAuctionsToProcess', () => {
    it('should return empty array when no auctions match', async () => {
      const result = await sut.getAuctionsToProcess();
      expect(result).toEqual([]);
    });

    it('should return only auctions with endingAt in the past and status OPEN', async () => {
      const pastDate = new Date(Date.now() - 60000);
      const futureDate = new Date(Date.now() + 60000);
      await db.collection('auctions').insertMany([
        {
          _id: new ObjectId(),
          title: 'To Process',
          status: AuctionStatus.OPEN,
          highestBid: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          endingAt: pastDate,
        },
        {
          _id: new ObjectId(),
          title: 'Future',
          status: AuctionStatus.OPEN,
          highestBid: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          endingAt: futureDate,
        },
        {
          _id: new ObjectId(),
          title: 'Closed',
          status: AuctionStatus.CLOSED,
          highestBid: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
          endingAt: pastDate,
        },
      ]);

      const result = await sut.getAuctionsToProcess();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('To Process');
      expect(result[0].status).toBe(AuctionStatus.OPEN);
    });

    it('should return all matching auctions when multiple qualify', async () => {
      const pastDate = new Date(Date.now() - 1000);
      await db.collection('auctions').insertMany([
        {
          _id: new ObjectId(),
          title: 'First',
          status: AuctionStatus.OPEN,
          highestBid: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          endingAt: pastDate,
        },
        {
          _id: new ObjectId(),
          title: 'Second',
          status: AuctionStatus.OPEN,
          highestBid: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
          endingAt: pastDate,
        },
      ]);

      const result = await sut.getAuctionsToProcess();

      expect(result).toHaveLength(2);
      const titles = result.map((r) => r.title).sort();
      expect(titles).toEqual(['First', 'Second']);
    });
  });

  describe('updateStatus', () => {
    it('should update status and updatedAt when auction exists', async () => {
      const id = new ObjectId();
      await db.collection('auctions').insertOne({
        _id: id,
        title: 'To Close',
        status: AuctionStatus.OPEN,
        highestBid: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const auction = new AuctionEntity(
        { title: 'To Close', status: AuctionStatus.CLOSED },
        id.toString()
      );
      await sut.updateStatus(auction);

      const updated = await db.collection('auctions').findOne({ _id: id });
      expect(updated?.status).toBe(AuctionStatus.CLOSED);
      expect(updated?.updatedAt).toBeDefined();
    });

    it('should not change other fields when updating status', async () => {
      const id = new ObjectId();
      const createdAt = new Date('2025-01-01');
      await db.collection('auctions').insertOne({
        _id: id,
        title: 'Keep Title',
        status: AuctionStatus.OPEN,
        highestBid: 200,
        createdAt,
        updatedAt: new Date(),
      });

      const auction = new AuctionEntity(
        { title: 'Keep Title', status: AuctionStatus.CANCELLED },
        id.toString()
      );
      await sut.updateStatus(auction);

      const updated = await db.collection('auctions').findOne({ _id: id });
      expect(updated?.status).toBe(AuctionStatus.CANCELLED);
      expect(updated?.title).toBe('Keep Title');
      expect(updated?.highestBid).toBe(200);
      expect(new Date(updated!.createdAt).toISOString()).toBe(createdAt.toISOString());
    });
  });
});
