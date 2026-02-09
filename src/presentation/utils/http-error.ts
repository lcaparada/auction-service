import createError from 'http-errors';
import { ZodError } from 'zod';

export const isMongoDuplicateKeyError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;

export type ToHttpErrorOptions = {
  validationMessagePrefixes?: string[];
  conflictMessage?: string;
  logContext?: string;
};

export function toHttpError(error: unknown, options: ToHttpErrorOptions = {}): never {
  const {
    validationMessagePrefixes = [],
    conflictMessage = 'Resource already exists',
    logContext = 'Handler',
  } = options;

  if (error instanceof ZodError) {
    const message = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new createError.BadRequest(message || 'Validation failed');
  }

  if (error instanceof Error) {
    const isValidation = validationMessagePrefixes.some((prefix) => error.message.includes(prefix));
    if (isValidation) {
      throw new createError.BadRequest(error.message);
    }
  }

  if (isMongoDuplicateKeyError(error)) {
    throw new createError.Conflict(conflictMessage);
  }

  console.error(`${logContext} error:`, error);
  throw new createError.InternalServerError(
    error instanceof Error ? error.message : 'Failed to process request'
  );
}
