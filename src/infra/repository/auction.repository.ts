import { AuctionEntity } from '@/domain/entities/auction.entity';
import { Db, ObjectId, WithId } from 'mongodb';
import { AuctionModel } from '../db/models/auction.model';

export class AuctionRepository {
  private collection = 'auctions';
  constructor(private readonly db: Db) {}

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
}
