import { AuctionEntity } from '@/domain/entities/auction.entity';
import { Db } from 'mongodb';

export class AuctionRepository {
  private collection = 'auctions';
  constructor(private readonly db: Db) {}

  async create(auction: AuctionEntity) {
    await this.db.collection(this.collection).insertOne(auction.toJSON());
  }
}
