export default () => ({
  polygon: {
    url: process.env.POLYGON_URL,
    networkId: process.env.POLYGON_NETWORK_ID,
    chainId: process.env.POLYGON_CHAIN_ID,
    scanStartBlock: process.env.POLYGON_SCAN_START_BLOCK,
    delayConfirmedBlocks: process.env.POLYGON_DELAY_CONFIRMED_BLOCKS,
    sleepTime: process.env.POLYGON_SLEEP_TIME,
  },
});
