import { ColumnOptions } from 'typeorm';
import {
  getNotNaNBigNumber,
  getNotNaNString,
} from '../scalars/unsigned_big_number.scalar';

export const rateColumnOptions: ColumnOptions = {
  type: 'decimal',
  precision: 36,
  scale: 20,
  transformer: {
    from: (v) => getNotNaNBigNumber(v),
    to: (v) => getNotNaNString(v),
  },
  nullable: true,
};

export const ethValueFeeColumnOptions: ColumnOptions = {
  type: 'decimal',
  precision: 36,
  scale: 0,
  transformer: {
    from: (v) => getNotNaNBigNumber(v),
    to: (v) => getNotNaNString(v),
  },
  nullable: true,
};
