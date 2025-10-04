import { Prisma } from '@prisma/client';

export type ModelName = Prisma.ModelName;
export type ModelMeta = Prisma.TypeMap['meta']['modelProps'];
export type TypeMapModel = Prisma.TypeMap['model'];

export type Actions = Prisma.PrismaAction;
export type TypeMapConcreteModel<T extends ModelName> = TypeMapModel[T];
export type TypeMapConcreteModelOperations<
  T extends ModelName,
  K extends Prisma.PrismaAction,
> = K extends keyof TypeMapConcreteModel<T>['operations']
  ? TypeMapConcreteModel<T>['operations'][K]
  : never;

export type OmitData<T> = Omit<T, 'data'>;
