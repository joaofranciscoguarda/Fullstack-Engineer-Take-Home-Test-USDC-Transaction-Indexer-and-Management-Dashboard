import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// This will prevent any crashes when doing a bigint .toString() calls, on JSON.stringify for example
import '@/common/helpers/bigInt/globalBigIntStringSerializer';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configure Express v5 query parser for backward compatibility
  app.set('query parser', 'extended');

  // prepareErrorHandlingApp(app, process.env.ERROR_PROVIDER as ErrorProvider);

  // app.enableVersioning({
  //   type: VersioningType.URI,

  // });

  // app.use(cookieParser());

  // Enable automatic DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      enableDebugMessages: process.env.NODE_ENV == 'development',
    }),
  );

  // CORS settings
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || [],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: '*',
  });

  // Swagger settings (active only local and staging)
  if (process.env.NODE_ENV != 'production') {
    const config = new DocumentBuilder()
      .setTitle('USDC Routes')
      .setDescription('Routes for USDC API')
      .setVersion('1.0')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  await app.listen(process.env.FORWARD_APP_PORT ?? 8080);

  logger.log(
    `Application is running on: http://localhost:${process.env.FORWARD_APP_PORT ?? 8080}`,
  );
}

// Store app instance for graceful shutdown
let app: NestExpressApplication;

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  logger.log(`Received ${signal}. Starting graceful shutdown...`);

  if (!app) {
    logger.log('No app instance found, exiting immediately.');
    process.exit(0);
  }

  try {
    // Give the application time to finish current operations
    const shutdownTimeout = parseInt(
      process.env.SHUTDOWN_TIMEOUT || '30000',
      10,
    ); // 30 seconds default

    logger.log(`Waiting up to ${shutdownTimeout}ms for graceful shutdown...`);

    // Set up a timeout to force exit if graceful shutdown takes too long
    const forceExitTimeout = setTimeout(() => {
      logger.warn('Graceful shutdown timeout reached. Forcing exit.');
      process.exit(1);
    }, shutdownTimeout);

    // Close the application gracefully
    await app.close();

    // Clear the timeout since we shut down successfully
    clearTimeout(forceExitTimeout);

    logger.log('Graceful shutdown completed successfully.');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

bootstrap().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});
