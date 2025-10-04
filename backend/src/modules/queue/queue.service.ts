import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { SupportedChains } from '@/modules/blockchain';

export interface BlockRangeJobData {
  chainId: SupportedChains;
  contractAddress: string;
  fromBlock: bigint;
  toBlock: bigint;
  priority?: number;
  retryCount?: number;
}

export interface CatchupJobData {
  chainId: SupportedChains;
  contractAddress: string;
  fromBlock: bigint;
  toBlock: bigint;
  chunkSize: bigint;
  retryCount?: number;
}

export interface ReorgJobData {
  chainId: SupportedChains;
  reorgId: string;
  affectedFromBlock: bigint;
  affectedToBlock: bigint;
  retryCount?: number;
}

export interface WalletNotificationJobData {
  walletAddress: string;
  chainId: SupportedChains;
  transferId: string;
  type: 'send' | 'receive';
  retryCount?: number;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private metricsInterval?: NodeJS.Timeout;

  constructor(
    @InjectQueue('block-ranges') private blockRangesQueue: Queue,
    @InjectQueue('catchup') private catchupQueue: Queue,
    @InjectQueue('reorg-handler') private reorgHandlerQueue: Queue,
    @InjectQueue('wallet-notification')
    private walletNotificationQueue: Queue,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.logger.log('Queue service initialized');
    await this.setupQueueMetrics();
  }

  async onModuleDestroy() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.logger.log('Queue service metrics interval cleared');
    }
  }

  private async setupQueueMetrics() {
    // Log queue health periodically
    this.metricsInterval = setInterval(async () => {
      try {
        const metrics = await this.getQueueMetrics();
        this.logger.debug('Queue metrics:', metrics);
      } catch (error) {
        this.logger.error('Failed to get queue metrics', error);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Add a block range job to process Transfer events
   */
  async addBlockRangeJob(
    data: BlockRangeJobData,
    options?: {
      priority?: number;
      delay?: number;
      retryCount?: number;
      attempts?: number;
      backoff?: { type: string; delay: number };
    },
  ): Promise<Job<BlockRangeJobData>> {
    // Reduced logging to avoid spam
    if (Number(data.fromBlock) % 5000 === 0) {
      this.logger.log(
        `Queueing blocks ${data.fromBlock} to ${data.toBlock} for chain ${data.chainId}`,
      );
    }

    const job = await this.blockRangesQueue.add(
      'job',
      {
        ...data,
        fromBlock: data.fromBlock.toString(),
        toBlock: data.toBlock.toString(),
        retryCount: options?.retryCount || 0,
      },
      {
        priority: options?.priority || 10,
        delay: options?.delay,
        attempts: options?.attempts || 3,
        backoff: options?.backoff || {
          type: 'exponential',
          delay: 2000,
        },
        // Remove jobId to allow BullMQ to generate unique IDs
      },
    );
    return job;
  }

  /**
   * Add a catch-up job for processing large block ranges
   */
  async addCatchupJob(data: CatchupJobData): Promise<Job<CatchupJobData>> {
    this.logger.log(
      `Adding catchup job: ${data.fromBlock} to ${data.toBlock} for chain ${data.chainId}`,
    );

    return this.catchupQueue.add(
      'job',
      {
        ...data,
        fromBlock: data.fromBlock.toString(),
        toBlock: data.toBlock.toString(),
        chunkSize: data.chunkSize.toString(),
      } as any,
      {
        priority: 5, // Higher priority than normal block ranges
        jobId: `catchup-${data.chainId}-${data.fromBlock}-${data.toBlock}`,
      },
    );
  }

  /**
   * Add a reorg handler job
   */
  async addReorgJob(data: ReorgJobData): Promise<Job<ReorgJobData>> {
    this.logger.warn(
      `Adding reorg handler job for chain ${data.chainId} from block ${data.affectedFromBlock}`,
    );

    return this.reorgHandlerQueue.add(
      'job',
      {
        ...data,
        affectedFromBlock: data.affectedFromBlock.toString(),
        affectedToBlock: data.affectedToBlock.toString(),
      } as any,
      {
        priority: 1, // Highest priority
        jobId: `reorg-${data.reorgId}`,
      },
    );
  }

  /**
   * Add a wallet notification job
   */
  async addWalletNotificationJob(
    data: WalletNotificationJobData,
  ): Promise<Job<WalletNotificationJobData>> {
    return this.walletNotificationQueue.add('send-notification', data, {
      priority: 20,
      removeOnComplete: 100,
    });
  }

  /**
   * Get metrics for all queues
   */
  async getQueueMetrics() {
    const [blockRanges, catchup, reorg, notification] = await Promise.all([
      this.getQueueStats(this.blockRangesQueue),
      this.getQueueStats(this.catchupQueue),
      this.getQueueStats(this.reorgHandlerQueue),
      this.getQueueStats(this.walletNotificationQueue),
    ]);

    return {
      blockRanges,
      catchup,
      reorg,
      notification,
    };
  }

  private async getQueueStats(queue: Queue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Pause a specific queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.pause();
    this.logger.log(`Queue ${queueName} paused`);
  }

  /**
   * Resume a specific queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.resume();
    this.logger.log(`Queue ${queueName} resumed`);
  }

  /**
   * Clean completed jobs from a queue
   */
  async cleanQueue(queueName: string, grace: number = 3600000): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.clean(grace, 1000, 'completed');
    this.logger.log(`Queue ${queueName} cleaned`);
  }

  /**
   * Drain a queue (remove all jobs)
   */
  async drainQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.drain();
    this.logger.warn(`Queue ${queueName} drained`);
  }

  private getQueueByName(name: string): Queue {
    switch (name) {
      case 'block-ranges':
        return this.blockRangesQueue;
      case 'catchup':
        return this.catchupQueue;
      case 'reorg-handler':
        return this.reorgHandlerQueue;
      case 'wallet-notification':
        return this.walletNotificationQueue;
      default:
        throw new Error(`Unknown queue name: ${name}`);
    }
  }

  /**
   * Get a specific job by ID
   */
  async getJob(queueName: string, jobId: string): Promise<Job | undefined> {
    const queue = this.getQueueByName(queueName);
    return queue.getJob(jobId);
  }

  /**
   * Remove a specific job
   */
  async removeJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    if (job) {
      await job.remove();
      this.logger.log(`Job ${jobId} removed from ${queueName}`);
    }
  }
}
