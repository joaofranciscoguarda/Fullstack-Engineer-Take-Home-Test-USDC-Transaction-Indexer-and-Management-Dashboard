import { IsString, IsInt, IsArray, Min, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { SupportedChains } from '@/modules/blockchain';

export class CreateContractDto {
  @IsString()
  name: string;

  @IsString()
  symbol: string;

  @IsString()
  address: string;

  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  chains: SupportedChains[];

  @Type(() => Number)
  @IsInt()
  @Min(0)
  decimals: number;
}
