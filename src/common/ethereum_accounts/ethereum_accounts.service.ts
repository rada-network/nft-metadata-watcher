import { readFileSync } from 'fs';
import { Logger, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toBufferFromString } from '../ethereum_util/ethereum.util';

export enum EthereumAccountRole {
  signer = 'signer',
}

type EthereumAccounts = {
  signer: {
    privateKey?: Buffer;
    address?: string;
  };
};

@Injectable()
export class EthereumAccountsService {
  constructor(private readonly configService: ConfigService) {}

  private readonly logger = new Logger(EthereumAccountsService.name);

  private accounts: EthereumAccounts = { signer: {} };

  getPrivateKey(role: EthereumAccountRole): Buffer {
    const accountPrivateKey = this.accounts[role]?.privateKey;
    if (accountPrivateKey) {
      return accountPrivateKey;
    }
    // TODO: encrypt/secure privateKey
    const privateKeyBuffer = readFileSync(
      `${this.configService.get('ethereum_accounts.path')}/${role}/privateKey`,
    );

    this.accounts[role].privateKey = toBufferFromString(
      `0x${privateKeyBuffer.toString('utf-8')}`,
    );

    return this.accounts[role].privateKey;
  }

  getAddress(role: EthereumAccountRole): string {
    const accountAddress = this.accounts[role]?.address;
    if (accountAddress) {
      return accountAddress;
    }

    const addressBuffer = readFileSync(
      `${this.configService.get('ethereum_accounts.path')}/${role}/address`,
    );

    this.accounts[role].address = addressBuffer.toString('utf-8');
    return this.accounts[role].address;
  }
}
