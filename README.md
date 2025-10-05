# USDC Transaction Indexer & Management Dashboard

A production-ready, fault-tolerant blockchain indexer for USDC ERC-20 Transfer events on Ethereum mainnet (and other EVM chains) built with NestJS, featuring a Laravel-inspired architecture with base models and repositories.

## 🎯 **Quick Start Guide**

### **Step 1: Setup Environment**

1. **Copy environment file:**

   ```bash
   cp .env.example .env
   ```

2. **Configure your environment variables** (see [Environment Configuration](#-environment-configuration) section)

### **Step 2: Start Services with Docker**

Use the VS Code tasks for easy management:

1. **Start all services:**

   - Press `Ctrl+Shift+P` → "Tasks: Run Task" → "docker up"
   - Or run: `docker compose up -V --remove-orphans`

2. **Migrate database and seed data:**
   - Press `Ctrl+Shift+P` → "Tasks: Run Task" → "migrate:reset-and-seed"
   - Or run: `docker compose exec backend pnpm migrate:reset-and-seed`

### **Step 3: Generate API Key**

**Use postman collection to make requests easier.**

```bash
curl http://localhost:8080/api/users/generate-key
```

### **Step 4: Start Indexing USDC Transfers**

```bash
curl -X POST http://localhost:8080/api/indexer/start \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    // No need to send body, it has a default value
    "chainId": 1,
    "contractAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
  }'
```

### **Step 5: Check Indexer Status**

```bash
curl http://localhost:8080/api/indexer/status?chainId=1&contractAddress=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 \
  -H "X-API-Key: YOUR_API_KEY"
```

---

## 🏗️ **Architecture Overview**

### **Core Components**

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
│ (~5 workers)  │  │ (~3 workers)  │  │ (Not necessary)   │  │(Not implemented)│
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

---

## 🔧 **Environment Configuration**

### **Impactful Environment Variables**

```bash

# =================================================================
# BLOCKCHAIN CONFIGURATION
# =================================================================
BLOCKCHAIN_TIMEOUT=30000
BLOCKCHAIN_RETRY_ATTEMPTS=3

# =================================================================
# INDEXER CONFIGURATION
# =================================================================
DEFAULT_CHAIN_ID=1
BLOCK_RANGE_WORKERS=10  # Number of concurrent workers for block processing (default: 10)
CATCHUP_WORKERS=

BLOCK_RANGE_SIZE=300  # Blocks per job (default: 500, increase for faster indexing, max ~5000 for USDC)
INDEXER_POLLING_INTERVAL=10000  # Polling interval in ms (default: 10000)
MAX_CATCHUP_CHUNK_SIZE=500  # Max chunk size during catch-up (default: 500)
MIN_CATCHUP_CHUNK_SIZE=
REALTIME_THRESHOLD=
CATCHUP_THRESHOLD=
INDEXER_STOP_AT_BLOCK=

1_1_TRANSPORT=https://eth.llamarpc.com
1_2_TRANSPORT=https://rpc.ankr.com/eth/ # INSERT HERE YOUR API KEY
1_3_TRANSPORT=https://ethereum-mainnet.gateway.tatum.io

1_INDEXER_START_BLOCK=23500000
```

### **Getting RPC Provider Keys**

1. **Infura**: Sign up at [infura.io](https://infura.io) and create a project
2. **Alchemy**: Sign up at [alchemy.com](https://alchemy.com) and create an app
3. **Ankr**: Free tier available at [ankr.com](https://ankr.com)

---

## 📚 **Available Tasks (VS Code)**

Use these tasks for easy development workflow:

| Task                       | Description              | Command                                                   |
| -------------------------- | ------------------------ | --------------------------------------------------------- |
| **docker up**              | Start all services       | `docker compose up -V --remove-orphans`                   |
| **docker down**            | Stop and cleanup         | `docker compose down && docker volume prune --force`      |
| **migrate dev**            | Run new migrations       | `docker compose exec backend pnpm migrate:dev`            |
| **migrate:reset**          | Reset database           | `docker compose exec backend pnpm migrate:reset`          |
| **migrate:reset-and-seed** | Reset and seed data      | `docker compose exec backend pnpm migrate:reset-and-seed` |
| **prisma generate**        | Generate Prisma client   | `docker compose exec backend pnpm prisma generate`        |
| **seed**                   | Seed database            | `docker compose exec backend pnpm seed`                   |
| **backend logs**           | View backend logs        | `docker compose logs -n 100 -f backend`                   |
| **backend shell**          | Access backend container | `docker compose exec -it backend /bin/ash`                |

---

## 🚀 **API Endpoints**

### **Postman Collection**

Import the provided `postman-collection.json` into Postman with these variables:

- `base_url`: `http://localhost:8080`
- `api_key`: Your generated API key

---

## 📖 **Swagger Documentation**

Access the interactive API documentation at:

- **Swagger UI**: `http://localhost:8080/api/docs`
- **JSON Schema**: `http://localhost:8080/api/docs-json`

---

## 🔄 **Blockchain Service Architecture**

### **Provider Switching Logic**

The blockchain service automatically handles RPC provider failures:

```typescript
// Automatic provider switching on errors
shouldChangeProvider(error: Error): boolean {
  const status = this.parseError(error).status || this.parseError(error).code;

  // Rate limiting (HTTP 429)
  if (status === 429) return true;

  // Client/Server errors (4xx/5xx)
  if (status >= 400 && status < 600) return true;

  // Blockchain-specific errors
  const patterns = [
    /rate limit/i,
    /quota exceeded/i,
    /service unavailable/i,
    /rpc.*unavailable/i,
  ];

  return patterns.some(pattern => pattern.test(error.message));
}
```

### **Chunk Size Management**

The indexer automatically adjusts block ranges based on RPC capabilities:

- **Initial chunk size**: 1,000 blocks
- **Maximum chunk size**: 10,000 blocks
- **Adaptive scaling**: Increases/decreases based on success rate
- **Error handling**: Breaks down large chunks on RPC errors

---

## ⚡ **Performance Tuning**

### **Optimizing Indexing Speed**

The indexer's performance is controlled by several key parameters:

1. **`BLOCK_RANGE_SIZE`** (default: 200)

   - Defines how many blocks are processed per job
   - **Recommendation**: Start with 200, increase up to 2k for USDC (sparse events)
   - Higher values = fewer jobs, faster indexing (but higher memory usage)
   - Lower values = more jobs, better parallelism for dense events

2. **`BLOCK_RANGE_WORKERS`** (default: 10)

   - Number of concurrent workers processing blocks
   - **Recommendation**: 8-16 workers depending on RPC rate limits
   - More workers = faster processing (if RPC provider supports it)

3. **`MAX_CATCHUP_CHUNK_SIZE`** (default: 200)
   - Max chunk size during catch-up mode (when far behind)
   - Should match or be slightly smaller than `BLOCK_RANGE_SIZE`

### **Example Configuration for Maximum Speed:**

```env
# For fast indexing with good RPC providers (Alchemy, Infura Pro)
BLOCK_RANGE_SIZE=2000
BLOCK_RANGE_WORKERS=16
MAX_CATCHUP_CHUNK_SIZE=2000
BLOCK_RANGES_CONCURRENCY=16
CATCHUP_CONCURRENCY=8
INDEXER_POLLING_INTERVAL=5000

# Add multiple RPC endpoints for better throughput
1_1_TRANSPORT=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
1_2_TRANSPORT=https://mainnet.infura.io/v3/YOUR_KEY
1_3_TRANSPORT=https://rpc.ankr.com/eth/YOUR_KEY
```

**Expected Performance:**

- With default settings (500 blocks/job): ~50-100 blocks/second
- With optimized settings (2000 blocks/job): ~200-500 blocks/second
- Indexing 1 month of data (~216,000 blocks): 10-60 minutes depending on configuration

---

---

## 🔍 **Monitoring & Debugging**

### **Check Indexer Status**

```bash
curl http://localhost:8080/api/indexer/status?chainId=1&contractAddress=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 \
  -H "X-API-Key: YOUR_API_KEY"
```

### **View Logs**

```bash
# Backend logs
docker compose logs -f backend

# Or use VS Code task: "backend logs"
```

### **Access Database**

I recommend using DBeaver or another database client to access the database. Just AI uses curl calls, what a weirdo.

### **Queue Monitoring**

```bash
curl http://localhost:8080/api/indexer/queue-metrics \
  -H "X-API-Key: YOUR_API_KEY"
```

---

## 🚨 **Troubleshooting**

### **Indexer Not Starting**

1. Check RPC provider URLs in `.env`
2. Verify API key is valid
3. Check database connection
4. Review backend logs

### **High RPC Errors**

1. Reduce worker count in `.env`
2. Add more RPC providers
3. Increase `BLOCKCHAIN_RETRY_ATTEMPTS`
4. Check provider rate limits

### **Database Performance**

1. Verify indexes are created: `\d+ transfers`
2. Check connection pool size
3. Monitor slow queries
4. Consider read replicas for scaling

### **Memory Issues**

1. Reduce `INDEXER_WORKERS_*` counts
2. Decrease `INDEXER_CHUNK_SIZE`
3. Monitor container memory usage
4. Add swap space if needed

---
