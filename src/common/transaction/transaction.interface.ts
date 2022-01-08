import { QueryRunner } from 'typeorm';
import { IsolationLevel } from 'typeorm/driver/types/IsolationLevel';

export interface TransactionInterface {
  startTransaction(isolationLevel?: IsolationLevel): Promise<QueryRunner>;
  commit(queryRunner: QueryRunner): Promise<void>;
  rollback(queryRunner: QueryRunner): Promise<void>;
}
