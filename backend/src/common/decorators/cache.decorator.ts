import { SetMetadata } from '@nestjs/common';

export const CACHE_TTL_KEY = 'cache_ttl';
export const CACHE_KEY_PREFIX = 'cache_key_prefix';

/**
 * Decorator to cache method results
 * @param ttlSeconds Time to live in seconds (default: 300 = 5 minutes)
 * @param keyPrefix Custom key prefix for the cache (default: method name)
 */
export function Cacheable(ttlSeconds: number = 300, keyPrefix?: string) {
  return (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) => {
    SetMetadata(CACHE_TTL_KEY, ttlSeconds)(target, propertyName, descriptor);
    SetMetadata(CACHE_KEY_PREFIX, keyPrefix || propertyName)(
      target,
      propertyName,
      descriptor,
    );
    return descriptor;
  };
}

