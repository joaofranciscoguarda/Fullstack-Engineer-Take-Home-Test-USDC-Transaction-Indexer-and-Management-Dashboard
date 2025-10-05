import { NestFactory } from '@nestjs/core';
import { SeedService } from './seed.service';
import { DatabaseModule } from '@/database/database.module';

async function runSeed() {
  const app = await NestFactory.createApplicationContext(DatabaseModule);
  const seedService = app.get(SeedService);

  try {
    await seedService.seed();
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runSeed();
