import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import { auctionSchema } from '../schemas/auction';
import { AuctionEntity } from '@/domain/entities/auction.entity';
import { AuctionRepository } from '@/infra/repository/auction.repository';
import { connectToDatabase } from '@/infra/db/mongodb';
import { toHttpError } from '../utils/http-error';
import { logger } from '../utils/logger';

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  try {
    const userId = event.requestContext?.authorizer?.userId;
    logger.info('Creating auction', { userId, event: JSON.stringify(event) });
    const body = auctionSchema.parse(JSON.parse(event.body || '{}'));
    logger.info('Auction body', { body: JSON.stringify(body) });
    const auction = new AuctionEntity({
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
      endingAt: new Date(Date.now() + 1000 * 60 * 60),
    });
    logger.info('Auction entity', { auction: JSON.stringify(auction) });
    AuctionEntity.validate(auction.props);
    logger.info('Auction validated', { auction: JSON.stringify(auction) });
    const db = await connectToDatabase();
    const repository = new AuctionRepository(db);
    await repository.create(auction);
    logger.info('Auction created', { auction: JSON.stringify(auction) });
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Auction created',
        createdBy: userId ?? undefined,
      }),
    };
  } catch (error) {
    toHttpError(error, {
      validationMessagePrefixes: ['Title must be', 'Auction must be open'],
      conflictMessage: 'Auction already exists',
      logContext: 'Create auction',
    });
  }
};
