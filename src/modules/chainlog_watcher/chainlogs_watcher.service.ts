import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAddress, getOpenBoxEventTopics } from 'src/common/contracts/sample';
import { IWeb3Service } from 'src/common/web3/web3.service.interface';

const MAXIMUM_SCANNING_BLOCKS = 40;

export class ChainlogsWatcherService {
  constructor(
    private readonly configService: ConfigService,

    @Inject('IWeb3Service')
    private readonly web3Service: IWeb3Service,
  ) {}

  private readonly logger = new Logger(ChainlogsWatcherService.name);

  async getAllLogs(fromBlock: number) {
    await this.getLogs(fromBlock).catch((e) => {
      this.logger.error(`CRASH watcher: ${e}`);
      throw e;
    });
  }

  private async getLogs(fromBlock: number): Promise<void> {
    // TODO: add ethereum maintaince to be able to pause this process.
    const confirmedBlockNumber =
      (await this.web3Service.getBlockNumber(true)) -
      parseInt(this.configService.get('blockchain.delayConfirmedBlocks'), 10);

    if (confirmedBlockNumber < fromBlock) {
      this.logger.log('Sleep...zzz');

      await new Promise((res): void => {
        setTimeout(() => {
          res(() => `sleeped`);
        }, this.configService.get('blockchain.sleepTime'));
      });
      return this.getLogs(fromBlock);
    }

    const toBlock = Math.min(
      confirmedBlockNumber,
      fromBlock + MAXIMUM_SCANNING_BLOCKS,
    );
    this.logger.log(`scan block from ${fromBlock} to ${toBlock}`);

    const networkId = this.configService.get('blockchain.networkId');

    //watch OpenBox logs
    const watchOpenBoxLogsResult = this.watchOpenBoxLogs(
      fromBlock,
      toBlock,
      networkId,
    );

    await Promise.all([watchOpenBoxLogsResult]);

    return this.getLogs(toBlock + 1);
  }

  private async watchOpenBoxLogs(
    fromBlock: number,
    toBlock: number,
    networkId: string,
  ) {
    // contracts logs
    const logs = await this.web3Service.getPastLogs({
      fromBlock,
      toBlock,
      address: getAddress(networkId),
    });
    this.logger.log(`scanned OpenBox logs: ${JSON.stringify(logs)}`);

    // TODO: match openBox contract log.
    const openBoxTopics = getOpenBoxEventTopics(networkId);
    const openBoxLogs = logs.filter(({ topics }) =>
      openBoxTopics.includes(topics[0]),
    );
    this.logger.log(`scanned OpenBox logs: ${JSON.stringify(openBoxLogs)}`);

    // TODO: handling scanned OpenBox logs data.
    // TODO: add warning except log.
  }
}
