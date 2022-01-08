import { TxData } from '@ethereumjs/tx';
import { BigNumber } from 'bignumber.js';
import {
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ethValueFeeColumnOptions } from '../../common/typeorm_columns_option/columnOptions';

// 250GWei
export const GAS_PRICE_LIMIT = new BigNumber(250000000000);

export const MAX_ATTEMPTS = 5;

export enum TransactionRequestStatus {
  none = 'none',
  success = 'success',
  failed = 'failed',
}

export abstract class BaseTransactionRequest {
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
  public deletedAt: Date | null;

  @Column({ nullable: true, length: 66 })
  @Index({ unique: true })
  public hash: string;

  @Column({ length: 42 })
  readonly from: string;

  @Column({ length: 42 })
  readonly to: string;

  @Column()
  public gasLimit: string;

  @Column(ethValueFeeColumnOptions)
  public gasPrice: BigNumber; // unit is wei

  @Column(ethValueFeeColumnOptions)
  public value: BigNumber; // unit is wei

  @Column({ type: 'text', nullable: false })
  readonly data: string;

  @Column({ nullable: true })
  public nonce: number;

  // eslint-disable-next-line @typescript-eslint/no-inferrable-types
  @Column({ default: 0 })
  public attemp: number = 0;

  @Column({
    type: 'enum',
    enum: TransactionRequestStatus,
    default: TransactionRequestStatus.none,
  })
  @Index()
  public status: TransactionRequestStatus = TransactionRequestStatus.none;

  getTxData(): TxData {
    return {
      to: this.to,
      gasLimit: `0x${new BigNumber(this.gasLimit).toString(16)}`,
      gasPrice: `0x${new BigNumber(this.gasPrice).toString(16)}`,
      value: `0x${new BigNumber(this.value).toString(16)}`,
      data: this.data,
      nonce: `0x${new BigNumber(this.nonce).toString(16)}`,
    };
  }
}
