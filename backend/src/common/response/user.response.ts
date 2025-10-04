import { ApiProperty } from '@nestjs/swagger';
import { type IUserResponse } from '@/common/models';
import { ModelResponse, ModelResponseList } from './model.response';
import { PaginationMetadata } from '@/common/types';

export class UserResponseClass {
  @ApiProperty({ example: '1', description: 'Model identifier' })
  id: number;

  @ApiProperty({
    example: '2001-01-01 14:10:00',
    description: 'Date when the model was created in the database',
  })
  created_at: string;

  @ApiProperty({
    example: '2001-01-01 14:10:00',
    description: 'Date when the user requested the registration',
    required: false,
  })
  updated_at?: string;
}

export class UserResponse extends ModelResponse {
  @ApiProperty({
    description: 'User instance',
    type: UserResponseClass,
    example: UserResponseClass,
  })
  declare data: IUserResponse;

  constructor(data: IUserResponse, message?: string) {
    super(data, message);
  }

  protected getDefaultMessage(): string {
    return 'User retrieved successfully.';
  }
}

export class UserResponseList extends ModelResponseList {
  @ApiProperty({
    description: 'List of user instances',
    type: UserResponseClass,
    example: UserResponseClass,
    isArray: true,
  })
  declare data: IUserResponse[];

  constructor(
    data: IUserResponse[],
    paginationMetadata: PaginationMetadata,
    message?: string,
  ) {
    super(data, paginationMetadata, message);
  }

  protected getDefaultMessage(): string {
    return 'Users retrieved successfully.';
  }
}
