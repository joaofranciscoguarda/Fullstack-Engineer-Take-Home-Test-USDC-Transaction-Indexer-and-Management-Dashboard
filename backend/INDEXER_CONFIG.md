# Indexer Start Block Configuration

## Overview

The indexer now supports configurable start blocks via environment variables, making it easy to customize where indexing begins for each chain without modifying code.

## Environment Variables

### Ethereum Mainnet

```bash
INDEXER_START_BLOCK_MAINNET=20800000  # Default: block ~20.8M (~1 month ago)
```

### Sepolia Testnet

```bash
INDEXER_START_BLOCK_SEPOLIA=7000000   # Default: block 7M
```

## Default Values

The configuration in `backend/src/config/blockchain.config.ts` provides sensible defaults:

- **Mainnet**: Block 20,800,000 (~1 month ago from current block ~21M)
  - USDC contract was deployed at block 6,082,465
  - Starting from a recent block is recommended for faster initial sync
- **Sepolia**: Block 7,000,000 (recent testnet block)

## Why This Matters

Without this configuration, indexing from the USDC deployment block (6,082,465) to current block (21,000,000+) would require:

- Processing ~15 million blocks
- Potentially millions of events
- Hours or days of indexing time

By starting from a recent block (~1 month ago), you can:

- Start indexing recent data immediately
- Test and verify the system quickly
- Expand the range later if needed

## Usage Examples

### Start from 1 month ago (default)

```bash
# No env var needed, uses default
docker-compose up
```

### Start from 3 months ago

```bash
# Ethereum produces ~216,000 blocks per month
# 3 months = ~648,000 blocks ago
INDEXER_START_BLOCK_MAINNET=20400000 docker-compose up
```

### Start from USDC deployment (full history)

```bash
INDEXER_START_BLOCK_MAINNET=6082465 docker-compose up
```

### Start from a specific date

```bash
# Find block number from etherscan or use approximate calculation:
# Current block - (days ago * 7200 blocks/day)
INDEXER_START_BLOCK_MAINNET=20500000 docker-compose up
```

## API Override

You can also override the start block when starting an indexer via the API:

```bash
POST /api/indexer/start
{
  "chainId": 1,
  "contractAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  "startBlock": "20800000"  # Optional: overrides the default
}
```

## Configuration Flow

1. **Environment Variable** (`INDEXER_START_BLOCK_MAINNET`) - Highest priority
2. **API Parameter** (`startBlock` in `/api/indexer/start`) - Override at runtime
3. **Code Default** (20,800,000 for mainnet) - Fallback

## Verification

To verify your configuration is being used, check the indexer state:

```bash
GET /api/indexer/status
```

Look for the `last_processed_block` field in the response.
