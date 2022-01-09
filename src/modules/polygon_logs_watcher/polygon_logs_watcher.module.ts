import { Module } from '@nestjs/common';
import { EthereumAccountsService } from 'src/common/ethereum_accounts/ethereum_accounts.service';
import { S3Service } from 'src/common/s3/s3.service';
import { TransactionService } from 'src/common/transaction/transaction.service';
import { BscWeb3Service } from 'src/common/web3/bsc_web3.service';
import { PolygonWeb3Service } from 'src/common/web3/polygon_web3.service';
import { OpenBoxModule } from '../open_box/open_box.module';
import { TransactionRequestModule } from '../transaction_requests/transaction_request.module';
import { PolygonLogsWatcherService } from './polygon_logs_watcher.service';

@Module({
  imports: [OpenBoxModule, TransactionRequestModule],
  providers: [
    PolygonLogsWatcherService,
    { provide: 'BscWeb3Service', useClass: BscWeb3Service },
    { provide: 'PolygonWeb3Service', useClass: PolygonWeb3Service },
    {
      provide: 'EthereumAccountsService',
      useClass: EthereumAccountsService,
    },
    { provide: 'TransactionInterface', useClass: TransactionService },
    { provide: 'S3Interface', useClass: S3Service },
  ],
})
export class PolygonLogsWatcherModule {}
