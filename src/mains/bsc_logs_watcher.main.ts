import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.modules/bsc_logs_watcher.module';
import { Environment } from 'src/common/constants/constants';
import { BscLogsWatcherService } from 'src/modules/bsc_logs_watcher/bsc_logs_watcher.service';
import { DebugMonoLogger, MonoLogger } from './Logger';

const loggerInstance =
  process.env.NODE_ENV === Environment.development
    ? {}
    : process.env.NODE_ENV === Environment.staging
    ? { logger: new DebugMonoLogger() }
    : { logger: new MonoLogger() };

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    ...loggerInstance,
  });
  const service = await app.resolve(BscLogsWatcherService);

  await service.getAllLogs();
}

bootstrap();
