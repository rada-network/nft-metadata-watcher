import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ChainlogsWatcherService } from 'src/modules/chainlog_watcher/chainlogs_watcher.service';
import { AppModule } from '../app.modules/watcher.module';
import { DebugMonoLogger, MonoLogger } from './Logger';

const loggerInstance =
  process.env.NODE_ENV === 'development'
    ? {}
    : process.env.NODE_ENV === 'staging'
    ? { logger: new DebugMonoLogger() }
    : { logger: new MonoLogger() };

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    ...loggerInstance,
  });
  const service = await app.resolve(ChainlogsWatcherService);
  const config = await app.resolve(ConfigService);
  await service.getAllLogs(
    parseInt(config.get('blockchain.scanStartBlock'), 10),
  );
}

bootstrap();
