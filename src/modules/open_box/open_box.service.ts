import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, QueryRunner, Repository } from 'typeorm';
import { OpenBox } from './open_box.model';

@Injectable()
export class OpenBoxService {
  constructor(
    private readonly configService: ConfigService,
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

  async getOpenBoxByPoolIdTokenIdWithLock(
    queryRunner: QueryRunner,
    poolId: number,
    tokenId: number,
  ): Promise<OpenBox> {
    return queryRunner.manager
      .getRepository(OpenBox)
      .createQueryBuilder('openBox')
      .setLock('pessimistic_write')
      .leftJoinAndSelect(
        'openBox.randomTransactionRequest',
        'randomTransactionRequest',
      )
      .leftJoinAndSelect(
        'openBox.updateNftTransactionRequest',
        'updateNftTransactionRequest',
      )
      .where({
        poolId,
        tokenId,
        deletedAt: null,
      })
      .getOne()
      .catch((e) => {
        this.logger.error(`Failed to getOpenBoxByPoolIdTokenIdWithLock: ${e}`);
        throw new Error('Failed to getOpenBoxByPoolIdTokenIdWithLock.');
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

  public generateFileKey(key: string): string {
    const env = this.configService.get('env');
    return `${env === 'development' ? 'dev' : 'prod'}/${key}`;
  }

  /**
   * Format: https://nft-meta.rada.network/testnet/imgs/[poolid]/[rarity].jpg
   * @param poolId
   * @param rarity
   * @returns
   */
  getRarityImageUrl(poolId: number, rarity: number): string {
    const env = this.configService.get('env');
    const baseUrl = this.configService.get('nftMetadata.rarityBaseUrl');
    return `${baseUrl}/${
      env === 'development' ? 'testnet' : 'mainnet'
    }/imgs/${poolId}/${rarity}.jpg`;
  }

  getRarityName(rarity: number): string {
    const nameJson = {
      '1': 'Creator',
      '2': 'Ruler',
      '3': 'Caregiver',
      '4': 'Jester',
      '5': 'Citizen',
      '6': 'Lover',
      '7': 'Hero',
      '8': 'Magician',
      '9': 'Rebel',
      '10': 'Explorer',
      '11': 'Sage',
      '12': 'Innocent',
    };

    return nameJson[rarity.toString()];
  }
}
