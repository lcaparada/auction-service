import { AuctionStatus } from '@/domain/entities/auction.entity';
import { ObjectId } from 'mongodb';

export interface AuctionModel {
  _id: ObjectId;
  title: string;
  status: AuctionStatus;
  highestBid: number;
  createdAt: Date;
  updatedAt: Date;
}
