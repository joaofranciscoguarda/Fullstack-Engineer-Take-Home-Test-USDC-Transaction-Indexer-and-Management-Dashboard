# Caching Implementation

## Overview

Added basic caching functionality to the transfers controller to improve API performance and reduce database load.

## Components

### 1. Cache Decorator (`@Cacheable`)

- **Location**: `src/common/decorators/cache.decorator.ts`
- **Purpose**: Marks methods for caching with configurable TTL and key prefix
- **Usage**: `@Cacheable(ttlSeconds, keyPrefix?)`

### 2. Cache Interceptor (`CacheInterceptor`)

- **Location**: `src/common/interceptors/cache.interceptor.ts`
- **Purpose**: Handles caching logic using Redis
- **Features**:
  - Generates deterministic cache keys from request parameters
  - Checks cache before executing methods
  - Stores results in Redis with TTL
  - Graceful fallback if cache fails

### 3. Applied Caching

The following endpoints now have caching enabled:

#### TransfersController

- `GET /api/transfers` - **TTL: 5 minutes** (300s)
  - Caches transfer queries with filters
- `GET /api/transfers/address/:address` - **TTL: 3 minutes** (180s)
  - Caches address-specific transfer history
- `GET /api/transfers/:txHash` - **TTL: 10 minutes** (600s)
  - Caches individual transactions (immutable data)

#### BalanceController

- `GET /api/balance/:address` - **TTL: 1 minute** (60s)
  - Caches balance calculations (can change frequently)

## Cache Key Strategy

Cache keys are generated deterministically from:

- Controller name
- Method name
- HTTP method
- URL path
- Query parameters (sorted)
- Route parameters (sorted)

Example: `transfers|transferscontroller|get-transfers|get|/api/transfers|query:page:1,limit:50`

## Benefits

- **Performance**: Reduced database queries for repeated requests
- **Scalability**: Lower database load under high traffic
- **User Experience**: Faster response times for cached data
- **Cost Efficiency**: Reduced computational overhead

## Configuration

- Uses existing Redis instance from `CacheService`
- TTL values optimized based on data volatility
- Graceful degradation if Redis is unavailable
