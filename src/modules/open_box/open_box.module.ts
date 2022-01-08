import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpenBox } from './open_box.model';
import { OpenBoxService } from './open_box.service';

@Module({
  imports: [TypeOrmModule.forFeature([OpenBox])],
  providers: [OpenBoxService],
  exports: [OpenBoxService, TypeOrmModule],
})
export class OpenBoxModule {}
