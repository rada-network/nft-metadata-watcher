import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getAddress,
  getDiceLandedEventTopics,
} from 'src/common/contracts/RadomizeByRarityContract';
import { IWeb3Service } from 'src/common/web3/web3.service.interface';
import { Promise } from 'bluebird';
import {
  toBufferFromString,
  toNumberString,
} from 'src/common/ethereum_util/ethereum.util';
import BigNumber from 'bignumber.js';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';

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

    const diceLandedTopics = getDiceLandedEventTopics(networkId);
    const diceLandedLogs = logs.filter(({ topics }) =>
      diceLandedTopics.includes(topics[0]),
    );
    this.logger.log(
      `scanned OpenBox event logs: ${JSON.stringify(diceLandedLogs)}`,
    );

    await Promise.map(
      diceLandedLogs,
      ({ transactionHash, data }) => {
        const dataBuffer = toBufferFromString(data.slice(2));
        const poolId = new BigNumber(
          toNumberString(dataBuffer.slice(0, 64)),
          16,
        );
        const itemId = new BigNumber(
          toNumberString(dataBuffer.slice(64, 128)),
          16,
        );
        const result = new BigNumber(
          toNumberString(dataBuffer.slice(128, 192)),
          16,
        );
        return {
          transactionHash,
          poolId,
          itemId,
          result,
        };
      },
      { concurrency: 1 },
    ).map(this.handleDiceLandedLogData.bind(this));

    // TODO: add warning except log.
  }

  private async handleDiceLandedLogData({
    transactionHash,
    poolId,
    itemId,
    result,
  }: {
    transactionHash: string;
    poolId: BigNumber;
    itemId: BigNumber;
    result: BigNumber;
  }): Promise<boolean> {
    const basePath = this.configService.get('nftMetadata.path');
    const poolDirectoryPath = `${basePath}/${poolId}`;
    const filePath = `${poolDirectoryPath}/${itemId.toString()}.json`;
    try {
      // TODO: optimize
      const isFileExisted = existsSync(filePath);
      if (isFileExisted) {
        throw new Error(`${filePath} existed`);
      }

      const isPoolDirectoryExisted = existsSync(poolDirectoryPath);
      if (!isPoolDirectoryExisted) {
        await mkdir(poolDirectoryPath);
      }
      const json = JSON.stringify({
        poolId,
        itemId,
        rarity: result,
      });

      await writeFile(filePath, json, 'utf-8');

      // TODO: handle send back request to OpenBox contract.
      return true;
    } catch (e) {
      this.logger.error(`handleDiceLandedLogData error: ${e}`);
    }
  }
}
