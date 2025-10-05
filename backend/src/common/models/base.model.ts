import {
  ForeignKeyTupple,
  FromDatabase,
  TConstructorType,
  ToDatabase,
  ToResponse,
} from '../types/utils.models';
import { BaseRepository } from '@/database/prisma/repositories/base.repository';
import { ModelName, OmitData, TypeMapConcreteModelOperations } from '../types';
import { serialize, deserialize, BigIntPrefix } from '../helpers/bigInt';
import { ModelResponse } from '@/common/response/model.response';
import _ from 'lodash';

// Primary key type definitions
export type PrimaryKeyType = 'number' | 'string';

// Base interface without any primary key - models will extend this
export interface IBaseModelCore {
  created_at?: Date;
}

// Type-safe base model interface with a single configurable primary key
export interface IBaseModel<TPrimaryKeyType extends PrimaryKeyType = 'number'>
  extends IBaseModelCore {
  // The primary key field - can be named anything but must match the type
  // This is just a marker interface - the actual primary key field is defined in the concrete models
}

export type AnyBaseModel = BaseModel<any, any, ModelName, PrimaryKeyType>;

// For transformers and services that work with any model
export type BaseModelInstance = AnyBaseModel;

/**
 * This abstract class aims to provide a base for all models in the system.
 * Now with support for a single configurable primary key (number or string).
 *
 * @template TypeClass Tipo da classe que está herdando de BaseModel.
 * @template TypeInterface Type of the interface that represents the model.
 * @template ConcreteModelName Name of the concrete model for Prisma operations.
 * @template TPrimaryKeyType Type of the primary key ('number' or 'string').
 *
 * @example
 * ```typescript
 * // Model with default numeric ID
 * export class User extends BaseModel<User, IUser, 'Users', 'number'> {
 *   static primaryKeyName() {
 *     return 'id'; // Default, can be omitted
 *   }
 * }
 *
 * // Model with UUID primary key
 * export class Product extends BaseModel<Product, IProduct, 'Products', 'string'> {
 *   uuid: string;
 *
 *   static primaryKeyName() {
 *     return 'uuid';
 *   }
 * }
 *
 * // Model with custom named primary key
 * export class Order extends BaseModel<Order, IOrder, 'Orders', 'string'> {
 *   order_key: string;
 *
 *   static primaryKeyName() {
 *     return 'order_key';
 *   }
 * }
 * ```
 *
 * @class BaseModel
 */
export abstract class BaseModel<
  TypeClass extends IBaseModel<TPrimaryKeyType>,
  TypeInterface extends IBaseModel<TPrimaryKeyType>,
  ConcreteModelName extends ModelName,
  TPrimaryKeyType extends PrimaryKeyType = 'number',
