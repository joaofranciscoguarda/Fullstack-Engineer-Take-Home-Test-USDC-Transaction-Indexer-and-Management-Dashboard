import { BigIntPrefix } from './sereal';

/**
 * @description Serialize a bigint to a string
 */
export function serialize(value_: bigint) {
  return `${BigIntPrefix}${value_.toString()}`;
}
