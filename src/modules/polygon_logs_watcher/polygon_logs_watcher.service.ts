import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getAddress,
  getDiceLandedEventTopics,
} from 'src/common/contracts/RadomizeByRarityContract';
import { IWeb3Service } from 'src/common/web3/web3.service.interface';

const MAXIMUM_SCANNING_BLOCKS = 40;

export class PolygonLogsWatcherService {
  constructor(
    private readonly configService: ConfigService,

    @Inject('IWeb3Service')
    private readonly web3Service: IWeb3Service,
  ) {}

  private readonly logger = new Logger(PolygonLogsWatcherService.name);

  async getAllLogs(fromBlock: number) {
    await this.getLogs(fromBlock).catch((e) => {
      this.logger.error(`CRASH watcher: ${e}`);
      throw e;
    });
  }

  private async getLogs(fromBlock: number): Promise<void> {
    // TODO: add ethereum maintaince to be able to pause this process.
    const confirmedBlockNumber =
      (await this.web3Service.getBlockNumber(true)) -
      parseInt(this.configService.get('polygon.delayConfirmedBlocks'), 10);

    if (confirmedBlockNumber < fromBlock) {
      this.logger.log('Sleep...zzz');

      await new Promise((res): void => {
        setTimeout(() => {
          res(() => `sleeped`);
        }, this.configService.get('polygon.sleepTime'));
      });
      return this.getLogs(fromBlock);
    }

    const toBlock = Math.min(
      confirmedBlockNumber,
      fromBlock + MAXIMUM_SCANNING_BLOCKS,
    );
    this.logger.log(`scan block from ${fromBlock} to ${toBlock}`);

    const networkId = this.configService.get('polygon.networkId');

    //watch NftAuctionContract logs
    const watchRadomizeByRarityContractLogsResult =
      this.watchRadomizeByRarityContractLogs(fromBlock, toBlock, networkId);

    await Promise.all([watchRadomizeByRarityContractLogsResult]);

    return this.getLogs(toBlock + 1);
  }

  private async watchRadomizeByRarityContractLogs(
    fromBlock: number,
    toBlock: number,
    networkId: string,
  ) {
    // contract logs
    const logs = await this.web3Service.getPastLogs({
      fromBlock,
      toBlock,
      address: getAddress(networkId),
    });
    this.logger.log(
      `scanned watchRadomizeByRarityContract logs: ${JSON.stringify(logs)}`,
    );

    // TODO: match DiceLanded  log.
    const diceLandedTopics = getDiceLandedEventTopics(networkId);
    const diceLandedLogs = logs.filter(({ topics }) =>
      diceLandedTopics.includes(topics[0]),
    );
    this.logger.log(
      `scanned OpenBox event logs: ${JSON.stringify(diceLandedLogs)}`,
    );

    // TODO: handling scanned OpenBox logs data.
    // TODO: add warning except log.
  }
}
