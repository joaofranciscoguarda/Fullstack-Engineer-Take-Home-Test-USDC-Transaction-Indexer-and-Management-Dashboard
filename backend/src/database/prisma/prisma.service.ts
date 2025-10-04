import { Mutable } from '@/common/types/utils.models';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import _ from 'lodash';

const prismaConfig = {
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'stdout',
      level: 'error',
    },
    {
      emit: 'stdout',
      level: 'info',
    },
    {
      emit: 'stdout',
      level: 'warn',
    },
  ],
} as const;

// Hack para permitir a mutabilidade do objeto de configuração
type MutableConfig = Mutable<typeof prismaConfig>;
const mutableConfig: MutableConfig = { ...prismaConfig } as MutableConfig;

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const professionals = await prisma.professionals.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
@Injectable()
export class PrismaService
  extends PrismaClient<MutableConfig>
  implements OnModuleInit
{
  private _logger = new Logger(PrismaService.name);

  /**
   * Tempo de execução de uma query que, se for maior ou igual a esse valor, será logada como warning
   */
  private static readonly WARNING_THRESHOLD = 1000;

  constructor() {
    super(mutableConfig);
  }

  async onModuleInit() {
    await this.$connect();
    this.$on('query', this.onQuery.bind(this));
  }

  async onQuery(event: Prisma.QueryEvent) {
    // Logar apenas queries que demoraram mais que o threshold
    const logLevel =
      event.duration >= PrismaService.WARNING_THRESHOLD ? 'warn' : 'debug';

    // Para não poluir o log com TODAS as queries de debug
    const isDebugEnabled = process.env.DB_DEBUG_SQL === 'true';
    if (!isDebugEnabled && logLevel === 'debug') {
      return;
    }

    // Omitir os campos que não são relevantes para o log
    const logContext = _.omit(event, ['timestamp', 'target']);
    this._logger[logLevel]('Query', {
      ...logContext,
      duration: `${logContext.duration} ms`,
    });
  }
}
