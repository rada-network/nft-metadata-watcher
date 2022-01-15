import { ConsoleLogger } from '@nestjs/common';
import { BotInterface } from 'src/common/bot/bot.interface';

export class MonoLogger extends ConsoleLogger {
  private botService: BotInterface;

  setBotService(botService: BotInterface) {
    this.botService = botService;
  }

  error(message: any, stack?: string, context?: string) {
    if (this.botService) {
      this.botService.sendMessageNoThrow(message);
    }
    // eslint-disable-next-line prefer-rest-params
    super.error.apply(this, arguments);
  }
}

export class DebugMonoLogger extends ConsoleLogger {
  private botService: BotInterface;

  setBotService(botService: BotInterface) {
    this.botService = botService;
  }

  error(message: any, stack?: string, context?: string) {
    if (this.botService) {
      this.botService.sendMessageNoThrow(message);
    }
    // eslint-disable-next-line prefer-rest-params
    super.error.apply(this, arguments);
  }
}
