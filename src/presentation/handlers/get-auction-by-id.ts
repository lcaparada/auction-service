import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import { AuctionRepository } from '@/infra/repository/auction.repository';
import { connectToDatabase } from '@/infra/db/mongodb';
import { toHttpError } from '../utils/http-error';
import { logger } from '../utils/logger';
import { ObjectId } from 'mongodb';
import createError from 'http-errors';
import { AuctionEntity } from '@/domain/entities/auction.entity';

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  try {
    logger.info('Getting auction by ID', { event: JSON.stringify(event) });
    const auctionId = event.pathParameters?.auctionId;
    if (!auctionId) {
      throw new createError.BadRequest('Auction ID is required');
    }
    if (!ObjectId.isValid(auctionId)) {
      throw new createError.BadRequest('Auction ID is invalid');
    }

    const db = await connectToDatabase();
    const repository = new AuctionRepository(db);
    const auction = await repository.getById(auctionId);

    if (!auction) {
      throw new createError.NotFound('Auction not found');
    }
    logger.info('Auction found', { auction: JSON.stringify(auction) });
    const auctionEntity = new AuctionEntity(auction);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Auction found', auction: auctionEntity.toJSON() }),
    };
  } catch (error) {
    toHttpError(error, {
      validationMessagePrefixes: ['Auction ID is invalid'],
      conflictMessage: 'Auction ID is invalid',
      logContext: 'Get auction by ID',
    });
  }
};
