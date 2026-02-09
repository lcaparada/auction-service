import { auctionSchema } from '../auction';
import { AuctionStatus } from '@/domain/entities/auction.entity';

describe('auctionSchema', () => {
  describe('parse', () => {
    it('should accept valid object with title, status and optional highestBid', () => {
      const result = auctionSchema.parse({
        title: 'Valid Auction Title',
        status: AuctionStatus.OPEN,
      });
      expect(result.title).toBe('Valid Auction Title');
      expect(result.status).toBe(AuctionStatus.OPEN);
      expect(result.highestBid).toBeUndefined();
    });

    it('should accept object with highestBid', () => {
      const result = auctionSchema.parse({
        title: 'Auction With Bid',
        status: AuctionStatus.CLOSED,
        highestBid: 150,
      });
      expect(result.title).toBe('Auction With Bid');
      expect(result.status).toBe(AuctionStatus.CLOSED);
      expect(result.highestBid).toBe(150);
    });

    it('should accept all valid status values', () => {
      expect(auctionSchema.parse({ title: 'Abc', status: AuctionStatus.OPEN }).status).toBe(
        AuctionStatus.OPEN
      );
      expect(auctionSchema.parse({ title: 'Abc', status: AuctionStatus.CLOSED }).status).toBe(
        AuctionStatus.CLOSED
      );
      expect(auctionSchema.parse({ title: 'Abc', status: AuctionStatus.CANCELLED }).status).toBe(
        AuctionStatus.CANCELLED
      );
    });

    it('should accept title with exactly 3 characters', () => {
      const result = auctionSchema.parse({ title: 'Abc', status: AuctionStatus.OPEN });
      expect(result.title).toBe('Abc');
    });
  });

  describe('parse (invalid)', () => {
    it('should throw when title has less than 3 characters', () => {
      expect(() =>
        auctionSchema.parse({ title: 'Ab', status: AuctionStatus.OPEN })
      ).toThrow();
    });

    it('should throw when title is empty string', () => {
      expect(() =>
        auctionSchema.parse({ title: '', status: AuctionStatus.OPEN })
      ).toThrow();
    });

    it('should throw when status is invalid', () => {
      expect(() =>
        auctionSchema.parse({ title: 'Valid Title', status: 'INVALID' })
      ).toThrow();
    });

    it('should throw when highestBid is not a number', () => {
      expect(() =>
        auctionSchema.parse({
          title: 'Valid Title',
          status: AuctionStatus.OPEN,
          highestBid: '100',
        })
      ).toThrow();
    });

    it('should throw when title is missing', () => {
      expect(() => auctionSchema.parse({ status: AuctionStatus.OPEN })).toThrow();
    });

    it('should throw when status is missing', () => {
      expect(() => auctionSchema.parse({ title: 'Valid Title' })).toThrow();
    });
  });
});
