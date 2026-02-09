import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import { AuctionRepository } from '@/infra/repository/auction.repository';
import { connectToDatabase } from '@/infra/db/mongodb';
import { toHttpError } from '../utils/http-error';
import { logger } from '../utils/logger';
import { bidSchema } from '../schemas/auction';
import createError from 'http-errors';
import { ObjectId } from 'mongodb';
import { AuctionStatus } from '@/domain/entities/auction.entity';

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  try {
    logger.info('Placing bid', { event: JSON.stringify(event) });
    const auctionId = event.pathParameters?.id;
    if (!auctionId) {
      throw new createError.BadRequest('Auction ID is required');
    }
    if (!ObjectId.isValid(auctionId)) {
      throw new createError.BadRequest('Invalid auction ID');
    }
    logger.info('Auction ID', { auctionId: auctionId });
    const db = await connectToDatabase();
    const repository = new AuctionRepository(db);
    const auction = await repository.getById(auctionId);
    if (!auction) {
      throw new createError.NotFound('Auction not found');
    }
    logger.info('Auction', { auction: JSON.stringify(auction) });
    if (auction.status !== AuctionStatus.OPEN) {
      throw new createError.BadRequest('Auction is not open');
    }

    const body = bidSchema.parse(JSON.parse(event.body || '{}'));

    logger.info('Bid body', { body: JSON.stringify(body) });

    if (body.amount <= auction.highestBid) {
      throw new createError.BadRequest('Bid amount is less than the highest bid');
    }

    const bid = await repository.placeBid(auctionId, body.amount);
    logger.info('Bid placed', { bid: JSON.stringify(bid) });
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Bid placed', bid: bid }),
    };
  } catch (error) {
    toHttpError(error, {
      validationMessagePrefixes: ['Auctions not found'],
      conflictMessage: 'Auctions not found',
      logContext: 'Get auctions',
    });
  }
};
