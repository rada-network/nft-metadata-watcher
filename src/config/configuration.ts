export default () => ({
  env: {
    nodeEnv: process.env.NODE_ENV,
  },
  polygon: {
    url: process.env.POLYGON_URL,
    networkId: process.env.POLYGON_NETWORK_ID,
    chainId: process.env.POLYGON_CHAIN_ID,
    scanStartBlock: process.env.POLYGON_SCAN_START_BLOCK,
    scanFromBackLatestBlock: process.env.POLYGON_SCAN_FROM_BACK_LATEST_BLOCK,
    delayConfirmedBlocks: process.env.POLYGON_DELAY_CONFIRMED_BLOCKS,
    sleepTime: process.env.POLYGON_SLEEP_TIME,
    useEip1559: process.env.POLYGON_USE_EIP_1559,
    gasLimit: process.env.POLYGON_GAS_LIMIT,
    gasPriceScale: process.env.POLYGON_GAS_PRICE_SCALE,
    accountAddress: process.env.POLYGON_ACCOUNT_ADDRESS,
    accountPrivateKey: process.env.POLYGON_ACCOUNT_PRIVATE_KEY,
  },
  bsc: {
    url: process.env.BSC_URL,
    networkId: process.env.BSC_CHAIN_ID,
    chainId: process.env.BSC_NETWORK_ID,
    scanStartBlock: process.env.BSC_SCAN_START_BLOCK,
    scanFromBackLatestBlock: process.env.BSC_SCAN_FROM_BACK_LATEST_BLOCK,
    delayConfirmedBlocks: process.env.BSC_DELAY_CONFIRMED_BLOCKS,
    sleepTime: process.env.BSC_SLEEP_TIME,
    useEip1559: process.env.BSC_USE_EIP_1559,
    gasLimit: process.env.BSC_GAS_LIMIT,
    gasPriceScale: process.env.BSC_GAS_PRICE_SCALE,
    accountAddress: process.env.BSC_ACCOUNT_ADDRESS,
    accountPrivateKey: process.env.BSC_ACCOUNT_PRIVATE_KEY,
  },
  contract: {
    openBoxContractAddress: process.env.OPEN_BOX_CONTRACT_ADDRESS,
    randomizeByRarityContractAddress:
      process.env.RANDOMIZE_BY_RARITY_CONTRACT_ADDRESS,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
  transactionCreator: {
    sleepTime: process.env.TRANSACTION_CREATOR_SLEEP_TIME,
    maxAllowedPendingTransactions:
      process.env.TRANSACTION_CREATOR_MAX_ALLOWED_PENDING_TRANSACTIONS,
    getPendingRequestsLimit:
      process.env.TRANSACTION_CREATOR_GET_PENDING_REQUESTS_LIMIT,
  },
  s3: {
    url: process.env.S3_URL,
    internalUrl: process.env.S3_INTERNAL_URL,
    region: process.env.S3_REGION,
    contentsBucket: process.env.S3_CONTENTS_BUCKET,
    contentsBucketEndpoint: process.env.S3_CONTENTS_BUCKET_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE,
    accountKey: process.env.S3_ACCOUNT_KEY,
    accountSecret: process.env.S3_ACCOUNT_SECRET,
  },
  nftMetadata: {
    rarityBaseUrl: process.env.NFT_METADATA_RARITY_BASE_URL,
  },
});
