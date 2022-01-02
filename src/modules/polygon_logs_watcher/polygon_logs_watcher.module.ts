import { Module } from '@nestjs/common';
import { PolygonWeb3Service } from 'src/common/web3/polygon_web3.service';
import { PolygonLogsWatcherService } from './polygon_logs_watcher.service';

@Module({
  providers: [
    PolygonLogsWatcherService,
    { provide: 'IWeb3Service', useClass: PolygonWeb3Service },
  ],
})
export class PolygonLogsWatcherModule {}
