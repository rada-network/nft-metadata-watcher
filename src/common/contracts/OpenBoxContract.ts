import { networks } from '../../contracts/OpenBoxContract.json';

export const getOpenBoxEventTopics = (networkId: string) => {
  const { events } = networks[networkId];
  return Object.keys(events).filter((key) => events[key].name === 'OpenBox');
};

export const getOpenBoxContractAddress = (networkId: string): string =>
  networks[networkId].address.toLowerCase();
