import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.modules/bsc_logs_watcher.module';
import { Environment } from 'src/common/constants/constants';
import { BscLogsWatcherService } from 'src/modules/bsc_logs_watcher/bsc_logs_watcher.service';
import { DebugMonoLogger, MonoLogger } from './Logger';

const loggerInstance =
  process.env.NODE_ENV === Environment.production
    ? { logger: new MonoLogger() }
    : { logger: new DebugMonoLogger() };

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    ...loggerInstance,
  });

  const botService = await app.get('BotInterface');
  loggerInstance.logger.setBotService(botService);
  const service = await app.resolve(BscLogsWatcherService);

  await service.getAllLogs();
}

bootstrap();
