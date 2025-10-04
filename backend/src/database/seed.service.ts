import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async seed(): Promise<void> {
    this.logger.log('Starting database seeding...');

    try {
      // Create a user with API key
      const apiKey = randomBytes(32).toString('hex');
      const user = await this.prisma.users.upsert({
        where: { api_key: apiKey },
        update: {},
        create: {
          api_key: apiKey,
        },
      });

      this.logger.log('User created with API key:', apiKey);
      this.logger.log('User ID:', user.id);

      // Create another user with the wallet address as API key
      const walletApiKey = '0xcBc7A8589F3d3A4fD1B9c5d131546030165CfADF';
      const walletUser = await this.prisma.users.upsert({
        where: { api_key: walletApiKey },
        update: {},
        create: {
          api_key: walletApiKey,
        },
      });

      this.logger.log('Wallet user created with API key:', walletApiKey);
      this.logger.log('Wallet User ID:', walletUser.id);

      // Create USDC contract on Ethereum mainnet
      const usdcContract = await this.prisma.contracts.upsert({
        where: {
          unique_contract_address_chains: {
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            chains: [1],
          },
        },
        update: {
          active: true,
        },
        create: {
          name: 'USD Coin',
          symbol: 'USDC',
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          chains: [1],
          decimals: 6,
          active: true,
        },
      });

      this.logger.log('USDC contract created:', {
        id: usdcContract.id,
        name: usdcContract.name,
        symbol: usdcContract.symbol,
        address: usdcContract.address,
        chains: usdcContract.chains,
      });

      this.logger.log('Database seeding completed successfully!');
      this.logger.log('=== Important Information ===');
      this.logger.log('API Key:', apiKey);
      this.logger.log('Wallet API Key:', walletApiKey);
      this.logger.log('USDC Contract Address:', usdcContract.address);
      this.logger.log('USDC Contract ID:', usdcContract.id);
      this.logger.log('Save the API key for authentication!');

    } catch (error) {
      this.logger.error('Error seeding database:', error);
      throw error;
    }
  }
}
