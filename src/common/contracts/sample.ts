import { networks } from '../../contracts/Sample.json';

export const getOpenBoxEventTopics = (networkId: string) => {
  const { events } = networks[networkId];
  return Object.keys(events).filter((key) => events[key].name === 'Settled');
};

export const getAddress = (networkId: string): string =>
  networks[networkId].address.toLowerCase();
