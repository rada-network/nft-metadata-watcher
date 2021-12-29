export default () => ({
  blockchain: {
    url: process.env.BLOCKCHAIN_URL,
    networkId: process.env.BLOCKCHAIN_NETWORK_ID,
    chainId: process.env.BLOCKCHAIN_CHAIN_ID,
    scanStartBlock: process.env.BLOCKCHAIN_SCAN_START_BLOCK,
    delayConfirmedBlocks: process.env.BLOCKCHAIN_DELAY_CONFIRMED_BLOCKS,
    sleepTime: process.env.BLOCKCHAIN_SLEEP_TIME,
  },
});
