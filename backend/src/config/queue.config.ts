import { registerAs } from '@nestjs/config';
import { QueueOptions } from 'bullmq';

export interface QueueConfigInterface {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    maxRetriesPerRequest?: number;
  };
  defaultJobOptions: {
    attempts: number;
    backoff: {
      type: 'exponential';
      delay: number;
    };
    removeOnComplete: boolean | number;
    removeOnFail: boolean | number;
  };
  queues: {
    blockRanges: {
      name: string;
      concurrency: number;
    };
    catchup: {
      name: string;
      concurrency: number;
    };
    reorgHandler: {
      name: string;
      concurrency: number;
    };
    walletNotification: {
      name: string;
      concurrency: number;
    };
  };
}

export default registerAs('queue', (): QueueConfigInterface => {
  const getEnvVar = (key: string, defaultValue?: string): string => {
    const value = process.env[key];
    if (!value && !defaultValue) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value || defaultValue!;
  };

  return {
    redis: {
      host: getEnvVar('REDIS_HOST', 'localhost'),
      port: parseInt(getEnvVar('REDIS_PORT', '6379'), 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(getEnvVar('REDIS_DB', '0'), 10),
      maxRetriesPerRequest: undefined, // BullMQ requires this to be null
    },
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000, // 1s, 2s, 4s, 8s, 16s
      },
      removeOnComplete: 1000, // Keep last 1000 completed jobs
      removeOnFail: 5000, // Keep last 5000 failed jobs for debugging
    },
    queues: {
      blockRanges: {
        name: 'block-ranges',
        concurrency: parseInt(getEnvVar('BLOCK_RANGES_CONCURRENCY', '10'), 10),
      },
      catchup: {
        name: 'catchup',
        concurrency: parseInt(getEnvVar('CATCHUP_CONCURRENCY', '5'), 10),
      },
      reorgHandler: {
        name: 'reorg-handler',
        concurrency: parseInt(getEnvVar('REORG_CONCURRENCY', '1'), 10),
      },
      walletNotification: {
        name: 'wallet-notification',
        concurrency: parseInt(getEnvVar('NOTIFICATION_CONCURRENCY', '10'), 10),
      },
    },
  };
});
