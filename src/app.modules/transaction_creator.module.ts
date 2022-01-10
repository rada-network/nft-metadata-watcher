import { Module, HttpModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionCreatorModule } from 'src/modules/transaction_creator/transaction_creator.module';
import configuration from '../config/configuration';

const ENV = process.env.NODE_ENV;

@Module({
  imports: [
    TransactionCreatorModule,
    TypeOrmModule.forRoot(),
    ConfigModule.forRoot({
      envFilePath: ['.env', !ENV ? '.env.development' : `.env.${ENV}`],
      load: [configuration],
      isGlobal: true,
    }),
    HttpModule,
  ],
})
export class AppModule {}
