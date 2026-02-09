import { AuctionStatus } from '@/domain/entities/auction.entity';
import z from 'zod';

export const auctionSchema = z.object({
  title: z.string().min(3),
  status: z.nativeEnum(AuctionStatus),
  highestBid: z.number().optional(),
});
