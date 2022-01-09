import {
  Entity,
  CreateDateColumn,
  Index,
  UpdateDateColumn,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { BscTransactionRequest } from '../transaction_requests/bsc_transaction_request.model';
import { PolygonTransactionRequest } from '../transaction_requests/polygon_transaction_request.model';

@Entity()
export class OpenBox {
  @PrimaryGeneratedColumn()
  readonly id?: number;

  @CreateDateColumn()
  @Index()
  readonly createdAt?: Date;

  @UpdateDateColumn()
  @Index()
  readonly updatedAt?: Date;

  @Column({ nullable: true })
  @Index()
  readonly deletedAt: Date | null;

  @Column({ length: 66 })
  readonly openBoxEventTransactionHash: string;

  @Column({ length: 66, nullable: true })
  public randomEventTransactionHash: string | null;

  // CONSIDER: make poolId and tokenId as composite key
  @Column()
  @Index()
  readonly poolId: number;

  @Column()
  @Index()
  readonly tokenId: number;

  @Column({ nullable: true })
  public rarity: number | null;

  @Column({ nullable: true })
  public metadataUrl: string | null;

  @Column({ nullable: true })
  readonly randomTransactionRequestId: number | null;

  @Column({ nullable: true })
  public updateNftTransactionRequestId: number | null;

  @OneToOne(
    (type) => PolygonTransactionRequest,
    (transactionRequest) => transactionRequest.openBox,
  )
  @JoinColumn({ name: 'random_transaction_request_id' })
  readonly randomTransactionRequest: PolygonTransactionRequest | null;

  @OneToOne(
    (type) => BscTransactionRequest,
    (transactionRequest) => transactionRequest.openBox,
  )
  @JoinColumn({ name: 'update_nft_transaction_request_id' })
  public updateNftTransactionRequest: BscTransactionRequest | null;
}
