import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({
  serviceName: 'auction-service',
  logLevel: (process.env.LOG_LEVEL as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR') || 'INFO',
  persistentLogAttributes: {
    environment: process.env.STAGE || 'dev',
  },
});

export { logger };
