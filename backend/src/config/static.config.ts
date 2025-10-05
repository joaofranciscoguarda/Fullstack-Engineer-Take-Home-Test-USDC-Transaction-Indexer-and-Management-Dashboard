import { ConfigModule } from '@nestjs/config';

export default async () => {
  // For now this configs don't depend on process.env, if needed, uncomment next line
  await ConfigModule.envVariablesLoaded;

  return {
    // Indexer chunk size configuration
    MIN_CATCHUP_CHUNK_SIZE: parseInt(
      process.env.MIN_CATCHUP_CHUNK_SIZE || '5',
      10,
    ),
    MAX_CATCHUP_CHUNK_SIZE: parseInt(
      process.env.MAX_CATCHUP_CHUNK_SIZE || '20',
      10,
    ),

    // Indexer thresholds
    REALTIME_THRESHOLD: parseInt(process.env.REALTIME_THRESHOLD || '1', 10),
    CATCHUP_THRESHOLD: parseInt(process.env.CATCHUP_THRESHOLD || '50', 10),

    // Indexer polling
    INDEXER_POLLING_INTERVAL: parseInt(
      process.env.INDEXER_POLLING_INTERVAL || '10000',
      10,
    ),

    // Worker configuration
    BLOCK_RANGE_WORKERS: parseInt(process.env.BLOCK_RANGE_WORKERS || '3', 10),
    CATCHUP_WORKERS: parseInt(process.env.CATCHUP_WORKERS || '2', 10),
    REORG_WORKERS: parseInt(process.env.REORG_WORKERS || '1', 10),

    // Performance tuning
    RPC_DELAY_MS: parseInt(process.env.RPC_DELAY_MS || '200', 10),
    DB_BATCH_SIZE: parseInt(process.env.DB_BATCH_SIZE || '200', 10),
    MAX_PENDING_PER_WORKER: parseInt(
      process.env.MAX_PENDING_PER_WORKER || '2',
      10,
    ),
  };
};
