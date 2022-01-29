import Common from '@ethereumjs/common';
import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import BigNumber from 'bignumber.js';
import Web3 from 'web3';
import { toBufferFromString } from '../ethereum_util/ethereum.util';
import { Web3Service } from './web3.service';

@Injectable()
export class PolygonWeb3Service extends Web3Service {
  web3: Web3;
  common: Common;
  protected readonly logger = new Logger(PolygonWeb3Service.name);

  constructor(protected readonly configService: ConfigService) {
    super();
    // TODO: consider aws web3 provider for signature v4
    this.web3 = new Web3(configService.get('polygon.url'));

    const networkId = parseInt(configService.get('polygon.networkId'), 10);
    const chainId = parseInt(configService.get('polygon.chainId'), 10);
    const isUseEip1559 = this.configService.get('bsc.useEip1559') === 'true';
    if (chainId === 1) {
      this.common = new Common({ chain: 1 });
    } else {
      if (isUseEip1559) {
        this.common = Common.custom(
          {
            name: 'private',
            networkId,
            chainId,
          },
          { hardfork: 'london' },
        );
      } else {
        this.common = Common.custom({
          name: 'private',
          networkId,
          chainId,
        });
      }
    }

    if (isUseEip1559) {
      this.useEip1559 = true;
    }
  }

  getAddress(): string {
    return this.configService.get('polygon.accountAddress');
  }

  getPrivateKey(): Buffer {
    return toBufferFromString(
      `0x${this.configService.get('polygon.accountPrivateKey')}`,
    );
  }

  async getGasPriceWithScale(): Promise<BigNumber> {
    let gasPrice = await this.getGasPrice();
    gasPrice = gasPrice.times(this.configService.get('polygon.gasPriceScale'));

    const minGasPrice = new BigNumber(
      this.web3.utils
        .toWei(this.configService.get('polygon.minimumGasPriceGwei'), 'Gwei')
        .toString(),
    );

    if (gasPrice.isLessThan(minGasPrice)) {
      return minGasPrice;
    }

    return gasPrice;
  }
}
