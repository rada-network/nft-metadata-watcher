import TelegramBot from 'node-telegram-bot-api';

export type SendMessageReponse = TelegramBot.Message;
export type SendMessageOptions = TelegramBot.SendMessageOptions;
export interface BotInterface {
  sendMessageNoThrow(
    message: string,
    options?: SendMessageOptions,
  ): Promise<SendMessageReponse>;
}
