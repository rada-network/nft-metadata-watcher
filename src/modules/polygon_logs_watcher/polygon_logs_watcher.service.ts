import { TxData } from '@ethereumjs/tx';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getRadomizeByRarityContractAddress,
  getDiceLandedEventTopics,
} from 'src/common/contracts/RadomizeByRarityContract';
import { IWeb3Service } from 'src/common/web3/web3.service.interface';
import { Promise } from 'bluebird';
import {
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
    const logs = await this.polygonWeb3Service.getPastLogs({
      fromBlock,
      toBlock,
      address: getRadomizeByRarityContractAddress(networkId),
    });
    this.logger.log(
      `scanned watchRadomizeByRarityContract logs: ${JSON.stringify(logs)}`,
    );

    const diceLandedTopics = getDiceLandedEventTopics(networkId);
    const diceLandedLogs = logs.filter(({ topics }) =>
      diceLandedTopics.includes(topics[0]),
    );
    this.logger.log(
      `scanned diceLanded event logs: ${JSON.stringify(diceLandedLogs)}`,
    );

    let nonce;
    let gasPrice;
    if (diceLandedLogs.length > 0) {
      // TODO: optimize get nonce get getPrice
      // TODO: consider use separate transaction creator for optimizing send tx.
      nonce = await this.bscWeb3Service.getTransactionCount(
        this.ethereumAccountsService.getAddress(EthereumAccountRole.signer),
      );
      this.logger.log(`nonce: ${nonce}`);

      gasPrice = await this.bscWeb3Service.getGasPrice();
      this.logger.log(`gasPrice: 0x${gasPrice.toString(16)}`);
    }

    await Promise.map(
      diceLandedLogs,
      ({ transactionHash, data }, index) => {
        const dataBuffer = toBufferFromString(data);
        const poolId = toNumber(dataBuffer.slice(0, 32));

        const itemId = toNumber(dataBuffer.slice(32, 64));

        const result = toNumber(dataBuffer.slice(64, 96));

        return {
          transactionHash,
          poolId,
          itemId,
          result,
          nonce: nonce + index,
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
    nonce,
    gasPrice,
  }: {
    transactionHash: string;
    poolId: number;
    itemId: number;
    result: number;
    nonce: number;
    gasPrice: BigNumber;
  }): Promise<boolean> {
    const basePath = this.configService.get('nftMetadata.path');
    const poolDirectoryPath = `${basePath}/${poolId}`;
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
        poolId,
        itemId,
        rarity: result,
      });

      await writeFile(filePath, json, 'utf-8');

      // TODO: handle send back request to OpenBox contract.
      const bscNetworkId = this.configService.get('bsc.networkId');
      const txData = this.createTxData({
        to: getOpenBoxContractAddress(bscNetworkId),
        gasLimit: UPDATE_NFT_NUMBER_GAS_LIMIT,
        gasPrice,
        value: new BigNumber(0),
        data: updateNFT(bscNetworkId, poolId, itemId, result),
        nonce,
      });
      this.logger.log(`txData: ${JSON.stringify(txData)}`);
      return true;
    } catch (e) {
      this.logger.error(`handleDiceLandedLogData error: ${e}`);
    }
  }

  private createTxData(obj: {
    to: string;
    gasLimit: string;
    gasPrice: BigNumber;
    value: BigNumber;
    data: string;
    nonce: number;
  }): TxData {
    return {
      to: obj.to,
      gasLimit: `0x${new BigNumber(obj.gasLimit).toString(16)}`,
      gasPrice: `0x${new BigNumber(obj.gasPrice).toString(16)}`,
      value: `0x${new BigNumber(obj.value).toString(16)}`,
      data: obj.data,
      nonce: `0x${new BigNumber(obj.nonce).toString(16)}`,
    };
  }
}
