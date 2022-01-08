import BigNumber from 'bignumber.js';

export function getNotNaNBigNumber(value: string | null): BigNumber | null {
  if (!value) {
    return null;
  }
  const bn = new BigNumber(value);
  if (bn.isNaN()) {
    return null;
  }
  return bn;
}

export function getNotNaNString(value: BigNumber | null): string | null {
  if (!value) {
    return null;
  }
  return value.isNaN() ? null : value.toString();
}
