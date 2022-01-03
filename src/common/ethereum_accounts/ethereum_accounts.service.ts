import { readFileSync } from 'fs';
import { Logger, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toAddressString } from '../ethereum_util/ethereum.util';

const PRIVATE_KEY_STORED_PATH = '/data';

export enum EthereumAccountRole {
  signer = 'signer',
}

type EthereumAccounts = {
  signer: {
    privateKey?: Buffer;
    publicKey?: string;
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
      `${PRIVATE_KEY_STORED_PATH}/${role}/privateKey`,
    );

    this.accounts[role].privateKey = privateKeyBuffer;
    return this.accounts[role].privateKey;
  }

  getAddress(role: EthereumAccountRole): string {
    const accountAddress = this.accounts[role]?.publicKey;
    if (accountAddress) {
      return accountAddress;
    }

    const addressBuffer = readFileSync(
      `${PRIVATE_KEY_STORED_PATH}/${role}/publicKey`,
    );

    this.accounts[role].publicKey = toAddressString(addressBuffer);
    return this.accounts[role].publicKey;
  }
}
