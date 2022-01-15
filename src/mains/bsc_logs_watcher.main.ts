import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.modules/bsc_logs_watcher.module';
import { Environment } from 'src/common/constants/constants';
import { BscLogsWatcherService } from 'src/modules/bsc_logs_watcher/bsc_logs_watcher.service';
import {
  WrappedDebugMonoLogger,
  WrappedMonoLogger,
} from 'src/modules/logger/logger.service';
import { DebugMonoLogger, MonoLogger } from './Logger';

const loggerInstance =
  process.env.NODE_ENV === Environment.development
    ? {}
    : process.env.NODE_ENV === Environment.staging
    ? { logger: new DebugMonoLogger() }
    : { logger: new MonoLogger() };

const wrappedLoggerClass =
  process.env.NODE_ENV === Environment.production
    ? WrappedMonoLogger
    : WrappedDebugMonoLogger;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    ...loggerInstance,
    bufferLogs: true,
  });
  app.useLogger(app.get(wrappedLoggerClass));
  const service = await app.resolve(BscLogsWatcherService);

  await service.getAllLogs();
}

bootstrap();
