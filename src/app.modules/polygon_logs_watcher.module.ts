import { Module, HttpModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PolygonLogsWatcherModule } from 'src/modules/polygon_logs_watcher/polygon_logs_watcher.module';
import configuration from '../config/configuration';

const ENV = process.env.NODE_ENV;

@Module({
  imports: [
    PolygonLogsWatcherModule,
    TypeOrmModule.forRoot(),
    ConfigModule.forRoot({
      envFilePath: !ENV ? '.env.development' : `.env.${ENV}`,
      load: [configuration],
      isGlobal: true,
    }),
    HttpModule,
  ],
})
export class AppModule {}
