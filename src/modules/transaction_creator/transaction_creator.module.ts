import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EthereumAccountsService } from 'src/common/ethereum_accounts/ethereum_accounts.service';
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
    {
      provide: 'EthereumAccountsService',
      useClass: EthereumAccountsService,
    },
    { provide: 'TransactionInterface', useClass: TransactionService },
  ],
  exports: [TransactionCreatorService, TypeOrmModule],
})
export class TransactionCreatorModule {}
