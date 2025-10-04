import { SupportedChains } from '@/modules/blockchain';
import { Address, Hash } from 'viem';

// Tipo que representa o construtor de uma classe T
export type TConstructorType<T> = new (...args: any[]) => T;

export type ConstructorParameters<T> = T extends new (...args: infer U) => any
  ? U
  : never;
export type InstanceType<T> = T extends new (...args: any[]) => infer U
  ? U
  : never;
// export type TConstructorType<T> = T extends InstanceType<infer U> ? U : never;
export type ConstructorOf<C> = { new (...args: any[]): C };

export type Mutable<T> = {
  -readonly [K in keyof T]: Mutable<T[K]>;
};

// Modifica o tipo de todas as propriedades de uma interface T que sejam do tipo From para o tipo To
export type Replace<T, From, To> = {
  [K in keyof T]: T[K] extends From
    ? To
    : T[K] extends From | undefined
      ? To | undefined
      : T[K] extends From | undefined | null
        ? To | undefined | null
        : T[K];
};

// type ReplaceFDbBigInt<T> = Replace<T, bigint, string>;
type ReplaceFDbAddress<T> = Replace<T, Address, string>;
type ReplaceFDbHash<T> = Replace<T, Hash, string>;
type ReplaceFDbSupportedChains<T> = Replace<
  T,
  SupportedChains | SupportedChains[],
  number | number[]
>;
// type ReplaceFDbJson<T> = Replace<T, any, string>;

type ReplaceTResBigInt<T> = Replace<T, bigint, string>;
type ReplaceTResAddress<T> = Replace<T, Address, string>;
type ReplaceTResHash<T> = Replace<T, Hash, string>;

export type FromDatabase<T> = ReplaceFDbHash<
  ReplaceFDbAddress<ReplaceFDbSupportedChains<T>>
>;
export type ToResponse<T> = ReplaceTResHash<ReplaceTResAddress<T>>;
export type ToDatabase<T> = T;

type Relation = string;
type ForeignKey = string;
type ModelProperty = string;

/**
 * A tuple array representing relations between models.
 * Each tuple contains [Relation, ModelProperty, ForeignKey].
 */
export type ForeignKeyTupple = [Relation, ModelProperty, ForeignKey];
