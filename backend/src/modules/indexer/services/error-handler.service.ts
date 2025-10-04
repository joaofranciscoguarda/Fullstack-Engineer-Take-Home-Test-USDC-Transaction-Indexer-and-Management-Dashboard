import { Injectable, Logger } from '@nestjs/common';
import { IndexerStateRepository } from '@/database/prisma/repositories';
import { QueueService } from '@/modules/queue';
import { SupportedChains } from '@/modules/blockchain';

/** Handles error tracking, circuit breaker, and emergency shutdown */
@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name);

  private readonly MAX_CONSECUTIVE_ERRORS = 10;
  private readonly MAX_ERRORS_PER_HOUR = 50;
  private readonly ERROR_RESET_WINDOW = 60 * 60 * 1000;
  private consecutiveErrors = 0;
  private errorCount = 0;
  private lastErrorReset = Date.now();
  private shouldShutdown = false;

  private circuitBreakerOpen = false;
  private circuitBreakerOpenTime = 0;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 5 * 60 * 1000;

  constructor(
    private readonly indexerStateRepo: IndexerStateRepository,
    private readonly queueService: QueueService,
  ) {}

  isShutdownRequested(): boolean {
    return this.shouldShutdown;
  }

  isCircuitBreakerOpen(): boolean {
    return this.circuitBreakerOpen;
  }

  getCircuitBreakerRemainingTime(): number {
    if (!this.circuitBreakerOpen) return 0;
    const timeSinceOpen = Date.now() - this.circuitBreakerOpenTime;
    return Math.max(0, this.CIRCUIT_BREAKER_TIMEOUT - timeSinceOpen);
  }

  checkCircuitBreaker(): boolean {
    if (!this.circuitBreakerOpen) return false;

    const timeSinceOpen = Date.now() - this.circuitBreakerOpenTime;
    if (timeSinceOpen < this.CIRCUIT_BREAKER_TIMEOUT) {
      const waitTime = Math.round(
        (this.CIRCUIT_BREAKER_TIMEOUT - timeSinceOpen) / 1000,
      );
      if (waitTime % 30 === 0) {
        this.logger.warn(`⚠ Circuit breaker open - ${waitTime}s remaining`);
      }
      return true;
    } else {
      this.logger.log(`✓ Circuit breaker closed - resuming`);
      this.circuitBreakerOpen = false;
      return false;
    }
  }

  openCircuitBreaker(): void {
    this.logger.error(`Failed to get block - circuit breaker triggered`);
    this.circuitBreakerOpen = true;
    this.circuitBreakerOpenTime = Date.now();
  }

  async handleError(
    error: Error,
    chainId: SupportedChains,
    contractAddress: string,
  ): Promise<void> {
    this.consecutiveErrors++;
    this.errorCount++;

    const now = Date.now();
    if (now - this.lastErrorReset > this.ERROR_RESET_WINDOW) {
      this.errorCount = 1;
      this.consecutiveErrors = 1;
      this.lastErrorReset = now;
    }

    const cleanMessage = this.cleanErrorMessage(error.message);

    this.logger.error(
      `Error #${this.errorCount} (consecutive: ${this.consecutiveErrors}): ${cleanMessage}`,
    );

    if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
      this.logger.error(
        `SHUTDOWN: ${this.MAX_CONSECUTIVE_ERRORS} consecutive errors`,
      );
      await this.emergencyShutdown();
      return;
    }

    if (this.errorCount >= this.MAX_ERRORS_PER_HOUR) {
      this.logger.error(
        `SHUTDOWN: ${this.MAX_ERRORS_PER_HOUR} errors/hour exceeded`,
      );
      await this.emergencyShutdown();
      return;
    }

    try {
      await this.indexerStateRepo.recordError(
        chainId,
        contractAddress,
        error.message,
      );
    } catch (stateError) {
      this.logger.error('Failed to record error', stateError);
    }
  }

  private async emergencyShutdown(): Promise<void> {
    this.shouldShutdown = true;
    this.logger.error('EMERGENCY SHUTDOWN INITIATED');

    try {
      await this.queueService.pauseQueue('block-ranges');
      await this.queueService.pauseQueue('catchup');
    } catch (error) {
      this.logger.error('Error pausing queues', error);
    }

    try {
      const states = await this.indexerStateRepo.getAllStates();
      for (const state of states) {
        if (state.status === 'running') {
          await this.indexerStateRepo.updateStatus(
            state.chain_id,
            state.contract_address,
            'error',
          );
        }
      }
    } catch (error) {
      this.logger.error('Error updating states', error);
    }

    this.logger.error('SHUTDOWN COMPLETE - Manual intervention required');
  }

  async resetErrorCounters(): Promise<void> {
    this.consecutiveErrors = 0;
    this.errorCount = 0;
    this.lastErrorReset = Date.now();
    this.shouldShutdown = false;
    this.logger.log('Error counters reset');
  }

  private cleanErrorMessage(message: string): string {
    if (!message) return 'Unknown error';
    if (message.includes('<html') || message.includes('<!DOCTYPE')) {
      return 'HTTP error (HTML filtered)';
    }
    if (message.length > 500) {
      return `${message.substring(0, 200)}... (truncated)`;
    }
    if (/HTTP request failed|fetch failed|ECONNRESET|ETIMEDOUT/.test(message)) {
      return `RPC Error: ${message.split('\n')[0]}`;
    }
    return message;
  }
}
