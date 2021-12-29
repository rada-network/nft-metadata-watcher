import { Module } from '@nestjs/common';
import { Web3Service } from 'src/common/web3/web3.service';
import { ChainlogsWatcherService } from './chainlogs_watcher.service';

@Module({
  providers: [
    ChainlogsWatcherService,
    { provide: 'IWeb3Service', useClass: Web3Service },
  ],
})
export class ChainlogsWatcherModule {}
