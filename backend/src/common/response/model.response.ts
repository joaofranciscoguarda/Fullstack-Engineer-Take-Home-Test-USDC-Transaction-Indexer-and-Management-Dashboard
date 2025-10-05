import { ApiProperty } from '@nestjs/swagger';
import { type PaginationMetadata } from '@/common/types';

/**
 * Base class for single model responses
 */
export abstract class ModelResponse {
  @ApiProperty({ example: true, description: 'Success status' })
  success: boolean;

  @ApiProperty({ example: 'Resource retrieved successfully' })
  message: string;

  @ApiProperty({ description: 'Response data' })
  data: any;

  constructor(data: any, message?: string) {
    this.success = true;
    this.data = data;
    this.message = message || this.getDefaultMessage();
  }

  protected abstract getDefaultMessage(): string;
}

/**
 * Base class for list/paginated model responses
 */
export abstract class ModelResponseList {
  @ApiProperty({ example: true, description: 'Success status' })
  success: boolean;

  @ApiProperty({ example: 'Resources retrieved successfully' })
  message: string;

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      total: 100,
      page: 1,
      pageSize: 10,
      totalPages: 10,
    },
  })
  pagination: PaginationMetadata;

  @ApiProperty({ description: 'Response data array' })
  data: any[];

  constructor(
    data: any[],
    paginationMetadata: PaginationMetadata,
    message?: string,
  ) {
    this.success = true;
    this.data = data;
    this.pagination = paginationMetadata;
    this.message = message || this.getDefaultMessage();
  }

  protected abstract getDefaultMessage(): string;
}
