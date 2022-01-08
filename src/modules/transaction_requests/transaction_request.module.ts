import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BscTransactionRequest } from './bsc_transaction_request.model';
import { PolygonTransactionRequest } from './polygon_transaction_request.model';
import { TransactionRequestService } from './transaction_request.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BscTransactionRequest,
      PolygonTransactionRequest,
    ]),
  ],
  providers: [TransactionRequestService],
  exports: [TransactionRequestService, TypeOrmModule],
})
export class TransactionRequestModule {}
