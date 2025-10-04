import { serialize } from '.';

/**
 * Recursively serializes all BigInts in an object.
 * @param obj The object to serialize.
 * @returns The serialized object.
 */
export function serializeBigInts<T extends object>(obj: T): T {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      if (typeof value === 'bigint') {
        obj[key] = serialize(value) as T[typeof key];
      } else if (typeof value === 'object' && value !== null) {
        obj[key] = serializeBigInts(value);
      }
    }
  }
  return obj;
}
