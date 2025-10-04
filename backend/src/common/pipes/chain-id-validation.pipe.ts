import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { SUPPORTED_VIEM_CHAINS, SupportedChains } from '@/modules/blockchain';

/**
 * Validation pipe for chain ID parameters
 * Validates that the provided chain ID is one of the supported chains
 */
@Injectable()
export class ChainIdValidationPipe implements PipeTransform {
  transform(value: string, metadata: ArgumentMetadata): SupportedChains {
    if (!value) {
      throw new BadRequestException('Chain ID is required');
    }

    const chainId = parseInt(value, 10);

    if (isNaN(chainId)) {
      throw new BadRequestException('Chain ID must be a valid number');
    }

    const supportedChainIds = SUPPORTED_VIEM_CHAINS.map((chain) => chain.id);

    if (!supportedChainIds.includes(chainId as any)) {
      const supportedChains = supportedChainIds.join(', ');
      throw new BadRequestException(
        `Unsupported chain ID: ${chainId}. Supported chains: ${supportedChains}`,
      );
    }

    return chainId as SupportedChains;
  }
}

/**
 * Optional chain ID validation pipe
 * Similar to ChainIdValidationPipe but allows undefined/null values
 */
@Injectable()
export class OptionalChainIdValidationPipe implements PipeTransform {
  transform(
    value: string | undefined,
    metadata: ArgumentMetadata,
  ): SupportedChains | undefined {
    if (!value) {
      return undefined;
    }

    const chainId = parseInt(value, 10);

    if (isNaN(chainId)) {
      throw new BadRequestException('Chain ID must be a valid number');
    }

    const supportedChainIds = SUPPORTED_VIEM_CHAINS.map((chain) => chain.id);

    if (!supportedChainIds.includes(chainId as any)) {
      const supportedChains = supportedChainIds.join(', ');
      throw new BadRequestException(
        `Unsupported chain ID: ${chainId}. Supported chains: ${supportedChains}`,
      );
    }

    return chainId as SupportedChains;
  }
}
