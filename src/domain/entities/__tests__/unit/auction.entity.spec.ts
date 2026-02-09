import { AuctionEntity, AuctionEntityProps, AuctionStatus } from '@/domain/entities/auction.entity';

const makeProps = (overrides?: Partial<AuctionEntityProps>): AuctionEntityProps => ({
  title: 'Valid Title',
  status: AuctionStatus.OPEN,
  createdAt: new Date('2025-01-01'),
  highestBid: 100,
  updatedAt: new Date('2025-01-02'),
  ...overrides,
});

describe('AuctionEntity', () => {
  describe('constructor', () => {
    it('should create auction with props and auto-generated id', () => {
      const props = makeProps();
      const auction = new AuctionEntity(props);

      expect(auction.props).toEqual(props);
      expect(auction.id).toBeDefined();
      expect(auction.id).toMatch(/^[a-f0-9]{24}$/);
    });
  });

  describe('getters', () => {
    it('should return title from props', () => {
      const props = makeProps({ title: 'My Auction' });
      const auction = new AuctionEntity(props);

      expect(auction.title).toBe('My Auction');
    });

    it('should return highestBid from props', () => {
      const props = makeProps({ highestBid: 250 });
      const auction = new AuctionEntity(props);

      expect(auction.highestBid).toBe(250);
    });

    it('should return 0 when highestBid is not set', () => {
      const props = makeProps();
      const auction = new AuctionEntity({ ...props, highestBid: undefined });

      expect(auction.highestBid).toBe(0);
    });

    it('should return status from props', () => {
      const props = makeProps({ status: AuctionStatus.CLOSED });
      const auction = new AuctionEntity(props);

      expect(auction.status).toBe(AuctionStatus.CLOSED);
    });
  });

  describe('updateHighestBid', () => {
    it('should update highestBid', () => {
      const props = makeProps({ highestBid: 100 });
      const auction = new AuctionEntity(props);

      auction.updateHighestBid(200);

      expect(auction.highestBid).toBe(200);
      expect(auction.props.highestBid).toBe(200);
    });
  });

  describe('highestBid setter', () => {
    it('should set highestBid via setter', () => {
      const props = makeProps({ highestBid: 50 });
      const auction = new AuctionEntity(props);

      auction.highestBid = 300;

      expect(auction.highestBid).toBe(300);
      expect(auction.props.highestBid).toBe(300);
    });
  });

  describe('toJSON', () => {
    it('should return object with id and auction props', () => {
      const props = makeProps({ title: 'Item', highestBid: 99 });
      const auction = new AuctionEntity(props);
      const json = auction.toJSON();

      expect(json.id).toBe(auction.id);
      expect(json.title).toBe('Item');
      expect(json.highestBid).toBe(99);
      expect(json.status).toBe(AuctionStatus.OPEN);
      expect(json.createdAt).toEqual(props.createdAt);
      expect(json.updatedAt).toEqual(props.updatedAt);
    });
  });

  describe('validate (static)', () => {
    it('should not throw when title has at least 3 characters and status is OPEN', () => {
      const props = makeProps({ title: 'Abc', status: AuctionStatus.OPEN });

      expect(() => AuctionEntity.validate(props)).not.toThrow();
    });

    it('should throw when title has less than 3 characters', () => {
      const props = makeProps({ title: 'Ab', status: AuctionStatus.OPEN });

      expect(() => AuctionEntity.validate(props)).toThrow(
        'Title must be at least 3 characters long'
      );
    });

    it('should throw when status is not OPEN', () => {
      const props = makeProps({ title: 'Valid', status: AuctionStatus.CLOSED });

      expect(() => AuctionEntity.validate(props)).toThrow(
        'Auction must be open to update highest bid'
      );
    });

    it('should throw when status is CANCELLED', () => {
      const props = makeProps({ title: 'Valid', status: AuctionStatus.CANCELLED });

      expect(() => AuctionEntity.validate(props)).toThrow(
        'Auction must be open to update highest bid'
      );
    });
  });
});
