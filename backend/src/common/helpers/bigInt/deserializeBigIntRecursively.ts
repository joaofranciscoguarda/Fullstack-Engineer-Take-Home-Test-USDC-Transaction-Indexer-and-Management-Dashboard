import { BigIntPrefix, deserialize } from '.';

/**
 * Recursively deserializes all BigInts in an object.
 * @param obj The object to serialize.
 * @returns The serialized object.
 */
export function deserializeBigInts<T extends object>(obj: T): T {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      if (typeof value === 'string' && value.startsWith(BigIntPrefix)) {
        obj[key] = deserialize(value) as T[typeof key];
      } else if (typeof value === 'object' && value !== null) {
        obj[key] = deserializeBigInts(value);
      }
    }
  }
  return obj;
}
