import { BaseModel, IBaseModel } from './base.model';
import { Prisma } from '@prisma/client';
import { ToDatabase, ToResponse } from '@/common/types';
import { UserResponse } from '@/common/response/user.response';
// import { OAuthProviderKey } from '@/modules/auth/auth.types';

export class User
  extends BaseModel<User, IUser, 'Users', 'string'>
  implements IUser
{
  declare id?: string;
  declare api_key?: string;
  // declare role?: string;
  declare updated_at?: Date;

  /**
   * Deafult response for class User
   */
  static defaultResponseClass() {
    return UserResponse;
  }
}

// Keep track of whats in the database
Prisma.UsersScalarFieldEnum;

export interface IUser extends IBaseModel<'string'> {
  id?: string;
  api_key?: string;
  // role?: string;
  updated_at?: Date;
}

export type IUserDatabase = ToDatabase<IUser>;
export type IUserResponse = ToResponse<IUser>;
