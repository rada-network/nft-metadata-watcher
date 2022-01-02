import {
  setLengthLeft,
  toBuffer,
  keccak256,
  ecsign,
  bufferToHex,
  bufferToInt,
  unpadBuffer,
} from 'ethereumjs-util';

export const toBufferFromString = (val: string) => toBuffer(val);

export const toAddressString = (val: Buffer): string =>
  bufferToHex(val.slice(-20)).toLowerCase();

export const toNumber = (val: Buffer): number => bufferToInt(val);

export const toNumberString = (val: Buffer): string => {
  const ret = bufferToHex(unpadBuffer(val));
  if (ret === '0x') return '0';
  return ret;
};

export const toBytes32 = (val: number | string): Buffer =>
  setLengthLeft(toBuffer(val), 32);

export const toAddress = (val: string): Buffer =>
  setLengthLeft(toBuffer(val), 20);

export const toAdamTokenId = (val: string): string =>
  bufferToHex(toBufferFromString(val).slice(-16)).toLowerCase();

export const hash = (message: Buffer) => {
  return bufferToHex(keccak256(message));
};

export const sign = (msgHash: string, privateKey: Buffer) => {
  const { v, r, s } = ecsign(toBuffer(msgHash), privateKey);
  return { v, r: bufferToHex(r), s: bufferToHex(s) };
};
