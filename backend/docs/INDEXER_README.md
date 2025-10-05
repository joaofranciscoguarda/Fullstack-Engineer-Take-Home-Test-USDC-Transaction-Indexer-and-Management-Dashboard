# USDC Transfer Indexer

A production-ready, fault-tolerant blockchain indexer for USDC ERC-20 Transfer events on Ethereum mainnet (and other EVM chains).

## Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer (NestJS)                       │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐│
│  │  Transfer Query API      │  │  Indexer Management API      ││
│  │  - GET /api/transfers    │  │  - POST /api/indexer/start   ││
│  │  - GET /api/balance      │  │  - GET /api/indexer/status   ││
│  └──────────────────────────┘  └──────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Job Queue (BullMQ)                          │
│    block-ranges │ catchup │ reorg-handler │ notifications        │
└─────────────────────────────────────────────────────────────────┘
         │                │              │              │
         ▼                ▼              ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐
│ BlockRange   │  │  Catchup     │  │    Reorg     │  │  Notif   │
│  Consumer    │  │  Consumer    │  │  Consumer    │  │ Consumer │
│ (5 workers)  │  │ (3 workers)  │  │ (1 worker)   │  │(10 work.)│
└──────────────┘  └──────────────┘  └──────────────┘  └──────────┘
         │                │              │
         └────────────────┴──────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Coordinator Service                           │
│  - Head Watcher (polls for new blocks)                          │
│  - Enqueues block range jobs                                     │
│  - Detects reorgs                                                │
│  - Leader election (single instance)                             │
└─────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Blockchain Service (Viem)                       │
│  - Multi-provider support with failover                          │
│  - Retry logic with exponential backoff                          │
│  - Chain switching                                               │
└─────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                PostgreSQL Database (Prisma)                      │
│  - transfers: indexed transfer events                            │
│  - indexer_state: current indexer state per chain/contract      │
│  - contracts: contracts being indexed                            │
│  - reorgs: blockchain reorganizations                            │
│  - job_metadata: job tracking                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### ✅ Implemented

- **Perpetual Indexing**: Continuously monitors blockchain for new transfers
- **Fault Tolerance**:
  - Network interruption recovery
  - Retry logic with exponential backoff
  - Multi-RPC failover
  - Resume from last successful block
- **Blockchain Reorg Handling**: Detects and handles chain reorganizations
- **Catch-up Mode**: Rapid indexing of large block ranges
- **Horizontal Scalability**: Multiple worker processes via BullMQ
- **Idempotent Operations**: Safe to retry any operation
- **Comprehensive REST API**: Query and management endpoints
- **State Management**: Persistent indexer state in PostgreSQL
- **Efficient Database Design**: Indexed columns for fast queries

### 🔜 Future Enhancements

- Real-time notifications via WebSocket/SSE
- Observability stack (Prometheus, OpenTelemetry, Grafana)
- Multi-chain support (easily extendable)
- Advanced leader election with Redis
- Rate limiting and backpressure
- Swagger/OpenAPI documentation

## Database Schema

### transfers

Primary table storing all indexed Transfer events.

```sql
- id (uuid)
- tx_hash (indexed)
- log_index
- block_number (indexed)
- block_hash
- timestamp (indexed)
- from_address (indexed)
- to_address (indexed)
- amount (string for BigInt)
- contract_id (FK)
- contract_address (indexed)
- chain_id (indexed)
- confirmations
- is_confirmed (indexed)
- unique constraint: (tx_hash, log_index, chain_id)
```

### indexer_state

Tracks indexer state per chain/contract combination.

```sql
- chain_id + contract_address (unique)
- last_processed_block
- current_block
- start_block
- status (running, stopped, error, paused)
- error_count, last_error
- blocks_per_second
- transfers_indexed
```

### contracts

Configures which contracts to index.

```sql
- address
- name, symbol, decimals
- chains (JSONB array)
- active
```

### reorgs

Tracks detected blockchain reorganizations.

```sql
- chain_id
- detected_at_block
- reorg_depth
- old_block_hash, new_block_hash
- status (detected, processing, resolved)
- transfers_affected
```

## API Endpoints

### Transfer Query Endpoints (Public)

```
GET /api/transfers
  Query indexed transfers with filtering
  Query params: page, limit, address, chainId, fromBlock, toBlock, startDate, endDate

GET /api/transfers/address/:address
  Get transfer history for an address (sent + received)
  Query params: page, limit, chainId, type (sent/received/all)

GET /api/balance/:address
  Calculate USDC balance using indexed data
  Query params: chainId, contractAddress

GET /api/transfers/:txHash
  Get specific transfer by transaction hash
  Query params: chainId
```

### Indexer Management Endpoints (Requires API Key)

