# USDC Transaction Indexer & Management Dashboard - Backend

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

2. **Reset database and seed data:**
   - Press `Ctrl+Shift+P` → "Tasks: Run Task" → "migrate:reset-and-seed"
   - Or run: `docker compose exec backend pnpm migrate:reset-and-seed`

### **Step 3: Generate API Key**

```bash
curl http://localhost:8080/api/users/generate-key
```

### **Step 4: Start Indexing USDC Transfers**

```bash
curl -X POST http://localhost:8080/api/indexer/start \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
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

### **Key Architectural Features**

#### **1. Base Models & Repositories**

The system uses a powerful base architecture that eliminates repetitive code:

- **BaseModel**: Provides common functionality for all models (CRUD, validation, serialization)
- **BaseRepository**: Handles all database operations with type safety
- **BaseService**: Common service patterns with dependency injection

```typescript
// Example: Extending BaseModel
export class Transfer extends BaseModel<
  Transfer,
  ITransfer,
  'Transfers',
  'string'
> {
  static primaryKeyName() {
    return 'id';
  }
}

// Example: Extending BaseRepository
export class TransfersRepository extends BaseRepository<Transfer, 'Transfers'> {
  // Inherits all CRUD operations automatically
  // Add custom methods as needed
}
```

#### **2. Blockchain Service with Provider Switching**

The blockchain service automatically handles RPC provider failures and switching:

- **Multi-provider support**: Automatic failover between RPC providers
- **Error mapping**: Comprehensive error detection and retry logic
- **Chunk size management**: Automatically adjusts block ranges based on RPC capabilities
- **Rate limit handling**: Intelligent backoff and provider switching

#### **3. Fault-Tolerant Indexer**

- **Reorg Detection**: Automatically detects and handles blockchain reorganizations
- **Resume Capability**: Restarts from last processed block after crashes
- **Queue-based Processing**: BullMQ handles job distribution and retries
- **State Persistence**: All indexer state stored in PostgreSQL

---

## 🔧 **Environment Configuration**

### **Required Environment Variables**

```bash
# =================================================================
# DATABASE CONFIGURATION
# =================================================================
DB_DATABASE=template_db
DB_USERNAME=template_user
DB_PASSWORD=template_password
DB_ROOT_PASSWORD=root_password
DATABASE_URL="postgresql://template_user:template_password@postgres:5432/template_db"

# =================================================================
# REDIS CONFIGURATION
# =================================================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_URL="redis://redis:6379"

# =================================================================
# BLOCKCHAIN CONFIGURATION
# =================================================================
DEFAULT_CHAIN_ID=1
DEFAULT_BLOCKCHAIN_PROVIDER=viem
BLOCKCHAIN_TIMEOUT=30000
BLOCKCHAIN_RETRY_ATTEMPTS=3

# =================================================================
# ETHEREUM MAINNET RPC PROVIDERS
# =================================================================
ETHEREUM_INFURA_TRANSPORT=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
ETHEREUM_ALCHEMY_TRANSPORT=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
ETHEREUM_ANKR_TRANSPORT=https://rpc.ankr.com/eth

# =================================================================
# POLYGON MAINNET RPC PROVIDERS (Optional)
# =================================================================
POLYGON_INFURA_TRANSPORT=https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY
POLYGON_ALCHEMY_TRANSPORT=https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# =================================================================
# APPLICATION CONFIGURATION
# =================================================================
NODE_ENV=development
PORT=8080
API_PREFIX=api

# =================================================================
# INDEXER CONFIGURATION
# =================================================================
INDEXER_CHUNK_SIZE=1000
INDEXER_MAX_CHUNK_SIZE=10000
INDEXER_POLLING_INTERVAL=2000
INDEXER_CONFIRMATIONS=12
INDEXER_WORKERS_BLOCK_RANGES=5
INDEXER_WORKERS_CATCHUP=3
INDEXER_WORKERS_REORG=1
INDEXER_WORKERS_NOTIFICATIONS=10
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

### **Transfer Query Endpoints (Public)**

#### **Get All Transfers**

```http
GET /api/transfers
Query params: page, limit, address, chainId, fromBlock, toBlock, startDate, endDate
```

#### **Get Transfers by Address**

