import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersRepository } from '@/database/prisma/repositories';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * API Key Authentication Guard
 * Validates API keys for indexer management endpoints
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    try {
      // Validate API key against database
      const user = await this.usersRepository.findApiKey(apiKey);

      if (!user) {
        throw new UnauthorizedException('Invalid API key');
      }

      // Attach user to request
      request.user = user;

      return true;
    } catch (error) {
      this.logger.error('API key validation failed', error);
      throw new UnauthorizedException('Invalid API key');
    }
  }

  private extractApiKey(request: any): string | undefined {
    // Check header: Authorization: Bearer <api_key>
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check header: X-API-Key: <api_key>
    const apiKeyHeader = request.headers['x-api-key'];
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    // Check query param: ?apiKey=<api_key>
    const apiKeyQuery = request.query.apiKey;
    if (apiKeyQuery) {
      return apiKeyQuery;
    }

    return undefined;
  }
}