```
GET /api/indexer/status
  Get current indexer status
  Query params: chainId, contractAddress

POST /api/indexer/start
  Start indexing
  Body: { chainId, contractAddress, startBlock? }

POST /api/indexer/stop
  Stop indexer gracefully
  Body: { chainId, contractAddress }

POST /api/indexer/reset
  Reset to specific block
  Body: { chainId, contractAddress, blockNumber }

GET /api/indexer/reorgs
  List detected reorgs
  Query params: chainId, limit

POST /api/indexer/catch-up
  Trigger rapid catch-up
  Body: { chainId, contractAddress, fromBlock, toBlock }

GET /api/indexer/queue-metrics
  Get queue statistics
```

## Setup & Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- pnpm (or npm/yarn)

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed initial data (optional)
npx prisma db seed
```

### Running the Application

```bash
# Development mode
pnpm run start:dev

# Production mode
pnpm run build
pnpm run start:prod
```

## Usage

### 1. Create a User with API Key

```bash
# Using Prisma Studio
npx prisma studio

# Or via SQL
psql -d usdc_indexer -c "INSERT INTO users (id, api_key) VALUES (gen_random_uuid(), 'your-secret-api-key');"
```

### 2. Add USDC Contract

```bash
curl -X POST http://localhost:3000/api/contracts \
  -H "X-API-Key: your-secret-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "USD Coin",
    "symbol": "USDC",
    "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "chains": [1],
    "decimals": 6
  }'
```

### 3. Start Indexer

```bash
curl -X POST http://localhost:3000/api/indexer/start \
  -H "X-API-Key: your-secret-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "chainId": 1,
    "contractAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "startBlock": 6082465
  }'
```

### 4. Check Status

```bash
curl http://localhost:3000/api/indexer/status?chainId=1&contractAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  -H "X-API-Key: your-secret-api-key"
```

### 5. Query Transfers

```bash
# Get recent transfers
curl http://localhost:3000/api/transfers?limit=10

# Get transfers for an address
curl http://localhost:3000/api/transfers/address/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# Get balance
curl http://localhost:3000/api/balance/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb?chainId=1
```

## Performance Considerations

### High Write Load

- **Batch Upserts**: Transfers are inserted in batches of 100
- **Idempotent Operations**: Upserts on (tx_hash, log_index, chain_id)
- **Connection Pooling**: Prisma handles connection pooling
- **Queue Backpressure**: BullMQ prevents overwhelming the database

### Concurrent Read/Write

- **Non-blocking Reads**: Queries don't block indexing
- **Indexed Columns**: All frequently queried columns are indexed
- **MVCC**: PostgreSQL's MVCC handles concurrent operations
- **Read Replicas**: Can add read replicas for scaling queries (future)

### Scalability

- **Horizontal Scaling**: Add more workers by increasing concurrency
- **Queue-based Architecture**: BullMQ distributes work across workers
- **Stateless Workers**: Workers can run on multiple machines
- **Leader Election**: Only one coordinator per chain/contract (future: Redis-based)

## Fault Tolerance

### Network Interruptions

- Automatic retry with exponential backoff
- Multi-RPC provider failover
- Jobs are persisted in Redis
- Resume from last successful block

### Blockchain Reorgs

- Detects reorgs by comparing block hashes
- Deletes affected transfers
- Re-indexes affected block range
- Tracks reorgs in database

### Application Crashes

- Indexer state persisted in database
- Restart from last processed block
- Queue jobs survive restarts
- No data loss

## Monitoring & Observability

### Current Logging

- Structured JSON logging
- Log levels: debug, info, warn, error
- Per-module loggers

### Future Metrics (Planned)

```
# Prometheus metrics
indexer_blocks_processed_total{chain_id, contract}
indexer_transfers_indexed_total{chain_id, contract}
indexer_lag_blocks{chain_id, contract}
indexer_blocks_per_second{chain_id, contract}
queue_jobs_waiting{queue_name}
queue_jobs_active{queue_name}
queue_jobs_completed_total{queue_name}
queue_jobs_failed_total{queue_name}
```

### Future Tracing (Planned)

- OpenTelemetry integration
- Distributed tracing: Coordinator → Worker → DB
- Jaeger visualization

## Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:cov
```

## Deployment

### Docker

```bash
# Build
docker build -t usdc-indexer .

# Run
docker-compose up -d
```

### Environment Variables

See `.env.example` for all configuration options.

## Troubleshooting

### Indexer stuck

- Check queue metrics: `GET /api/indexer/queue-metrics`
- Check logs for errors
- Verify RPC endpoint is working
- Restart indexer: `POST /api/indexer/stop` then `POST /api/indexer/start`

### High lag

- Increase worker concurrency in `.env`
- Trigger catch-up mode: `POST /api/indexer/catch-up`
- Add more RPC providers

### Database performance

- Check slow query logs
- Verify indexes are created
- Increase connection pool size
- Consider read replicas
