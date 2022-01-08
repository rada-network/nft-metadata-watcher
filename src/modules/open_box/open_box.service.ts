import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, QueryRunner, Repository } from 'typeorm';
import { OpenBox } from './open_box.model';

@Injectable()
export class OpenBoxService {
  constructor(
    @InjectRepository(OpenBox)
    private readonly openBoxRepository: Repository<OpenBox>,
  ) {}

  private readonly logger = new Logger(OpenBoxService.name);

  async getOpenBoxByPoolIdTokenId(
    poolId: number,
    tokenId: number,
  ): Promise<OpenBox> {
    return await this.openBoxRepository
      .findOne({
        poolId,
        tokenId,
        deletedAt: null,
      })
      .catch((e) => {
        this.logger.error(`Failed to getOpenBoxByPoolIdTokenId: ${e}`);
        throw new Error('Failed to getOpenBoxByPoolIdTokenId.');
      });
  }

  async createOpenBox(
    queryRunner: QueryRunner,
    entityLike: DeepPartial<OpenBox>,
    reload = true,
  ): Promise<OpenBox> {
    const record = this.openBoxRepository.create(entityLike);
    await queryRunner.manager.save(record, { reload });

    return record;
  }
}
