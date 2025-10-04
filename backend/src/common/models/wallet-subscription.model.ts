import { BaseModel, IBaseModel } from '@/common/models/base.model';
import { WalletSubscriptionResponse } from '@/common/response/wallet-subscription.response';
import { ToDatabase, ToResponse } from '@/common/types';

export class WalletSubscription
  extends BaseModel<
    WalletSubscription,
    IWalletSubscription,
    'WalletSubscriptions',
    'string'
  >
  implements IWalletSubscription
{
  declare id?: string;
  declare wallet_address: string;
  declare chain_id: number;
  declare active: boolean;
  declare notify_on_receive: boolean;
  declare notify_on_send: boolean;
  declare min_amount: bigint;
  declare updated_at?: Date;

  /**
   * Define default response class for WalletSubscription
   */
  static defaultResponseClass() {
    return WalletSubscriptionResponse;
  }

  static getUniqueConstraintFields() {
    return ['wallet_address', 'chain_id'] as const;
  }

  static getUniqueConstraintName() {
    return 'unique_subscription';
  }
}

export interface IWalletSubscription extends IBaseModel<'string'> {
  id?: string;
  wallet_address: string;
  chain_id: number;
  active: boolean;
  notify_on_receive: boolean;
  notify_on_send: boolean;
  min_amount: bigint;
  updated_at?: Date;
}

export type IWalletSubscriptionDatabase = ToDatabase<IWalletSubscription>;
export type IWalletSubscriptionResponse = ToResponse<IWalletSubscription>;
