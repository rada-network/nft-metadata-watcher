import { networks } from '../../contracts/RadomizeByRarityContract.json';

export const getDiceLandedEventTopics = (networkId: string) => {
  const { events } = networks[networkId];
  return Object.keys(events).filter((key) => events[key].name === 'DiceLanded');
};

export const getAddress = (networkId: string): string =>
  networks[networkId].address.toLowerCase();
