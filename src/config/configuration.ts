export default () => ({
  url: process.env.URL,

  blockchain: {
    url: process.env.BLOCKCHAIN_URL,
    networkId: process.env.BLOCKCHAIN_NETWORK_ID,
    chainId: process.env.BLOCKCHAIN_CHAIN_ID,
    scanStartBlock: process.env.BLOCKCHAIN_SCAN_START_BLOCK,
    confirmationBlocks: process.env.BLOCKCHAIN_CONFIRMATION_BLOCKS,
  },
});
