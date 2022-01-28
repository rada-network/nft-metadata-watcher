import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionService } from 'src/common/transaction/transaction.service';
import { BscWeb3Service } from 'src/common/web3/bsc_web3.service';
import { PolygonWeb3Service } from 'src/common/web3/polygon_web3.service';
import { OpenBoxModule } from '../open_box/open_box.module';
import { PolygonTransactionRequest } from '../transaction_requests/polygon_transaction_request.model';
import { TransactionRequestModule } from '../transaction_requests/transaction_request.module';
import { BscLogsWatcherService } from './bsc_logs_watcher.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PolygonTransactionRequest]),
    OpenBoxModule,
    TransactionRequestModule,
  ],
  providers: [
    BscLogsWatcherService,
    { provide: 'BscWeb3Service', useClass: BscWeb3Service },
    { provide: 'PolygonWeb3Service', useClass: PolygonWeb3Service },
    { provide: 'TransactionInterface', useClass: TransactionService },
  ],
})
export class BscLogsWatcherModule {}
