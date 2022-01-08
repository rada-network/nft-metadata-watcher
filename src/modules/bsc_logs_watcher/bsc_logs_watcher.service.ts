import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IWeb3Service } from 'src/common/web3/web3.service.interface';
import { Promise } from 'bluebird';
import {
  toAddressString,
  toBufferFromString,
  toNumber,
} from 'src/common/ethereum_util/ethereum.util';
import {
  EthereumAccountRole,
  EthereumAccountsService,
} from 'src/common/ethereum_accounts/ethereum_accounts.service';
import {
  getOpenBoxContractAddress,
  getOpenBoxEventTopics,
} from 'src/common/contracts/OpenBoxContract';
import {
  getRandomizeByRarityContractAddress,
  requestRandomNumber,
  REQUEST_RANDOM_NUMBER_GAS_LIMIT,
} from 'src/common/contracts/RandomizeByRarityContract';
import BigNumber from 'bignumber.js';
import { TransactionInterface } from 'src/common/transaction/transaction.interface';
import { OpenBoxService } from '../open_box/open_box.service';
import {
  TransactionRequestRepository,
  TransactionRequestService,
} from '../transaction_requests/transaction_request.service';
import { WarningError } from 'src/common/errors/warning_error';
import { PolygonTransactionRequest } from '../transaction_requests/polygon_transaction_request.model';

const MAXIMUM_SCANNING_BLOCKS = 40;

export class BscLogsWatcherService {
  constructor(
    private readonly configService: ConfigService,
    private readonly openBoxService: OpenBoxService,
    private readonly transactionRequestService: TransactionRequestService,

    @Inject('TransactionInterface')
    private readonly transaction: TransactionInterface,
    @Inject('BscWeb3Service')
    private readonly bscWeb3Service: IWeb3Service,
    @Inject('PolygonWeb3Service')
    private readonly polygonWeb3Service: IWeb3Service,
    @Inject('EthereumAccountsService')
    private readonly ethereumAccountsService: EthereumAccountsService,
  ) {}

  private readonly logger = new Logger(BscLogsWatcherService.name);

  async getAllLogs() {
    try {
      let startBlock: number;
      const startBlockStr = this.configService.get('bsc.scanStartBlock');
      if (startBlockStr) {
        startBlock = parseInt(startBlockStr, 10);
      } else {
        startBlock =
          (await this.bscWeb3Service.getBlockNumber()) -
          parseInt(this.configService.get('bsc.scanFromBackLatestBlock'), 10);
      }

      await this.getLogs(startBlock);
    } catch (e) {
      this.logger.error(`CRASH bsc watcher: ${e}`);
      throw e;
    }
  }

  private async getLogs(fromBlock: number): Promise<void> {
    // TODO: add ethereum maintaince to be able to pause this process.
    const confirmedBlockNumber =
      (await this.bscWeb3Service.getBlockNumber(true)) -
      parseInt(this.configService.get('bsc.delayConfirmedBlocks'), 10);

    if (confirmedBlockNumber < fromBlock) {
      this.logger.log('Sleep...zzz');

      await new Promise((res): void => {
        setTimeout(() => {
          res(() => `sleeped`);
        }, this.configService.get('bsc.sleepTime'));
      });
      return this.getLogs(fromBlock);
    }

    const toBlock = Math.min(
      confirmedBlockNumber,
      fromBlock + MAXIMUM_SCANNING_BLOCKS,
    );
    this.logger.log(`scan block from ${fromBlock} to ${toBlock}`);

    const networkId = this.configService.get('bsc.networkId');

    //watch OpenBoxContract logs
    const watchOpenBoxContractLogsResult = this.watchOpenBoxContractLogs(
      fromBlock,
      toBlock,
      networkId,
    );

    await Promise.all([watchOpenBoxContractLogsResult]);

    return this.getLogs(toBlock + 1);
  }

  private async watchOpenBoxContractLogs(
    fromBlock: number,
    toBlock: number,
    networkId: string,
  ) {
    // contract logs
    const logs = await this.bscWeb3Service.getPastLogs({
      fromBlock,
      toBlock,
      address: getOpenBoxContractAddress(networkId),
    });
    this.logger.log(`scanned OpenBoxContract logs: ${JSON.stringify(logs)}`);

    const openBoxTopics = getOpenBoxEventTopics(networkId);
    const openBoxLogs = logs.filter(({ topics }) =>
      openBoxTopics.includes(topics[0]),
    );
    this.logger.log(
      `scanned OpenBox event logs: ${JSON.stringify(openBoxLogs)}`,
    );

    let gasPrice;
    if (openBoxLogs.length > 0) {
      // TODO: consider use separate transaction creator for optimizing send tx.
      gasPrice = await this.polygonWeb3Service.getGasPrice();
      this.logger.log(`gasPrice: 0x${gasPrice.toString(16)}`);
    }

    await Promise.map(
      openBoxLogs,
      ({ transactionHash, topics, data }) => {
        const poolId = toNumber(toBufferFromString(topics[1]));
        const tokenId = toNumber(toBufferFromString(topics[2]));
        const dataBuffer = toBufferFromString(data);
        const buyerAddress = toAddressString(dataBuffer.slice(0, 32));

        return {
          transactionHash,
          buyerAddress,
          poolId,
          tokenId,
          gasPrice,
        };
      },
      { concurrency: 3 },
    ).map(this.handleOpenBoxLogData.bind(this));

    // TODO: add warning except log.
  }

  private async handleOpenBoxLogData({
    transactionHash,
    buyerAddress,
    poolId,
    tokenId,
    gasPrice,
  }: {
    transactionHash: string;
    buyerAddress: string;
    poolId: number;
    tokenId: number;
    gasPrice: BigNumber;
  }): Promise<boolean> {
    const queryRunner = await this.transaction
      .startTransaction()
      .catch(async (e) => {
        this.logger.error(`Failed to start transaction. ${e}`);
        throw new Error('Failed to handleOpenBoxLogData.');
      });

    try {
      const openBox = await this.openBoxService.getOpenBoxByPoolIdTokenId(
        poolId,
        tokenId,
      );

      if (openBox) {
        throw new WarningError(
          `Hanlded this OpenBox event - poolId=${poolId} tokenId=${tokenId} 
          transactionHash=${transactionHash}`,
        );
      }
      const polygonNetworkId = this.configService.get('polygon.networkId');
      const transactionRequest =
        await this.transactionRequestService.createTransactionRequest<PolygonTransactionRequest>(
          TransactionRequestRepository.polygon,
          queryRunner,
          {
            to: getRandomizeByRarityContractAddress(polygonNetworkId),
            gasLimit: REQUEST_RANDOM_NUMBER_GAS_LIMIT,
            gasPrice,
            value: new BigNumber(0),
            data: requestRandomNumber(polygonNetworkId, poolId, tokenId),
            nonce: this.ethereumAccountsService.getNonce(
              EthereumAccountRole.signer,
            ),
          },
        );
      await this.openBoxService.createOpenBox(
        queryRunner,
        {
          openBoxEventTransactionHash: transactionHash,
          poolId,
          tokenId,
          randomTransactionRequest: transactionRequest,
        },
        false,
      );

      await this.transaction.commit(queryRunner);
      return true;
    } catch (e) {
      await this.transaction.rollback(queryRunner);
      if (e instanceof WarningError) {
        this.logger.warn(`handleOpenBoxLogData warning: ${e}`);
      } else {
        this.logger.error(`handleOpenBoxLogData error: ${e}`);
      }
    }
  }
}