```http
GET /api/transfers/address/:address
Query params: page, limit, chainId, type (sent/received/all)
```

#### **Get Balance**

```http
GET /api/balance/:address
Query params: chainId, contractAddress
```

#### **Get Transfer by Transaction Hash**

```http
GET /api/transfers/:txHash
Query params: chainId
```

### **Indexer Management Endpoints (Requires API Key)**

#### **Get Indexer Status**

```http
GET /api/indexer/status?chainId=1&contractAddress=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
Headers: X-API-Key: YOUR_API_KEY
```

#### **Start Indexer**

```http
POST /api/indexer/start
Headers: X-API-Key: YOUR_API_KEY
Body: {
  "chainId": 1,
  "contractAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  "startBlock": 6082465
}
```

#### **Stop Indexer**

```http
POST /api/indexer/stop
Headers: X-API-Key: YOUR_API_KEY
Body: {
  "chainId": 1,
  "contractAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
}
```

#### **Trigger Catch-up Mode**

```http
POST /api/indexer/catch-up
Headers: X-API-Key: YOUR_API_KEY
Body: {
  "chainId": 1,
  "contractAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  "fromBlock": 23496000,
  "toBlock": 23498000
}
```

#### **Get Reorgs**

```http
GET /api/indexer/reorgs?chainId=1&limit=10
Headers: X-API-Key: YOUR_API_KEY
```

#### **Get Queue Metrics**

```http
GET /api/indexer/queue-metrics
Headers: X-API-Key: YOUR_API_KEY
```

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

## 🗄️ **Database Schema**

### **Core Tables**

#### **transfers**

Stores all indexed USDC transfer events:

```sql
- id (uuid, primary key)
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
```

#### **indexer_state**

Tracks indexer state per chain/contract:

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

#### **contracts**

Configures contracts to index:

```sql
- address
- name, symbol, decimals
- chains (JSONB array)
- active
```

#### **reorgs**

Tracks blockchain reorganizations:

```sql
- chain_id
- detected_at_block
- reorg_depth
- old_block_hash, new_block_hash
- status (detected, processing, resolved)
- transfers_affected
```

---

## 🛠️ **Development Workflow**

### **1. Adding New Models**

Use the base architecture for consistency:

```typescript
// 1. Define interface
export interface IMyModel extends IBaseModel<string> {
  name: string;
  description?: string;
}

// 2. Create model class
export class MyModel extends BaseModel<
  MyModel,
  IMyModel,
  'MyModels',
  'string'
> {
  static primaryKeyName() {
    return 'id';
  }
}

// 3. Create repository
export class MyModelsRepository extends BaseRepository<MyModel, 'MyModels'> {
  // Inherits all CRUD operations
  // Add custom methods as needed
}

// 4. Create service
@Injectable()
export class MyModelsService {
  constructor(private readonly repository: MyModelsRepository) {
    super(...);

  // Create methods when needed, but respect the hierarchy. Controller -> Service -> Repository.
  // Not controller -> repository.
  }
}
```

### **2. Adding New API Endpoints**

```typescript
@Controller('my-models')
export class MyModelsController {
  constructor(private readonly myModelsService: MyModelsService) {}

  @Get()
  @Public()
  async findAll(@Query() query: PaginationDto) {
    return this.myModelsService.findAll(query);
  }
}
```

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

```bash
# Using VS Code task: "backend shell"
docker compose exec -it backend /bin/ash

# Then connect to database
psql $DATABASE_URL
```

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

## 🔮 **Future Enhancements**

- **Real-time notifications** via WebSocket/SSE
- **Observability stack** (Prometheus, OpenTelemetry, Grafana)
- **Multi-chain support** (easily extendable)
- **Advanced leader election** with Redis
- **Rate limiting and backpressure**
- **Comprehensive test suite**

---

## 📝 **Important Notes**

1. **Base Models & Repositories**: Always extend the base classes to maintain consistency and reduce boilerplate
2. **Blockchain Service**: Handles all RPC provider switching automatically - no manual intervention needed
3. **Worker Scaling**: More workers may cause RPC rate limits - the service will handle this automatically
4. **Tests**: Not fully implemented due to time constraints
5. **Swagger**: Fully configured and available at `/api/docs`
6. **Postman Collection**: Ready to use with environment variables
