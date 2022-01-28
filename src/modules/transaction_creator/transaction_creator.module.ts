import { Module } from '@nestjs/common';
import { TransactionService } from 'src/common/transaction/transaction.service';
import { BscWeb3Service } from 'src/common/web3/bsc_web3.service';
import { PolygonWeb3Service } from 'src/common/web3/polygon_web3.service';
import { TransactionRequestModule } from '../transaction_requests/transaction_request.module';
import { TransactionCreatorService } from './transaction_creator.service';

@Module({
  imports: [TransactionRequestModule],
  providers: [
    TransactionCreatorService,
    { provide: 'BscWeb3Service', useClass: BscWeb3Service },
    { provide: 'PolygonWeb3Service', useClass: PolygonWeb3Service },
    { provide: 'TransactionInterface', useClass: TransactionService },
  ],
  exports: [TransactionCreatorService],
})
export class TransactionCreatorModule {}
