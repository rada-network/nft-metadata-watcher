import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TelegramBot from 'node-telegram-bot-api';
import { BotInterface, SendMessageReponse } from './bot.interface';

@Injectable()
export class TelegramBotService implements BotInterface {
  private telegramBot: TelegramBot;
  constructor(private readonly configService: ConfigService) {
    const botToken = this.configService.get('telegram.botToken');
    this.telegramBot = new TelegramBot(botToken, { polling: true });
  }

  private readonly logger = new Logger(TelegramBotService.name);

  async sendMessageNoThrow(
    message: string,
    options?: TelegramBot.SendMessageOptions,
  ): Promise<SendMessageReponse> {
    try {
      const chatId = this.configService.get('telegram.chatId');
      return await this.telegramBot.sendMessage(chatId, message, options);
    } catch (e) {
      this.logger.log(`Error when sending bot message: ${e}`);
    }
  }
}
