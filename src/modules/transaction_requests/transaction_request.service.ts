import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, QueryRunner, Repository } from 'typeorm';
import { BaseTransactionRequest } from './base_transaction_request.model';
import { BscTransactionRequest } from './bsc_transaction_request.model';
import { PolygonTransactionRequest } from './polygon_transaction_request.model';

export enum TransactionRequestRepository {
  bsc = 'bscTransactionRequest',
  polygon = 'polygonTransactionRequest',
}

// CONSIDER: apply factory design pattern.
@Injectable()
export class TransactionRequestService {
  constructor(
    @InjectRepository(BscTransactionRequest)
    private readonly bscTransactionRequest: Repository<BscTransactionRequest>,
    @InjectRepository(PolygonTransactionRequest)
    private readonly polygonTransactionRequest: Repository<PolygonTransactionRequest>,
  ) {}

  private readonly logger = new Logger(TransactionRequestService.name);

  async createTransactionRequest<Type extends BaseTransactionRequest>(
    type: TransactionRequestRepository,
    queryRunner: QueryRunner,
    entityLike: DeepPartial<Type>,
    reload = true,
  ): Promise<Type> {
    const record = this.getRepository<Type>(type).create(entityLike);
    await queryRunner.manager.save(record, { reload });

    return record;
  }

  private getRepository<Type extends BaseTransactionRequest>(
    type: TransactionRequestRepository,
  ): Repository<Type> {
    switch (type) {
      case TransactionRequestRepository.bsc:
        return this.bscTransactionRequest as unknown as Repository<Type>;
      case TransactionRequestRepository.polygon:
        return this.polygonTransactionRequest as unknown as Repository<Type>;
      default:
        throw new Error('Type mismatch.');
    }
  }
}
