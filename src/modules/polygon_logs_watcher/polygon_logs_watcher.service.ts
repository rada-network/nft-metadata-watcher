import { TxData } from '@ethereumjs/tx';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getRandomizeByRarityContractAddress,
  getDiceLandedEventTopics,
} from 'src/common/contracts/RandomizeByRarityContract';
import { IWeb3Service } from 'src/common/web3/web3.service.interface';
import { Promise } from 'bluebird';
import {
  createTxData,
  toBufferFromString,
  toNumber,
} from 'src/common/ethereum_util/ethereum.util';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import BigNumber from 'bignumber.js';
import {
  getOpenBoxContractAddress,
  updateNFT,
  UPDATE_NFT_NUMBER_GAS_LIMIT,
} from 'src/common/contracts/OpenBoxContract';
import {
  EthereumAccountRole,
  EthereumAccountsService,
} from 'src/common/ethereum_accounts/ethereum_accounts.service';
import { randomizeByRarityToOpenBoxPool } from 'src/common/contracts/utils/pool_mapping';

const MAXIMUM_SCANNING_BLOCKS = 40;

export class PolygonLogsWatcherService {
  constructor(
    private readonly configService: ConfigService,

    @Inject('PolygonWeb3Service')
    private readonly polygonWeb3Service: IWeb3Service,
    @Inject('BscWeb3Service')
    private readonly bscWeb3Service: IWeb3Service,
    @Inject('EthereumAccountsService')
    private readonly ethereumAccountsService: EthereumAccountsService,
  ) {}

  private readonly logger = new Logger(PolygonLogsWatcherService.name);

  async getAllLogs(fromBlock: number) {
    await this.getLogs(fromBlock).catch((e) => {
      this.logger.error(`CRASH polygon watcher: ${e}`);
      throw e;
    });
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

    //watch NftAuctionContract logs
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

    let gasPrice;
    if (diceLandedLogs.length > 0) {
      // TODO: consider use separate transaction creator for optimizing send tx.
      gasPrice = await this.bscWeb3Service.getGasPrice();
      this.logger.log(`gasPrice: 0x${gasPrice.toString(16)}`);
    }

    await Promise.map(
      diceLandedLogs,
      ({ transactionHash, data }) => {
        const dataBuffer = toBufferFromString(data);
        const poolId = toNumber(dataBuffer.slice(0, 32));

        const itemId = toNumber(dataBuffer.slice(32, 64));

        const result = toNumber(dataBuffer.slice(64, 96));

        return {
          transactionHash,
          poolId,
          itemId,
          result,
          gasPrice,
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
    gasPrice,
  }: {
    transactionHash: string;
    poolId: number;
    itemId: number;
    result: number;
    gasPrice: BigNumber;
  }): Promise<boolean> {
    const openBoxPoolId = randomizeByRarityToOpenBoxPool(poolId);

    const basePath = this.configService.get('nftMetadata.path');
    const poolDirectoryPath = `${basePath}/${openBoxPoolId}`;
    const filePath = `${poolDirectoryPath}/${itemId}.json`;

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
        poolId: openBoxPoolId,
        itemId,
        rarity: result,
      });

      await writeFile(filePath, json, 'utf-8');

      // TODO: handle send back request to OpenBox contract.
      const bscNetworkId = this.configService.get('bsc.networkId');
      const txData = createTxData({
        to: getOpenBoxContractAddress(bscNetworkId),
        gasLimit: UPDATE_NFT_NUMBER_GAS_LIMIT,
        gasPrice,
        value: new BigNumber(0),
        data: updateNFT(bscNetworkId, openBoxPoolId, itemId, result),
        nonce: await this.ethereumAccountsService.getNonce(
          EthereumAccountRole.signer,
          this.bscWeb3Service,
        ),
      });
      this.logger.log(`txData: ${JSON.stringify(txData)}`);

      const signedTx = this.bscWeb3Service.sign(
        txData,
        this.ethereumAccountsService.getPrivateKey(EthereumAccountRole.signer),
      );
      this.logger.log(`signedTx: ${signedTx}`);

      // send tx
      const hash = await this.bscWeb3Service.send(signedTx);
      this.logger.log(
        `updateNFT(poolId=${openBoxPoolId}, tokenId=${itemId}) txHash: ${hash}`,
      );

      return true;
    } catch (e) {
      this.logger.error(`handleDiceLandedLogData error: ${e}`);
    }
  }
}
