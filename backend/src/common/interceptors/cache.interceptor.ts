import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '@/modules/cache';
import { CACHE_TTL_KEY, CACHE_KEY_PREFIX } from '../decorators/cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Get cache metadata
    const ttl = this.reflector.get<number>(CACHE_TTL_KEY, handler);
    const keyPrefix = this.reflector.get<string>(CACHE_KEY_PREFIX, handler);

    // If no cache metadata, proceed without caching
    if (!ttl) {
      return next.handle();
    }

    // Generate cache key from request
    const cacheKey = this.generateCacheKey(
      controller.name,
      keyPrefix,
      request.method,
      request.url,
      request.query,
      request.params,
    );

    this.logger.debug(`Checking cache for key: ${cacheKey}`);

    try {
      // Check cache
      const cachedResult = await this.cacheService.get(cacheKey);
      if (cachedResult) {
        this.logger.debug(`Cache hit for key: ${cacheKey}`);
        return of(JSON.parse(cachedResult));
      }

      this.logger.debug(`Cache miss for key: ${cacheKey}`);

      // Execute the handler and cache the result
      return next.handle().pipe(
        tap(async (result) => {
          try {
            await this.cacheService.set(cacheKey, JSON.stringify(result), ttl);
            this.logger.debug(
              `Cached result for key: ${cacheKey} (TTL: ${ttl}s)`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to cache result for key: ${cacheKey}`,
              error,
            );
          }
        }),
      );
    } catch (error) {
      this.logger.error(`Cache error for key: ${cacheKey}`, error);
      // If cache fails, proceed without caching
      return next.handle();
    }
  }

  private generateCacheKey(
    controllerName: string,
    methodName: string,
    httpMethod: string,
    url: string,
    query: any,
    params: any,
  ): string {
    // Create a deterministic cache key from the request
    const keyParts = [
      'transfers',
      controllerName.toLowerCase(),
      methodName,
      httpMethod.toLowerCase(),
      url,
    ];

    // Add query parameters (sorted for consistency)
    if (query && Object.keys(query).length > 0) {
      const sortedQuery = Object.keys(query)
        .sort()
        .map((key) => `${key}:${query[key]}`)
        .join(',');
      keyParts.push(`query:${sortedQuery}`);
    }

    // Add route parameters
    if (params && Object.keys(params).length > 0) {
      const sortedParams = Object.keys(params)
        .sort()
        .map((key) => `${key}:${params[key]}`)
        .join(',');
      keyParts.push(`params:${sortedParams}`);
    }

    return keyParts.join('|');
  }
}

