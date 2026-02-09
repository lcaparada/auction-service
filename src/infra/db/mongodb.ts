import { Db, MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI_TEST!;
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export const connectToDatabase = async (): Promise<Db> => {
  if (cachedDb) {
    return cachedDb;
  }

  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  cachedDb = client.db();
  return cachedDb;
};

export const disconnectFromDatabase = async (): Promise<void> => {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
  }
};
