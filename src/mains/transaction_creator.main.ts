import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.modules/transaction_creator.module';
import { TransactionCreatorService } from 'src/modules/transaction_creator/transaction_creator.service';
import { PolygonTransactionRequest } from 'src/modules/transaction_requests/polygon_transaction_request.model';
import { TransactionRequestType } from 'src/modules/transaction_requests/transaction_request.service';
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
  const service = await app.resolve(TransactionCreatorService);

  const polygon = service.createAllTransactions<PolygonTransactionRequest>(
    TransactionRequestType.polygon,
  );

  await Promise.all([polygon]);
}

bootstrap();
