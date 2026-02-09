import type { ScheduledHandler } from 'aws-lambda';

import { toHttpError } from '../utils/http-error';
import { logger } from '../utils/logger';
import { connectToDatabase } from '@/infra/db/mongodb';
import { AuctionRepository } from '@/infra/repository/auction.repository';
import { AuctionEntity, AuctionStatus } from '@/domain/entities/auction.entity';

export const handler: ScheduledHandler = async (event) => {
  try {
    logger.info('Processing auctions', { time: event.time });
    const db = await connectToDatabase();
    const repository = new AuctionRepository(db);
    await repository.ensureIndexes();
    const auctions = await repository.getAuctionsToProcess();
    logger.info('Auctions to process', { auctions: JSON.stringify(auctions) });

    if (auctions.length === 0) {
      logger.info('No auctions to process');
      return;
    }

    let auctionsUpdated = 0;

    for (const auction of auctions) {
      const auctionEntity = new AuctionEntity(auction);
      auctionEntity.updateStatus(AuctionStatus.CLOSED);
      await repository.updateStatus(auctionEntity);
      logger.info('Auction status updated', { auction: JSON.stringify(auctionEntity) });
      auctionsUpdated++;
    }

    logger.info('Auctions updated', { auctionsUpdated: auctionsUpdated });
  } catch (error) {
    toHttpError(error, {
      validationMessagePrefixes: ['Auctions not found'],
      conflictMessage: 'Auctions not found',
      logContext: 'Get auctions',
    });
  }
};
