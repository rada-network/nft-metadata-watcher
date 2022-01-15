# nft-metadata-watcher

![Rada Auction flow image](https://crustwebsites.net/ipfs/QmYWz9rMnYciiTHK719n8FFgMLVPEsmjPYa6DUu9RY9sHT?filename=rada-acution-flow.jpg)
![OpenBox Flow image](https://crustwebsites.net/ipfs/QmSM9ZHvHrnNNJLxJ13QDNh44GNehNB6FsEqKDpj5muY3x?filename=openbox-flow.jpg)

// TODO: add Dockerfile, kubernetes-deployment files.
// TODO: secure privateKey in /data directory
// TODO: fire error log to chat app for monitoring.
// TODO: optimize get nonce to speedup send transactions. (DONE optimization ver 1)
// TODO: check nonce conflict. (DONE use transaction creator to get nonce)

## Enviroment variable description:

ETHEREUM_ACCOUNTS_PATH

- Directory storing private key and address for signer.
- For example:
  - ./accounts/signer/privateKey - Storing account private key plain text.
  - ./accounts/signer/address -Storing account address plain text.

POLYGON_URL
POLYGON_CHAIN_ID
POLYGON_NETWORK_ID

- Polygon RPC and chain info.

POLYGON_SCAN_FROM_BACK_LATEST_BLOCK

- Start scan from (latest_block - back_block)

POLYGON_SCAN_START_BLOCK

- Set scan from block manually. If this env variable is not empty, it'll overide POLYGON_SCAN_FROM_BACK_LATEST_BLOCK flow.

POLYGON_DELAY_CONFIRMED_BLOCKS

- Scan to (latest_block - delay_block)

POLYGON_SLEEP_TIME

- When not finding newest block, sleep for miliseconds.

BSC_xxx env variables are similar to polygon counterparts.

## Contract ABI and event info

Look at src/contracts directory.

## Local:

```sh
yarn install

# Run in another terminal
docker-compose up

# Prepare account signer private key and address
# ./accounts/signer/privateKey - Storing account private key plain text.
# ./accounts/signer/address -Storing account address plain text.

# Set appropriate environments variables in .env.development file.

# Run polygon watcher
yarn start:polygon_logs_watcher:dev

# Open another terminal, run bsc watcher
yarn start:bsc_logs_watcher:dev

# Open another terminal, run transaction creator
yarn start:transaction_creator:dev
```

## Production:

```sh
yarn install

# Prepare account signer private key and address
# ./accounts/signer/privateKey - Storing account private key plain text.
# ./accounts/signer/address -Storing account address plain text.

# Build
yarn build

# Set appropriate environments variables in .env.production file.

# Run polygon watcher
yarn start:polygon_logs_watcher:prod

# Open another terminal, run bsc watcher
yarn start:bsc_logs_watcher:prod

# Open another terminal, run transaction creator
yarn start:transaction_creator:prod
```
