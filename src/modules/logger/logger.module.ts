import { Module } from '@nestjs/common';
import { TelegramBotService } from 'src/common/bot/telegram_bot.service';
import { WrappedDebugMonoLogger, WrappedMonoLogger } from './logger.service';

@Module({
  providers: [
    WrappedDebugMonoLogger,
    WrappedMonoLogger,
    { provide: 'BotInterface', useClass: TelegramBotService },
  ],
  exports: [WrappedDebugMonoLogger, WrappedMonoLogger],
})
export class LoggerModule {}
