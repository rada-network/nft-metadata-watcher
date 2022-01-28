import { TxData } from '@ethereumjs/tx';
import { BigNumber } from 'bignumber.js';
import { Log, PastLogsOptions } from 'web3-core';
import { BlockTransactionString } from 'web3-eth';

export interface IWeb3Service {
  getTransactionCount(address: string, usePending?: boolean): Promise<number>;

  getGasPrice(): Promise<BigNumber>;

  /**
   * Returns the current block number with retry attemps.
   * @param isRetry
   * @returns
   */
  getBlockNumber(isRetry?: boolean): Promise<number>;

  sign(txData: TxData, privateKey: Buffer): string;

  send(
    signedTx: string,
    onErrorCallback?: (err: Error) => Promise<boolean>,
  ): Promise<string>;

  getPastLogs(params: PastLogsOptions): Promise<Log[]>;

  decodeParameters(inputs: any, data: any): any;

  getBlock(
    blockHashOrBlockNumber: string | number,
  ): Promise<BlockTransactionString>;

  call(
    callObject: { to: string; data: string },
    defaultBlock: number | string,
  ): Promise<string>;

  getAddress(): string;

  getPrivateKey(): Buffer;
}
