import { Controller, Get, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { Public } from '@/common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('users')
@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get('generate-key')
  @ApiOperation({ summary: 'Generate a new API key' })
  @ApiResponse({ status: 200, description: 'API key generated successfully' })
  @ApiQuery({
    name: 'role',
    required: false,
    description: 'User role (default: user)',
  })
  async generateApiKey() {
    const user = await this.usersService.generateApiKey();

    return {
      success: true,
      data: {
        id: user.id,
        api_key: user.api_key,
        created_at: user.created_at,
      },
      message: 'API key generated successfully. Store it securely!',
    };
  }
}
