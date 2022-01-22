import { AbiItem } from 'web3-utils';
import Contract from 'web3-eth-contract';
import { abi, networks } from '../../contracts/RandomizeByRarityContract.json';

let contractAddress: string | null = null;

console.log('Contract Address: ', contractAddress);
// TODO: optimize gas
export const REQUEST_RANDOM_NUMBER_GAS_LIMIT = '210000';

export const getDiceLandedEventTopics = (networkId: string) => {
  const { events } = networks[networkId];
  return Object.keys(events).filter((key) => events[key].name === 'DiceLanded');
};

export const getRandomizeByRarityContractAddress = (
  networkId: string,
): string => {
  if (!contractAddress) {
    contractAddress =
      process.env.RANDOMIZE_BY_RARITY_CONTRACT_ADDRESS.toLowerCase();
  }
  return contractAddress;
};

export const requestRandomNumber = (
  networkId: string,
  poolId: number,
  tokenId: number,
): string => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const contract = new Contract(
    abi as AbiItem[],
    getRandomizeByRarityContractAddress(networkId),
  );

  return contract.methods.requestRandomNumber(poolId, tokenId).encodeABI();
};
