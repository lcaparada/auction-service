import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import { AuctionRepository } from '@/infra/repository/auction.repository';
import { connectToDatabase } from '@/infra/db/mongodb';
import { toHttpError } from '../utils/http-error';
import { logger } from '../utils/logger';
import { AuctionEntity } from '@/domain/entities/auction.entity';

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  try {
    logger.info('Getting auctions', { event: JSON.stringify(event) });
    const db = await connectToDatabase();
    const repository = new AuctionRepository(db);
    const auctions = await repository.getAuctions();
    logger.info('Auctions found', { auctions: JSON.stringify(auctions) });
    const auctionsJSON = auctions.map((auction) => new AuctionEntity(auction).toJSON());
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Auctions found', auction: auctionsJSON }),
    };
  } catch (error) {
    toHttpError(error, {
      validationMessagePrefixes: ['Auctions not found'],
      conflictMessage: 'Auctions not found',
      logContext: 'Get auctions',
    });
  }
};
