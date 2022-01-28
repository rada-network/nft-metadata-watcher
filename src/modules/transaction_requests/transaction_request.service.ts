import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, LessThan, QueryRunner, Repository } from 'typeorm';
import {
  BaseTransactionRequest,
  MAX_ATTEMPTS,
  TransactionRequestStatus,
} from './base_transaction_request.model';
import { BscTransactionRequest } from './bsc_transaction_request.model';
import { PolygonTransactionRequest } from './polygon_transaction_request.model';

export enum TransactionRequestType {
  bsc = 'bscTransactionRequest',
  polygon = 'polygonTransactionRequest',
}

// CONSIDER: apply factory design pattern.
@Injectable()
export class TransactionRequestService {
  constructor(
    private readonly configService: ConfigService,

    @InjectRepository(BscTransactionRequest)
    private readonly bscTransactionRequest: Repository<BscTransactionRequest>,
    @InjectRepository(PolygonTransactionRequest)
    private readonly polygonTransactionRequest: Repository<PolygonTransactionRequest>,
  ) {}

  private readonly logger = new Logger(TransactionRequestService.name);

  async createTransactionRequest<Type extends BaseTransactionRequest>(
    type: TransactionRequestType,
    queryRunner: QueryRunner,
    entityLike: DeepPartial<Type>,
    reload = true,
  ): Promise<Type> {
    const record = this.getRepository<Type>(type).create(entityLike);
    await queryRunner.manager.save(record, { reload });

    return record;
  }

  async getPendingTransactionRequestByIdWithLock<
    Type extends BaseTransactionRequest,
  >(
    type: TransactionRequestType,
    queryRunner: QueryRunner,
    id: number,
  ): Promise<Type> {
    const repository = queryRunner.manager.getRepository(
      this.getRepositoryClass(type),
    ) as unknown as Repository<Type>;
    return repository
      .createQueryBuilder(type)
      .useTransaction(false)
      .setLock('pessimistic_write')
      .where({
        id,
        status: In([
          TransactionRequestStatus.none,
          TransactionRequestStatus.failed,
        ]),
        attempt: LessThan(MAX_ATTEMPTS),
        deletedAt: null,
      })
      .getOne();
  }

  async getTransactionRequestByIdWithLock<Type extends BaseTransactionRequest>(
    type: TransactionRequestType,
    queryRunner: QueryRunner,
    id: number,
  ): Promise<Type> {
    const repository = queryRunner.manager.getRepository(
      this.getRepositoryClass(type),
    ) as unknown as Repository<Type>;
    return repository
      .createQueryBuilder(type)
      .useTransaction(false)
      .setLock('pessimistic_write')
      .where({
        id,
        deletedAt: null,
      })
      .getOne();
  }

  async getPendingTransactionRequests<Type extends BaseTransactionRequest>(
    type: TransactionRequestType,
  ): Promise<Type[]> {
    return this.getRepository<Type>(type)
      .createQueryBuilder('request')
      .useTransaction(false)
      .where({
        status: In([
          TransactionRequestStatus.none,
          TransactionRequestStatus.failed,
        ]),
        attempt: LessThan(MAX_ATTEMPTS),
        deletedAt: null,
      })
      .orderBy('request.updatedAt', 'ASC')
      .take(
        this.configService.get('transactionCreator.getPendingRequestsLimit'),
      )
      .getMany();
  }

  private getRepository<Type extends BaseTransactionRequest>(
    type: TransactionRequestType,
  ): Repository<Type> {
    switch (type) {
      case TransactionRequestType.bsc:
        return this.bscTransactionRequest as unknown as Repository<Type>;
      case TransactionRequestType.polygon:
        return this.polygonTransactionRequest as unknown as Repository<Type>;
      default:
        throw new Error('getRepository Type mismatch.');
    }
  }

  private getRepositoryClass(type: TransactionRequestType) {
    switch (type) {
      case TransactionRequestType.bsc:
        return BscTransactionRequest;
      case TransactionRequestType.polygon:
        return PolygonTransactionRequest;
      default:
        throw new Error('getRepositoryClass Type mismatch.');
    }
  }
}
