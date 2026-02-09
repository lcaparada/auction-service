import { AuctionEntity, AuctionStatus } from '@/domain/entities/auction.entity';
import { Db, ObjectId, WithId } from 'mongodb';
import { AuctionModel } from '../db/models/auction.model';

const AUCTIONS_TO_PROCESS_INDEX = { status: 1, endingAt: 1 } as const;

export class AuctionRepository {
  private collection = 'auctions';
  constructor(private readonly db: Db) {}

  async ensureIndexes(): Promise<void> {
    await this.db
      .collection(this.collection)
      .createIndex(AUCTIONS_TO_PROCESS_INDEX, { name: 'status_1_endingAt_1' });
  }

  async create(auction: AuctionEntity): Promise<void> {
    await this.db.collection(this.collection).insertOne(auction.toJSON());
  }

  async getById(id: string): Promise<WithId<AuctionModel> | null> {
    const result = await this.db
      .collection<AuctionModel>(this.collection)
      .findOne({ _id: new ObjectId(id) });
    return result;
  }

  async getAuctions(): Promise<WithId<AuctionModel>[]> {
    const result = await this.db.collection<AuctionModel>(this.collection).find({}).toArray();
    return result;
  }

  async placeBid(id: string, bid: number) {
    const result = await this.db
      .collection<AuctionModel>(this.collection)
      .updateOne({ _id: new ObjectId(id) }, { $set: { highestBid: bid } });
    return result;
  }

  async getAuctionsToProcess() {
    const result = await this.db
      .collection<AuctionModel>(this.collection)
      .find({
        $and: [{ endingAt: { $lte: new Date() } }, { status: { $in: [AuctionStatus.OPEN] } }],
      })
      .toArray();
    return result;
  }

  async updateStatus(auction: AuctionEntity): Promise<void> {
    await this.db.collection(this.collection).updateOne(
      { _id: new ObjectId(auction.id) },
      {
        $set: {
          status: auction.status,
          updatedAt: new Date(),
        },
      }
    );
  }
}
