import { type IWalletSubscriptionResponse } from '@/common/models/wallet-subscription.model';
import {
  ModelResponse,
  ModelResponseList,
} from '@/common/response/model.response';
import { PaginationMetadata } from '@/common/types';
import { ApiProperty } from '@nestjs/swagger';

export class WalletSubscriptionResponseClass {
  @ApiProperty({ example: '1', description: 'Model identifier' })
  id: string;

  @ApiProperty({ example: '0x1234567890', description: 'Wallet address' })
  wallet_address: string;

  @ApiProperty({ example: 1, description: 'Chain ID' })
  chain_id: number;

  @ApiProperty({ example: true, description: 'Active' })
  active: boolean;

  @ApiProperty({ example: true, description: 'Notify on receive' })
  notify_on_receive: boolean;

  @ApiProperty({ example: true, description: 'Notify on send' })
  notify_on_send: boolean;

  @ApiProperty({ example: '1000000000000000000n', description: 'Min amount' })
  min_amount: bigint;

  @ApiProperty({
    example: '2001-01-01 14:10:00',
    description: 'Date when the model was updated in the database',
  })
  updated_at?: string;

  @ApiProperty({
    example: '2001-01-01 14:10:00',
    description: 'Date when the model was created in the database',
  })
  created_at: string;
}

export class WalletSubscriptionResponse extends ModelResponse {
  @ApiProperty({
    description: 'Wallet subscription instance',
    type: WalletSubscriptionResponseClass,
    example: WalletSubscriptionResponseClass,
  })
  declare data: IWalletSubscriptionResponse;

  constructor(data: IWalletSubscriptionResponse, message?: string) {
    super(data, message);
  }

  protected getDefaultMessage(): string {
    return 'Wallet subscription retrieved successfully.';
  }
}

export class WalletSubscriptionResponseList extends ModelResponseList {
  @ApiProperty({
    description: 'List of wallet subscription instances',
    type: WalletSubscriptionResponseClass,
    example: WalletSubscriptionResponseClass,
    isArray: true,
  })
  declare data: IWalletSubscriptionResponse[];

  constructor(
    data: IWalletSubscriptionResponse[],
    paginationMetadata: PaginationMetadata,
    message?: string,
  ) {
    super(data, paginationMetadata, message);
  }

  protected getDefaultMessage(): string {
    return 'Wallet subscription retrieved successfully.';
  }
}