> implements IBaseModel<TPrimaryKeyType>
{
  // Common properties to all instances
  created_at?: Date;

  // Static properties
  static readonly DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ssZ';

  // Internal properties not enumerable
  protected _repository?: BaseRepository<any, ModelName>;
  protected _originalData?: Partial<TypeInterface>;
  protected _responseClass?: ModelResponse;

  constructor(
    data: Partial<TypeInterface>,
    _repository?: BaseRepository<any, ModelName>,
  ) {
    this._originalData = data;

    this.fill(data);

    this.setRepository(_repository);

    // Make _originalData property non-enumerable to prevent serialization
    Object.defineProperty(this, '_originalData', {
      enumerable: false,
      writable: true,
    });
  }

  /**
   * Get the primary key value of this instance
   */
  getPrimaryKey(): TPrimaryKeyType extends 'number' ? number : string {
    const primaryKeyName = (
      this.constructor as typeof BaseModel
    ).primaryKeyName();
    return this[primaryKeyName] as TPrimaryKeyType extends 'number'
      ? number
      : string;
  }

  /**
   * Check if this instance has a primary key value
   */
  hasPrimaryKey(): boolean {
    const primaryKeyName = (
      this.constructor as typeof BaseModel
    ).primaryKeyName();
    return this[primaryKeyName] !== undefined && this[primaryKeyName] !== null;
  }

  setRepository(_repository?: BaseRepository<BaseModelInstance, ModelName>) {
    this._repository = _repository;

    // Define the _repository property as non-enumerable to not be serialized in objects
    Object.defineProperty(this, '_repository', {
      enumerable: false,
      writable: true,
    });
  }

  setResponseClass(responseClass: any) {
    this._responseClass = responseClass;

    // Define the _responseClass property as non-enumerable to not be serialized in objects
    Object.defineProperty(this, '_responseClass', {
      enumerable: false,
      writable: true,
    });
  }

  isPersisted() {
    return this.hasPrimaryKey() && !!this.created_at;
  }

  /**
   * Automatically fills the model with data.
   * Now simplified - no need to override in child classes unless you have special logic.
   * Automatically fills all properties from data, skipping internal properties.
   */
  fill(data: Partial<TypeInterface>) {
    // Fill all properties from data
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        // Skip internal properties (those starting with _)
        if (!key.startsWith('_')) {
          (this as any)[key] = data[key];
        } else {
        }
      }
    }
  }

  /**
   * @deprecated Use fill() directly. This method is kept for backward compatibility.
   * fillProperty is no longer needed - fill() now handles everything automatically.
   */
  protected fillProperty<T extends keyof this>(
    data: Partial<Record<T, this[T]>>,
    field: T,
    defaultValue?: this[T],
  ): void {
    const value =
      data[field] !== undefined
        ? data[field]
        : this[field] !== undefined
          ? this[field]
          : defaultValue;
    if (value !== undefined) this[field] = value;
  }

  toJson() {
    return JSON.stringify(this.toResponse());
  }

  toString() {
    return this.toJson();
  }

  /**
   * Return a object with the properties of the model
   * without data type treatments.
   *
   * @returns {TypeInterface} Object with the properties of the model.
   */
  toObject(): TypeInterface {
    const ret: Record<string, unknown> = {};

    for (const key in this) {
      if (this.hasOwnProperty(key)) {
        // Skip internal properties (those starting with _)
        if (!key.startsWith('_')) {
          ret[key] = this[key];
        }
      }
    }

    return ret as TypeInterface;
  }

  /**
   * Return a object with the properties of the model
   * with treatments specific to responses.
   * Automatically detects Date and BigInt fields for conversion.
   *
   * @param responseClass - The response class to use.
   * @returns {object} Object with the properties of the model
   * with treatments specific to responses.
   * with treatments specific to responses.
   */
  toResponse(responseClass?: ModelResponse) {
    // Get the response class to use
    const ResponseClass =
      responseClass ||
      (this.constructor as typeof BaseModel).defaultResponseClass?.();

    if (ResponseClass) {
      // Use the response class to filter and format the data
      return new ResponseClass(this);
    }

    // Fallback para serialização básica
    const thisAsObj: object = this.toObject();

    // Auto-detect and convert dates and bigints
    for (const key in thisAsObj) {
      if (thisAsObj.hasOwnProperty(key)) {
        const value = thisAsObj[key];

        // Convert Date objects to ISO strings
        if (value instanceof Date) {
          thisAsObj[key] = value.toISOString();
        }
        // Convert BigInt to string
        else if (typeof value === 'bigint') {
          thisAsObj[key] = value.toString();
        }
      }
    }

    return thisAsObj as ToResponse<TypeInterface>;
  }

  /**
   * Return a object with the foreign keys of the model
   * to facilitate the creation of related objects already created, so it uses connect.
   * @returns {{ [relation: string]: { connect: { [foreignKey: string]: modelProperty = any } } }
   */
  toForeignKeys() {
    const foreign = (this.constructor as typeof BaseModel).foreignKeys();

    const data = {};

    const relation = 0;
    const modelProperty = 1;
    const foreignKey = 2;

    for (let i = 0; i < foreign.length; i++) {
      if (this[foreign[i][modelProperty]]) {
        data[foreign[i][relation]] = {
          connect: {
            [foreign[i][foreignKey]]: this[foreign[i][modelProperty]],
          },
        };
      }
    }

    return data as {
      [relation: string]: { connect: { [foreignKey: string]: any } };
    };
  }

  /**
   * Return a object with the properties of the model
   * removing unnecessary properties for the database.
   * Return a object with the properties of the model
   */
  omitModelPropertiesForDatabase(obj: object = this.toObject()) {
    const filteredObj = this.omitForeignKeys(obj);

    return filteredObj;
  }

  /**
   * Return a object with the properties of the model
   * removing unnecessary properties for the database.
   */
  omitForeignKeys(obj: object = this.toObject()) {
    // Remove foreign keys o, they will cause errors
    (this.constructor as typeof BaseModel)
      .foreignKeys()
      .forEach((foreignKey) => {
        delete obj[foreignKey[1]];
      });

    return obj as ToResponse<TypeInterface>;
  }

  /**
   * Return a object with the properties of the model
   * with treatments of Date -> ISO String for the database.
   * Auto-detects Date fields.
   */
  toDatabaseDate(obj: object = this.toObject()) {
    // Auto-detect and convert dates
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (value instanceof Date) {
          obj[key] = value.toISOString();
        }
      }
    }

    return obj as ToResponse<TypeInterface>;
  }

  /**
   * Return a object with the properties of the model
   * with treatments of BigInt -> Serialized String for the database.
   * Auto-detects BigInt fields.
   */
  toDatabaseBigInt(obj: object = this.toObject()) {
    // Auto-detect and serialize BigInt values
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (typeof value === 'bigint') {
          obj[key] = serialize(value);
        }
      }
    }

    return obj as ToResponse<TypeInterface>;
  }

  /**
   * Return a object with the properties of the model
   * with treatments specific to the database.
   */
  toDatabase() {
    const foreignKeysData = this.toForeignKeys();
    let thisAsObj: object = this.omitModelPropertiesForDatabase();
    thisAsObj = this.toDatabaseDate(thisAsObj);
    // BigInt handled natively by Prisma, no need to serialize

    thisAsObj = { ...thisAsObj, ...foreignKeysData };
    return thisAsObj as ToDatabase<TypeInterface>;
  }

  clone() {
    return new (this.constructor as unknown as TConstructorType<TypeClass>)(
      this.toObject(),
    );
  }

  /**
   * Hydrate an array of objects into an array of instances of the class.
   *
   * @param dataArray Array of objects to be hydrated.
   * @returns {T|T[]} Array of instances of the class.
   */
  // static hydrate<T>(
  //   dataArray: Partial<FromDatabase<T>> | Partial<FromDatabase<T>>[],
  // ): T | T[] {
  //   return Array.isArray(dataArray)
  //     ? this.hydrateMany<T>(dataArray)
  //     : this.hydrateOne<T>(dataArray);
  // }

  /**
   * Hydrate an array of objects into an array of instances of the class.
   *
   * @param dataArray Array of objects to be hydrated.
   * @returns {T[]} Array of instances of the class.
   */
  static hydrateMany<T>(dataArray: Partial<FromDatabase<T>>[]): T[] {
    return dataArray.map((data) => this.hydrate(data));
  }

  /**
   * Hydrate an object into an instance of the class.
   *
   * @param data Object to be hydrated.
   * @returns {T} Instance of the class.
   */
  static hydrate<T>(data: Partial<FromDatabase<T>>): T {
    this.toHydrateDate(data);
    this.toHydrateArrays(data, this);
    // BigInt handled natively by Prisma, no need to deserialize

    const childConstructor = this as unknown as TConstructorType<T>;
    const instance = new childConstructor(data);

    // Emit hydrated event if event emitter is available
    // Note: This will be set by the ModelFactory
    return instance;
  }

  /**
   * Auto-detects and deserializes BigInt fields from database.
   * Looks for strings starting with BigIntPrefix (#bi.)
   */
  static toHydrateBigInt(obj) {
    // Auto-detect and deserialize BigInt values
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (typeof value === 'string' && value.startsWith(BigIntPrefix)) {
          obj[key] = deserialize(value);
        }
      }
    }

    return obj;
  }

  /**
   * Auto-detects and converts date strings to Date objects.
   * Handles ISO date strings and Date objects.
   */
  static toHydrateDate(obj) {
    // Auto-detect and convert date strings to Date objects
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        // Check if it's a date string (ISO format) or already a Date
        if (value && typeof value === 'string') {
          // Try to parse as date if it looks like an ISO date string
          const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
          if (dateRegex.test(value)) {
            const parsed = new Date(value);
            // Only convert if it's a valid date
            if (!isNaN(parsed.getTime())) {
              obj[key] = parsed;
            }
          }
        }
      }
    }

    return obj;
  }

  /**
   * Auto-detects and ensures array fields are properly deserialized.
   * Handles cases where arrays might come as strings or other formats from the database.
   */
  static toHydrateArrays(obj, modelClass?: any) {
    // Get the array fields from the model class
    const arrayFields = modelClass?.getArrayFields?.() || [];

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const isArrayField = arrayFields.includes(key);

        // If the value is a string that looks like a JSON array, parse it
        if (
          typeof value === 'string' &&
          value.startsWith('[') &&
          value.endsWith(']')
        ) {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              obj[key] = parsed;
            }
          } catch (e) {
            // If parsing fails, leave the value as is
          }
        }
        // If the value is not an array but should be (based on model's array field definition)
        else if (!Array.isArray(value) && isArrayField) {
          // Convert single values to arrays
          obj[key] = [value];
        }
        // If the value is already an array but the field is not supposed to be an array, unwrap it
        else if (Array.isArray(value) && !isArrayField && value.length === 1) {
          obj[key] = value[0];
        }
      }
    }

    return obj;
  }

  // Overwritable methods

  /**
   * Define the name of the primary key of this model.
   * Override this method in child classes to specify the name of the primary key.
   *
   * @example
   * ```typescript
   * export class MyModel extends BaseModel<MyModel, IMyModel, 'MyModels', 'string'> {
   *   static primaryKeyName() {
   *     return 'uuid' as const;
   *   }
   * }
   * ```
   *
   * @returns {string} Name of the primary key (ex: 'id', 'uuid', 'ulid', 'key', etc.).
   */
  static primaryKeyName(): string {
    return 'id';
  }

  /**
   * Define which properties of the model are foreign keys. To be used in the toForeignKeys() function.
   *
   * @returns {[Relation, ModelProperty, ForeignKey][]} Array with tuples with the names of the properties that are foreign keys.
   * @example item  Items  @relation(fields: [item_id], references: [id]) in the schema
   * needs to be representes this way is [[item, item_id, id]]]
   */
  static foreignKeys(): ForeignKeyTupple[] {
    return [];
  }

  /**
   * Define the default response class for this model.
   * Override this method in child classes to specify the response class.
   *
   * @returns {any} Default response class
   */
  static defaultResponseClass(): any {
    return null;
  }

  /**
   * Define which fields are arrays for proper hydration.
   * Override this method in child classes to specify array fields.
   *
   * @returns {string[]} Array of field names that should be treated as arrays
   */
  static getArrayFields(): string[] {
    return [];
  }

  /**
   * Define the unique constraint fields for this model.
   * Override this method in child classes to specify unique constraint fields.
   * Used by repository methods (upsert, update) when primary key is not available.
   *
   * @example
   * ```typescript
   * export class Transfer extends BaseModel<Transfer, ITransfer, 'Transfers', 'string'> {
   *   static getUniqueConstraintFields() {
   *     return ['tx_hash', 'log_index', 'chain_id'] as const;
   *   }
   * }
   * ```
   *
   * @returns {readonly string[]} Array of field names that form the unique constraint
   */
  static getUniqueConstraintFields(): readonly string[] {
    return [];
  }

  /**
   * Define the unique constraint name for this model.
   * Override this method in child classes to specify the Prisma constraint name.
   * If not provided, will auto-generate based on field names (e.g., "unique_field1_field2").
   *
   * @example
   * ```typescript
   * export class Transfer extends BaseModel<Transfer, ITransfer, 'Transfers', 'string'> {
   *   static getUniqueConstraintName() {
   *     return 'unique_transfer'; // Matches the name in Prisma schema
   *   }
   * }
   * ```
   *
   * @returns {string | null} The unique constraint name or null if no constraint
   */
  static getUniqueConstraintName(): string | null {
    const fields = this.getUniqueConstraintFields();
    if (fields.length === 0) {
      return null;
    }
    // Auto-generate name: unique_field1_field2_field3
    return `${fields.join('_')}`;
  }

  /**
   * Get the unique constraint values from this instance.
   * Returns an object properly formatted for Prisma's where clause.
   *
   * For models with named unique constraints in Prisma schema:
   * ```
   * { unique_transfer: { tx_hash: "...", log_index: 35, chain_id: 1 } }
   * ```
   *
   * @returns {Record<string, any> | null} Object with unique constraint for Prisma where clause or null if not available
   */
  getUniqueConstraintValues(): Record<string, any> | null {
    const fields = (
      this.constructor as typeof BaseModel
    ).getUniqueConstraintFields();
    const constraintName = (
      this.constructor as typeof BaseModel
    ).getUniqueConstraintName();

    if (fields.length === 0 || !constraintName) {
      return null;
    }

    const values: Record<string, any> = {};

    for (const field of fields) {
      const value = this[field];
      if (value === undefined || value === null) {
        // If any field is missing, we can't use the unique constraint
        return null;
      }
      values[field] = value;
    }

    // Return in Prisma's expected format: { constraintName: { field1: value1, ... } }
    return {
      [constraintName]: values,
    };
  }

  // Repository methods

  /**
   * Create a record of the model in the database using the repository.
   * Attention: for the repository to work, it is necessary to inject it into the model from the ModelFactory.
   *
   * @throws {MissingFactoryError} Se o repository não estiver injetado na model.
   * @param args
   * @returns {BaseModel<TypeClass, TypeInterface>}
   */
  async create(
    args?: TypeMapConcreteModelOperations<ConcreteModelName, 'create'>['args'],
  ) {
    if (!this._repository) {
      throw this._makeRepositoryError();
    }

    const createdModel = await this._repository.create(this as any, args);
    this.fill(createdModel.toObject());

    return this;
  }

  /**
   * Update a record of the model in the database using the repository.
   * Attention: for the repository to work, it is necessary to inject it into the model from the ModelFactory.
   *
   * @throws {MissingFactoryError} If the repository is not injected into the model.
   * @param args
   * @returns {BaseModel<TypeClass, TypeInterface>}
   */
  async update(
    args?: OmitData<
      TypeMapConcreteModelOperations<ConcreteModelName, 'update'>['args']
    >,
  ) {
    if (!this._repository) {
      throw this._makeRepositoryError();
    }

    const originalData = this.toObject();
    const changes = this._getChanges(originalData);

    const updatedModel = await this._repository.update(this as any, args);
    this.fill(updatedModel.toObject());

    return this;
  }

  /**
   * Remove a record of the model in the database using the repository.
   * Attention: for the repository to work, it is necessary to inject it into the model from the ModelFactory.
   *
   * @throws {MissingFactoryError} If the repository is not injected into the model.
   * @param args
   * @returns {BaseModel<TypeClass, TypeInterface>}
   */
  async delete(
    args?: OmitData<
      TypeMapConcreteModelOperations<ConcreteModelName, 'delete'>['args']
    >,
  ) {
    if (!this._repository) {
      throw this._makeRepositoryError();
    }

    // @ts-ignore
    await this._repository.delete(this.getPrimaryKey(), args);

    return;
  }

  /**
   * Get changes between original data and current data
   */
  private _getChanges(currentData: any): any {
    if (!this._originalData) return currentData;

    const changes: any = {};

    for (const key in currentData) {
      if (currentData[key] !== this._originalData[key]) {
        changes[key] = currentData[key];
      }
    }

    return changes;
  }

  /**
   * Create a MissingFactoryError instance.
   *
   * @returns {MissingFactoryError}
   */
  private _makeRepositoryError() {
    return new MissingFactoryError(
      'Repository was not injected into model. To fix this, use the ModelFactory.',
    );
  }
}

class MissingFactoryError extends Error {}

// Useful class for typings that need a non-abstract BaseModel
export class ConcreteBaseModel extends BaseModel<
  IBaseModel,
  IBaseModel,
  ModelName,
  'number'
> {
  constructor(data: any) {
    super(data);
    throw new Error('ConcreteBaseModel is not meant to be instantiated.');
  }
}
