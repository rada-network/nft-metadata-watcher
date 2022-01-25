import { AbiItem } from 'web3-utils';
import Contract from 'web3-eth-contract';
import { abi, networks } from '../../contracts/OpenBoxContract.json';

let contractAddress: string | null = null;

// TODO: optimize gas
export const UPDATE_NFT_NUMBER_GAS_LIMIT = '400000';

export const getOpenBoxEventTopics = (networkId: string) => {
  const { events } = networks[networkId];
  return Object.keys(events).filter((key) => events[key].name === 'OpenBox');
};

export const getOpenBoxContractAddress = (networkId: string): string => {
  if (!contractAddress) {
    contractAddress = process.env.OPEN_BOX_CONTRACT_ADDRESS.toLowerCase();
  }
  return contractAddress;
};

export const updateNFT = (
  networkId: string,
  poolId: number,
  tokenId: number,
  rarity: number,
): string => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const contract = new Contract(
    abi as AbiItem[],
    getOpenBoxContractAddress(networkId),
  );

  return contract.methods.updateNFT(poolId, tokenId, rarity).encodeABI();
};
