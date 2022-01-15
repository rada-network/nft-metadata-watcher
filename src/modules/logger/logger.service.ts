import { Inject, LoggerService } from '@nestjs/common';
import { BotInterface } from 'src/common/bot/bot.interface';

export class WrappedMonoLogger implements LoggerService {
  constructor(
    @Inject('BotInterface')
    private readonly botService: BotInterface,
  ) {}

  log(message: string) {
    console.log('[INFO]', new Date().toISOString(), message);
  }
  error(message: string, trace: string) {
    console.log('[ERROR]', new Date().toISOString(), message, trace);
    this.botService.sendMessageNoThrow(message);
  }
  warn(message: string) {
    console.log('[WARN]', new Date().toISOString(), message);
  }
  debug(message: string) {
    return;
  }
  verbose(message: string) {
    return;
  }
}

export class WrappedDebugMonoLogger implements LoggerService {
  constructor(
    @Inject('BotInterface')
    private readonly botService: BotInterface,
  ) {}

  log(message: string) {
    console.log('[INFO]', new Date().toISOString(), message);
  }
  error(message: string, trace: string) {
    console.log('[ERROR]', new Date().toISOString(), message, trace);
    this.botService.sendMessageNoThrow(message);
  }
  warn(message: string) {
    console.log('[WARN]', new Date().toISOString(), message);
  }
  debug(message: string) {
    console.log('[DEBUG]', new Date().toISOString(), message);
  }
  verbose(message: string) {
    console.log('[VERBOSE]', new Date().toISOString(), message);
  }
}
