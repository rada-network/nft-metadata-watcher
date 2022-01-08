import { Injectable } from '@nestjs/common';
import { Connection, EntityManager, QueryRunner } from 'typeorm';
import { IsolationLevel } from 'typeorm/driver/types/IsolationLevel';
import { TransactionInterface } from './transaction.interface';

@Injectable()
export class TransactionService implements TransactionInterface {
  constructor(private readonly connection: Connection) {}

  async startTransaction(
    isolationLevel?: IsolationLevel,
  ): Promise<QueryRunner> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.startTransaction(isolationLevel);
    return queryRunner;
  }

  async commit(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.commitTransaction();
    await queryRunner.release();
  }

  async rollback(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  }
}
