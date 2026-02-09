import { Entity } from './entity';

export enum AuctionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export interface AuctionEntityProps {
  title: string;
  status: AuctionStatus;
  createdAt?: Date;
  highestBid?: number;
  updatedAt?: Date;
}

export class AuctionEntity extends Entity<AuctionEntityProps> {
  constructor(props: AuctionEntityProps) {
    super(props);
  }

  static validate(props: AuctionEntityProps) {
    if (props.title.length < 3) {
      throw new Error('Title must be at least 3 characters long');
    }

    if (props.status !== AuctionStatus.OPEN) {
      throw new Error('Auction must be open to update highest bid');
    }
  }

  updateHighestBid(value: number) {
    this.props.highestBid = value;
  }

  set highestBid(value: number) {
    this.props.highestBid = value;
  }

  get title() {
    return this.props.title;
  }

  get highestBid() {
    return this.props.highestBid ?? 0;
  }

  get status() {
    return this.props.status;
  }
}
