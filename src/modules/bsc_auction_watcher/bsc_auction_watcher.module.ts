import { Module } from '@nestjs/common';
import { BscWeb3Service } from 'src/common/web3/bsc_web3.service';
import { PolygonWeb3Service } from 'src/common/web3/polygon_web3.service';
import { BscAuctionWatcherService } from './bsc_auction_watcher.service';

@Module({
  providers: [
    BscAuctionWatcherService,
    { provide: 'BscWeb3Service', useClass: BscWeb3Service },
    { provide: 'PolygonWeb3Service', useClass: PolygonWeb3Service },
  ],
})
export class BscAuctionWatcherModule {}
