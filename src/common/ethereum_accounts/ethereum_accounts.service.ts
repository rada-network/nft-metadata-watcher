import { readFileSync } from 'fs';
import { Logger, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toBufferFromString } from '../ethereum_util/ethereum.util';
import { IWeb3Service } from '../web3/web3.service.interface';

export enum EthereumAccountRole {
  signer = 'signer',
}

type EthereumAccounts = {
  [EthereumAccountRole.signer]: {
    privateKey?: Buffer;
    address?: string;
    nonce?: number;
  };
};

@Injectable()
export class EthereumAccountsService {
  constructor(private readonly configService: ConfigService) {}

  private readonly logger = new Logger(EthereumAccountsService.name);

  private accounts: EthereumAccounts = { signer: {} };

  async initNonce(web3Service: IWeb3Service) {
    this.accounts[EthereumAccountRole.signer].nonce =
      await web3Service.getTransactionCount(
        this.getAddress(EthereumAccountRole.signer),
      );
  }

  getPrivateKey(role: EthereumAccountRole): Buffer {
    return toBufferFromString(
      `0x${this.configService.get('ethereum_accounts.privateKey')}`,
    );
  }

  getAddress(role: EthereumAccountRole): string {
    return this.configService.get('ethereum_accounts.address');
  }

  getNonce(role: EthereumAccountRole): number {
    const nonce = this.accounts[role].nonce;
    if (!nonce) {
      new Error('Need to init ethereum accounts');
    }

    this.accounts[role].nonce = nonce + 1;
    return nonce;
  }
}
