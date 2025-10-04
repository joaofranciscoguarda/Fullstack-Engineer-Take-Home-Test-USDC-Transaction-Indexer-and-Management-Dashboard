import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// This will prevent any crashes when doing a bigint .toString() calls, on JSON.stringify for example
import '@/common/helpers/bigInt/globalBigIntStringSerializer';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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
    SwaggerModule.setup('api', app, document);
  }

  await app.listen(process.env.FORWARD_APP_PORT ?? 8080);
}
bootstrap();
