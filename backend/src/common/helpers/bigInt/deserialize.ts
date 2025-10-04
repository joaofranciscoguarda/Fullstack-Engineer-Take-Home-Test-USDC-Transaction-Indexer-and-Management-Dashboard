import { BigIntPrefix } from './sereal';

const findAndReplace = (
  cacheRef: any,
  {
    find,
    replace,
  }: {
    find: (item: any) => boolean;
    replace: (item: any) => any;
  },
): any => {
  if (cacheRef && find(cacheRef)) {
    return replace(cacheRef);
  }
  if (typeof cacheRef !== 'object') {
    return cacheRef;
  }
  if (Array.isArray(cacheRef)) {
    return cacheRef.map((item) => findAndReplace(item, { find, replace }));
  }
  if (cacheRef instanceof Object) {
    return Object.entries(cacheRef).reduce(
      (curr, [key, value]) => ({
        ...curr,
        [key]: findAndReplace(value, { find, replace }),
      }),
      {},
    );
  }
  return cacheRef;
};

export function deserialize(cachedString: string) {
  const deserializedCacheWithBigInts = findAndReplace(cachedString, {
    find: (data) => typeof data === 'string' && data.startsWith(BigIntPrefix),
    replace: (data) => BigInt(data.replace(BigIntPrefix, '')),
  });

  return deserializedCacheWithBigInts;
}
