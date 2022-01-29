import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getRandomizeByRarityContractAddress,
  getDiceLandedEventTopics,
} from 'src/common/contracts/RandomizeByRarityContract';
import { IWeb3Service } from 'src/common/web3/web3.service.interface';
import { Promise } from 'bluebird';
import {
  toBufferFromString,
  toNumber,
} from 'src/common/ethereum_util/ethereum.util';
import BigNumber from 'bignumber.js';
import {
  getOpenBoxContractAddress,
  updateNFT,
} from 'src/common/contracts/OpenBoxContract';
import { OpenBoxService } from '../open_box/open_box.service';
import {
  TransactionRequestService,
  TransactionRequestType,
} from '../transaction_requests/transaction_request.service';
import { TransactionInterface } from 'src/common/transaction/transaction.interface';
import { WarningError } from 'src/common/errors/warning_error';
import { BscTransactionRequest } from '../transaction_requests/bsc_transaction_request.model';
import { FileBuffer } from 'src/common/fileBuffer/fileBuffer';
import { S3Service } from 'src/common/s3/s3.service';

const MAXIMUM_SCANNING_BLOCKS = 40;

export class PolygonLogsWatcherService {
  constructor(
    private readonly configService: ConfigService,
    private readonly openBoxService: OpenBoxService,
    private readonly transactionRequestService: TransactionRequestService,

    @Inject('TransactionInterface')
    private readonly transaction: TransactionInterface,
    @Inject('PolygonWeb3Service')
    private readonly polygonWeb3Service: IWeb3Service,
    @Inject('BscWeb3Service')
    private readonly bscWeb3Service: IWeb3Service,
    @Inject('S3Interface')
    private readonly s3Service: S3Service,
  ) {}

  private readonly logger = new Logger(PolygonLogsWatcherService.name);

  async getAllLogs() {
    try {
      let startBlock: number;
      const startBlockStr = this.configService.get('polygon.scanStartBlock');
      if (startBlockStr) {
        startBlock = parseInt(startBlockStr, 10);
      } else {
        startBlock =
          (await this.polygonWeb3Service.getBlockNumber()) -
          parseInt(
            this.configService.get('polygon.scanFromBackLatestBlock'),
            10,
          );
      }

      await this.getLogs(startBlock);
    } catch (e) {
      this.logger.error(`CRASH polygon watcher: ${e}`);
      throw e;
    }
  }

  private async getLogs(fromBlock: number): Promise<void> {
    // TODO: add ethereum maintaince to be able to pause this process.
    const confirmedBlockNumber =
      (await this.polygonWeb3Service.getBlockNumber(true)) -
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

    //watch RandomizeByRarityContract logs
    const watchRandomizeByRarityContractLogsResult =
      this.watchRandomizeByRarityContractLogs(fromBlock, toBlock, networkId);

    await Promise.all([watchRandomizeByRarityContractLogsResult]);

    return this.getLogs(toBlock + 1);
  }

  private async watchRandomizeByRarityContractLogs(
    fromBlock: number,
    toBlock: number,
    networkId: string,
  ) {
    // contract logs
    const logs = await this.polygonWeb3Service.getPastLogs({
      fromBlock,
      toBlock,
      address: getRandomizeByRarityContractAddress(networkId),
    });
    this.logger.log(
      `scanned watchRandomizeByRarityContract logs: ${JSON.stringify(logs)}`,
    );

    const diceLandedTopics = getDiceLandedEventTopics(networkId);
    const diceLandedLogs = logs.filter(({ topics }) =>
      diceLandedTopics.includes(topics[0]),
    );
    this.logger.log(
      `scanned diceLanded event logs: ${JSON.stringify(diceLandedLogs)}`,
    );

    await Promise.map(diceLandedLogs, ({ transactionHash, data }) => {
      const dataBuffer = toBufferFromString(data);
      const poolId = toNumber(dataBuffer.slice(0, 32));

      const tokenId = toNumber(dataBuffer.slice(32, 64));

      const result = toNumber(dataBuffer.slice(64, 96));

      return {
        transactionHash,
        poolId,
        tokenId,
        rarity: result,
      };

      // CONSIDER: set concurrency properly.
    }).map(this.handleDiceLandedLogData.bind(this), { concurrency: 3 });

    // CONSIDER: add warning except log.
  }

  private async handleDiceLandedLogData({
    transactionHash,
    poolId,
    tokenId,
    rarity,
  }: {
    transactionHash: string;
    poolId: number;
    tokenId: number;
    rarity: number;
  }): Promise<boolean> {
    const queryRunner = await this.transaction
      .startTransaction()
      .catch(async (e) => {
        this.logger.error(`Failed to start transaction. ${e}`);
        throw new Error('Failed to handleOpenBoxLogData.');
      });

    try {
      const openBox =
        await this.openBoxService.getOpenBoxByPoolIdTokenIdWithLock(
          queryRunner,
          poolId,
          tokenId,
        );

      if (!openBox) {
        throw new Error(
          `OpenBox - poolId=${poolId},tokenId=${tokenId} - not found.`,
        );
      }

      if (
        openBox.randomEventTransactionHash ||
        openBox.rarity ||
        openBox.metadataUrl ||
        openBox.updateNftTransactionRequest
      ) {
        throw new WarningError(
          `Handled DiceLandedLog of this OpenBox - poolId=${poolId},tokenId=${tokenId}.`,
        );
      }

      const bscNetworkId = this.configService.get('bsc.networkId');
      const transactionRequest =
        await this.transactionRequestService.createTransactionRequest<BscTransactionRequest>(
          TransactionRequestType.bsc,
          queryRunner,
          {
            from: this.bscWeb3Service.getAddress(),
            to: getOpenBoxContractAddress(bscNetworkId),
            gasLimit: this.configService.get('bsc.gasLimit'),
            value: new BigNumber(0),
            data: updateNFT(bscNetworkId, poolId, tokenId, rarity),
          },
        );
      openBox.randomEventTransactionHash = transactionHash;
      openBox.rarity = rarity;
      openBox.updateNftTransactionRequest = transactionRequest;

      // Update to S3/minio
      // TODO: match file format
      const buffer = Buffer.from(
        JSON.stringify({
          poolId,
          tokenId,
          rarity,
          image: this.openBoxService.getRarityImageUrl(poolId, rarity),
          name: this.openBoxService.getRarityName(rarity),
        }),
      );
      const fileBuffer = await FileBuffer.fromJsonBuffer(buffer);
      const fileKey = this.openBoxService.generateFileKey(
        `${tokenId}.${fileBuffer.ext}`,
      );
      openBox.metadataUrl = this.s3Service.generateContentUrl(fileKey);

      await this.s3Service.putFile(
        this.s3Service.getContentBucketName(),
        fileKey,
        fileBuffer,
      );

      await queryRunner.manager.save(openBox, { reload: false });
      await this.transaction.commit(queryRunner);

      this.logger
        .log(`Finished hanlde this DiceLanded event - poolId=${poolId} tokenId=${tokenId} 
          transactionHash=${transactionHash}`);

      return true;
    } catch (e) {
      await this.transaction.rollback(queryRunner);
      if (e instanceof WarningError) {
        this.logger
          .warn(`handleDiceLandedLogData - poolId=${poolId} tokenId=${tokenId} 
          transactionHash=${transactionHash} - warning: ${e}`);
      } else {
        this.logger
          .error(`handleDiceLandedLogData - poolId=${poolId} tokenId=${tokenId} 
          transactionHash=${transactionHash} - error: ${e}`);
      }
    }
  }
}
