import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Contract, Transfer, User, WalletSubscription } from '@/common/models';
import {
  ContractsRepository,
  TransfersRepository,
  UsersRepository,
  WalletSubscriptionRepository,
} from '@/database/prisma/repositories';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly userRepo: UsersRepository,
    private readonly transferRepo: TransfersRepository,
    private readonly walletSubscriptionRepo: WalletSubscriptionRepository,
    private readonly contractRepo: ContractsRepository,
  ) {}

  async seed(): Promise<void> {
    this.logger.log('Starting database seeding...');

    try {
      // Create API user (for frontend/API consumer)
      const apiKey = randomBytes(32).toString('hex');

      const apiUser = new User({
        api_key: apiKey,
      });

      await this.userRepo.create(apiUser);

      this.logger.log('✓ API User created');
      this.logger.log('  ID:', apiUser.id);
      this.logger.log('  API Key:', apiKey);

      // Create USDC contract on Ethereum mainnet
      const usdcContract = new Contract({
        name: 'USD Coin',
        symbol: 'USDC',
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chains: [1],
        decimals: 6,
        active: true,
      });

      const contract = await this.contractRepo.create(usdcContract);

      this.logger.log('✓ USDC contract created');
      this.logger.log('  Address:', usdcContract.address);
      this.logger.log('  Chains:', usdcContract.chains);

      // Create wallet subscriptions (wallets to monitor)
      const walletsToMonitor = [
        '0xcBc7A8589F3d3A4fD1B9c5d131546030165CfADF',
        '0x078988145E930B7d58cf61e60Be5b36710e29961', // From address in test
        '0x7Ff8bbf9C8AB106db589e7863fb100525F61CCe5', // To address in test
      ];

      this.logger.log('✓ Creating wallet subscriptions...');
      for (const walletAddress of walletsToMonitor) {
        const ws = new WalletSubscription({
          wallet_address: walletAddress.toLowerCase(),
          chain_id: 1,
          active: true,
          notify_on_receive: true,
          notify_on_send: true,
          min_amount: BigInt(0),
        });

        await this.walletSubscriptionRepo.upsert(ws);
        this.logger.log(`  ✓ Watching: ${walletAddress}`);
      }

      // const t = new Transfer({
      //   tx_hash:
      //     '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      //   log_index: 1,
      //   chain_id: 1,
      //   block_number: 1n,
      //   block_hash:
      //     '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      //   timestamp: new Date(),
      //   from_address: '0x078988145E930B7d58cf61e60Be5b36710e29961',
      //   to_address: '0x7Ff8bbf9C8AB106db589e7863fb100525F61CCe5',
      //   amount: 1000000n, // 1 USDC (6 decimals)
      //   contract_id: contract.id, // Reference the actual USDC contract
      //   contract_address: contract.address,
      //   status: 1,
      //   is_confirmed: false,
      //   confirmations: 0,
      // });

      // await this.transferRepo.upsert(t);

      this.logger.log('');
      this.logger.log('═══════════════════════════════════════');
      this.logger.log('Database seeding completed successfully!');
      this.logger.log('═══════════════════════════════════════');
      this.logger.log('');
      this.logger.log('🔑 API Key (save this for authentication):');
      this.logger.log(`   ${apiKey}`);
      this.logger.log('');
      this.logger.log('📊 Contract:');
      this.logger.log(`   USDC: ${usdcContract.address}`);
      this.logger.log('');
      this.logger.log(`👁️  Monitoring ${walletsToMonitor.length} wallets`);
      this.logger.log('');
    } catch (error) {
      this.logger.error('Error seeding database:', error);
      throw error;
    }
  }
}
