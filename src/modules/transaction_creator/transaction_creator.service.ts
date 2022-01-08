import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Promise } from 'bluebird';
import {
  EthereumAccountRole,
  EthereumAccountsService,
} from 'src/common/ethereum_accounts/ethereum_accounts.service';
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
    @Inject('EthereumAccountsService')
    private readonly ethereumAccountsService: EthereumAccountsService,
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
    const pendingTransactionRequests =
      await this.transactionRequestService.getPendingTransactionRequests<Type>(
        type,
      );

    if (pendingTransactionRequests.length === 0) {
      await new Promise((res): void => {
        setTimeout(() => {
          res(() => `sleeped`);
        }, this.configService.get('transactionCreator.sleepTime'));
      });

      return true;
    }

    const web3Service = this.getWeb3Service(type);
    const baseNonce = await web3Service.getTransactionCount(
      this.ethereumAccountsService.getAddress(EthereumAccountRole.signer),
    );

    await Promise.map(
      pendingTransactionRequests,
      (transactionRequest, index) => {
        return {
          type,
          transactionRequest,
          nonce: baseNonce + index,
          web3Service,
        };
      },
    ).map(this.handleSingleTransactionRequest.bind(this), { concurrency: 3 });

    return true;
  }

  async handleSingleTransactionRequest<Type extends BaseTransactionRequest>(
    type: TransactionRequestType,
    transactionRequest: Type,
    nonce: number,
    web3Service: IWeb3Service,
  ): Promise<boolean> {
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
      lockedRequest.attempt = lockedRequest.attempt + 1;

      const txData = lockedRequest.getTxData();
      this.logger.log(`${type}: Request txData: ${JSON.stringify(txData)}`);

      const signedTx = web3Service.sign(
        txData,
        this.ethereumAccountsService.getPrivateKey(EthereumAccountRole.signer),
      );
      this.logger.log(`${type}: Request signedTx: ${signedTx}`);

      // send tx
      const { hash, err } = await web3Service.sendPromiEvent(signedTx);
      if (err) {
        this.logger.warn(
          `${type}: request 
          - id=${lockedRequest.id},attempt=${lockedRequest.attempt},hash=${hash} - 
          failed. Reason: ${err}`,
        );

        lockedRequest.status = TransactionRequestStatus.failed;
        lockedRequest.hash = hash;
        await queryRunner.manager.save(lockedRequest, { reload: false });
        await this.transaction.commit(queryRunner);

        return true;
      }

      lockedRequest.status = TransactionRequestStatus.success;
      lockedRequest.hash = hash;
      this.logger.log(
        `${type}: Request was confirmed on blockchain - id=${lockedRequest.id},txHash=${hash}`,
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
