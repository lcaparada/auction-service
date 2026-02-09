import type { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import { auctionSchema } from '../schemas/auction';
import { AuctionEntity } from '@/domain/entities/auction.entity';
import { AuctionRepository } from '@/infra/repository/auction.repository';
import { connectToDatabase } from '@/infra/db/mongodb';
import { toHttpError } from '../utils/http-error';

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  try {
    const body = auctionSchema.parse(JSON.parse(event.body || '{}'));
    const auction = new AuctionEntity(body);
    AuctionEntity.validate(auction.props);

    const db = await connectToDatabase();
    const repository = new AuctionRepository(db);
    await repository.create(auction);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Auction created' }),
    };
  } catch (error) {
    toHttpError(error, {
      validationMessagePrefixes: ['Title must be', 'Auction must be open'],
      conflictMessage: 'Auction already exists',
      logContext: 'Create auction',
    });
  }
};
