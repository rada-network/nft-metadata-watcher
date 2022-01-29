import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import BigNumber from 'bignumber.js';
import { Promise } from 'bluebird';
import { TransactionInterface } from 'src/common/transaction/transaction.interface';
import { IWeb3Service } from 'src/common/web3/web3.service.interface';
import {
  BaseTransactionRequest,
  TransactionRequestStatus,
} from '../transaction_requests/base_transaction_request.model';
import {
  TransactionRequestType,
  TransactionRequestService,
} from '../transaction_requests/transaction_request.service';

// CONSIDER: apply factory design pattern.
// TODO: clean code (redundant codes)
@Injectable()
export class TransactionCreatorService {
  constructor(
    private readonly configService: ConfigService,
    private readonly transactionRequestService: TransactionRequestService,

    @Inject('TransactionInterface')
    private readonly transaction: TransactionInterface,
    @Inject('BscWeb3Service')
    private readonly bscWeb3Service: IWeb3Service,
    @Inject('PolygonWeb3Service')
    private readonly polygonWeb3Service: IWeb3Service,
  ) {}

  private readonly logger = new Logger(TransactionCreatorService.name);

  async createAllTransactions<Type extends BaseTransactionRequest>(
    type: TransactionRequestType,
  ) {
    try {
      while (true) {
        await this.createTransactions<Type>(type);
      }
    } catch (e) {
      this.logger.error(`CRASH ${type} transaction creator: ${e}`);
      throw e;
    }
  }

  async createTransactions<Type extends BaseTransactionRequest>(
    type: TransactionRequestType,
  ): Promise<boolean> {
    await new Promise((res): void => {
      setTimeout(() => {
        res(() => `sleeped`);
      }, this.configService.get('transactionCreator.sleepTime'));
    });

    const pendingTransactionRequests =
      await this.transactionRequestService.getPendingTransactionRequests<Type>(
        type,
      );

    if (pendingTransactionRequests.length === 0) {
      return true;
    }

    const web3Service = this.getWeb3Service(type);
    const basePendingNonce = await web3Service.getTransactionCount(
      web3Service.getAddress(),
      true,
    );
    const baseNonce = await web3Service.getTransactionCount(
      web3Service.getAddress(),
    );

    this.logger.log(`Base Pending nonce: ${basePendingNonce}`);
    this.logger.log(`Base nonce: ${baseNonce}`);

    if (
      basePendingNonce - baseNonce >
      this.configService.get('transactionCreator.maxAllowedPendingTransactions')
    ) {
      this.logger.log(
        `Pending transactions count: ${basePendingNonce - baseNonce}`,
      );
      return true;
    }

    const gasPrice = await web3Service.getGasPriceWithScale();
    this.logger.log(`gasPrice: 0x${gasPrice.toString(16)}`);

    await Promise.map(
      pendingTransactionRequests,
      (transactionRequest, index) => {
        return {
          type,
          transactionRequest,
          nonce: basePendingNonce + index,
          gasPrice,
          web3Service,
        };
      },
    ).map(this.handleSingleTransactionRequest.bind(this), { concurrency: 1 });

    return true;
  }

  async handleSingleTransactionRequest<Type extends BaseTransactionRequest>({
    type,
    transactionRequest,
    nonce,
    gasPrice,
    web3Service,
  }: {
    type: TransactionRequestType;
    transactionRequest: Type;
    nonce: number;
    gasPrice: BigNumber;
    web3Service: IWeb3Service;
  }): Promise<boolean> {
    const queryRunner = await this.transaction
      .startTransaction()
      .catch(async (e) => {
        this.logger.error(`Failed to start transaction. ${e}`);
        throw new Error('Failed to handleOpenBoxLogData.');
      });

    try {
      const lockedRequest =
        await this.transactionRequestService.getPendingTransactionRequestByIdWithLock<Type>(
          type,
          queryRunner,
          transactionRequest.id,
        );
      if (!lockedRequest) {
        throw new Error(
          `${type}: Request - id=${transactionRequest.id} - not found.`,
        );
      }
      lockedRequest.nonce = nonce;
      lockedRequest.gasPrice = gasPrice;
      lockedRequest.attempt = lockedRequest.attempt + 1;

      const txData = lockedRequest.getTxData();
      const signedTx = web3Service.sign(txData, web3Service.getPrivateKey());

      // send tx
      const hash = await web3Service.send(signedTx, (err: Error) =>
        this.handleOnErrorCallback(type, transactionRequest, err),
      );
      lockedRequest.status = TransactionRequestStatus.success;
      lockedRequest.hash = hash;
      this.logger.log(
        `${type}: Request was sent to blockchain, listening error event 
        - id=${lockedRequest.id},attempt=${lockedRequest.attempt}, nonce=${nonce} txHash=${hash}`,
      );

      await queryRunner.manager.save(lockedRequest, { reload: false });
      await this.transaction.commit(queryRunner);

      return true;
    } catch (e) {
      await this.transaction.rollback(queryRunner);
      this.logger.error(
        `handleSingleTransactionRequest ${type} 
        - id=${transactionRequest.id} -  error: ${e}`,
      );
    }
  }

  private async handleOnErrorCallback<Type extends BaseTransactionRequest>(
    type: TransactionRequestType,
    transactionRequest: Type,
    err: Error,
  ): Promise<boolean> {
    const queryRunner = await this.transaction
      .startTransaction()
      .catch(async (e) => {
        this.logger.error(`Failed to start transaction. ${e}`);
        throw new Error('Failed to handleOpenBoxLogData.');
      });

    try {
      const lockedRequest =
        await this.transactionRequestService.getTransactionRequestByIdWithLock<Type>(
          type,
          queryRunner,
          transactionRequest.id,
        );
      if (!lockedRequest) {
        throw new Error(
          `${type}: Request - id=${transactionRequest.id} - not found.`,
        );
      }

      this.logger.warn(
        `${type}: request
          - id=${lockedRequest.id},attempt=${lockedRequest.attempt},hash=${
          lockedRequest.hash
        } -
          failed. Reason: ${err.message.slice(0, 50)}...`,
      );

      lockedRequest.status = TransactionRequestStatus.failed;
      await queryRunner.manager.save(lockedRequest, { reload: false });
      await this.transaction.commit(queryRunner);

      return true;
    } catch (e) {
      await this.transaction.rollback(queryRunner);
      this.logger.error(
        `handleOnErrorCallback ${type} 
        - id=${transactionRequest.id} -  error: ${e}`,
      );
    }
  }

  private getWeb3Service(type: TransactionRequestType): IWeb3Service {
    switch (type) {
      case TransactionRequestType.bsc:
        return this.bscWeb3Service;
      case TransactionRequestType.polygon:
        return this.polygonWeb3Service;
      default:
        throw new Error('getWeb3Service Type mismatch.');
    }
  }
}
