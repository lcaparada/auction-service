import { isMongoDuplicateKeyError, toHttpError } from '../http-error';
import { z } from 'zod';
import createError from 'http-errors';

describe('isMongoDuplicateKeyError', () => {
  it('should return true when error has code 11000', () => {
    expect(isMongoDuplicateKeyError({ code: 11000 })).toBe(true);
  });

  it('should return false when error has different code', () => {
    expect(isMongoDuplicateKeyError({ code: 11001 })).toBe(false);
    expect(isMongoDuplicateKeyError({ code: 0 })).toBe(false);
  });

  it('should return false when error is null or undefined', () => {
    expect(isMongoDuplicateKeyError(null)).toBe(false);
    expect(isMongoDuplicateKeyError(undefined)).toBe(false);
  });

  it('should return false when error is not an object', () => {
    expect(isMongoDuplicateKeyError('error')).toBe(false);
    expect(isMongoDuplicateKeyError(11000)).toBe(false);
  });
});

describe('toHttpError', () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('ZodError', () => {
    it('should throw BadRequest with message from issues', () => {
      const result = z.object({ title: z.string().min(5) }).safeParse({ title: 'a' });
      const zodError = result.error!;

      expect(() => toHttpError(zodError)).toThrow(createError.BadRequest);
      expect(() => toHttpError(zodError)).toThrow('title');
    });

    it('should throw BadRequest for ZodError (validation failed)', () => {
      const result = z.object({ name: z.string() }).safeParse({ name: 123 });
      const zodError = result.error!;

      expect(() => toHttpError(zodError)).toThrow(createError.BadRequest);
    });
  });

  describe('validation message prefixes', () => {
    it('should throw BadRequest when error message matches a prefix', () => {
      const error = new Error('Title must be at least 3 characters');

      expect(() => toHttpError(error, { validationMessagePrefixes: ['Title must be'] })).toThrow(
        createError.BadRequest
      );
      expect(() => toHttpError(error, { validationMessagePrefixes: ['Title must be'] })).toThrow(
        'Title must be at least 3 characters'
      );
    });

    it('should not throw BadRequest when no prefix matches', () => {
      const error = new Error('Something else');

      expect(() => toHttpError(error, { validationMessagePrefixes: ['Title must be'] })).toThrow(
        createError.InternalServerError
      );
    });
  });

  describe('Mongo duplicate key', () => {
    it('should throw Conflict with default message', () => {
      expect(() => toHttpError({ code: 11000 })).toThrow(createError.Conflict);
      expect(() => toHttpError({ code: 11000 })).toThrow('Resource already exists');
    });

    it('should throw Conflict with custom conflictMessage', () => {
      expect(() =>
        toHttpError({ code: 11000 }, { conflictMessage: 'Auction already exists' })
      ).toThrow('Auction already exists');
    });
  });

  describe('fallback to InternalServerError', () => {
    it('should log and throw InternalServerError for generic Error', () => {
      const error = new Error('DB connection failed');

      expect(() => toHttpError(error)).toThrow(createError.InternalServerError);
      expect(() => toHttpError(error)).toThrow('DB connection failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Handler error:', error);
    });

    it('should use custom logContext in log', () => {
      const error = new Error('Unknown');

      expect(() => toHttpError(error, { logContext: 'Create auction' })).toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Create auction error:', error);
    });

    it('should throw "Failed to process request" when error is not an Error instance', () => {
      expect(() => toHttpError('string error')).toThrow('Failed to process request');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
