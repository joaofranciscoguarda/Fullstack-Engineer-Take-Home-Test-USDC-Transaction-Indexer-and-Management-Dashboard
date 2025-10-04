import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  PaginatedData,
  ModelMeta,
  ModelName,
  OmitData,
  TypeMapConcreteModelOperations,
} from '@/common/types';
import { BaseModel, ConcreteBaseModel } from '@/common/models/base.model';
import { IBaseModel } from '@/common/models';
import { Prisma } from '@prisma/client';
// import { Prisma } from '@prisma/client';

// Interface for model classes with static methods
interface ModelClassWithStatics<T> {
  new (data: any): T;
  hydrateOne<T>(data: any): T;
  hydrateMany<T>(data: any[]): T[];
  primaryKeyName(): string;
}

@Injectable()
export abstract class BaseRepository<
  ConcreteModel extends BaseModel<any, any, ConcreteModelName, any>,
  ConcreteModelName extends ModelName,
> {
  constructor(
    protected prisma: PrismaService,
    private prismaKey: ConcreteModelName,
    private modelClass: ModelClassWithStatics<ConcreteModel>,
  ) {}

  getPrismaService() {
    const camelCase = (this.prismaKey.charAt(0).toLowerCase() +
      this.prismaKey.slice(1)) as ModelMeta;
    return this.prisma[camelCase];
  }

  /**
   * Helper method to build where clause with primary key
   */
  private buildPrimaryKeyWhere(model: ConcreteModel): Record<string, any> {
    const primaryKeyName = (model.constructor as any).primaryKeyName();
    return {
      [primaryKeyName]: model.getPrimaryKey(),
    };
  }

  /**
   * Helper method to get primary key name from model class
   */
  private getPrimaryKeyName(): string {
    return (this.modelClass as any).primaryKeyName();
  }

  async create(
    createdModel: ConcreteModel,
    args?: TypeMapConcreteModelOperations<ConcreteModelName, 'create'>['args'],
  ): Promise<ConcreteModel> {
    const databaseModel = createdModel.toDatabase();

    const arg = {
      data: {
        ...databaseModel,
      },
      ...args,
    };

    // @ts-ignore
    const model = await this.getPrismaService().create(arg);

    return this.modelClass.hydrateOne<ConcreteModel>(model);
  }

  async list(
    pageNumber: number,
    pageSize: number,
  ): Promise<PaginatedData<ConcreteModel>> {
    // @ts-ignore
    const count = await this.getPrismaService().count();
    const maxPageNumber = Math.ceil(count / pageSize);

    if (maxPageNumber < pageNumber && count != 0) {
      throw new BadRequestException(`Max page number is ${maxPageNumber}`);
    }

    const skip = (pageNumber - 1) * pageSize;

    const args = {
      skip,
      take: pageSize,
    };

    // @ts-ignore
    const modelList = await this.getPrismaService().findMany(args);

    return {
      data: this.modelClass.hydrateMany<ConcreteModel>(modelList),
      pagination: {
        total_items: count,
        page_number: pageNumber,
        page_size: pageSize,
        max_page_number: maxPageNumber,
      },
    };
  }

  async update(
    model: ConcreteModel,
    args?: OmitData<
      TypeMapConcreteModelOperations<ConcreteModelName, 'update'>['args']
    >,
  ): Promise<ConcreteModel> {
    const databaseModel = model.toDatabase();
    const primaryKeyName = (model.constructor as any).primaryKeyName();

    // Remove the primary key from the data to avoid conflicts
    const { [primaryKeyName]: _, ...updateData } = databaseModel;

    // Filter out undefined values to avoid Prisma validation errors
    const cleanedUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined),
    );

    const args2: any = {
      ...args,
      // Use provided where clause if available, otherwise build from primary key
      where: args?.where || this.buildPrimaryKeyWhere(model),
      data: cleanedUpdateData,
    };

    // Here it makes some selects within a transaction
    // @ts-ignore
    const prismaResponse = await this.getPrismaService().update(args2);
    return this.modelClass.hydrateOne<ConcreteModel>(prismaResponse);
  }

  async upsert(
    model: ConcreteModel,
    args?: TypeMapConcreteModelOperations<ConcreteModelName, 'upsert'>['args'],
  ): Promise<ConcreteModel> {
    // @ts-ignore

    const databaseModel = model.toDatabase();
    const primaryKeyName = (model.constructor as any).primaryKeyName();
    const { [primaryKeyName]: _, ...updateData } = databaseModel;

    const args2: any = {
      ...args,
      where: this.buildPrimaryKeyWhere(model),
      create: updateData,
      update: updateData,
    };

    // @ts-ignore
    const prismaResponse = await this.getPrismaService().upsert(args2);
    return this.modelClass.hydrateOne<ConcreteModel>(prismaResponse);
  }

  async manyUpsert(
    models: ConcreteModel[],
    args?: TypeMapConcreteModelOperations<
      ConcreteModelName,
      'upsert'
    >['args'][],
  ): Promise<ConcreteModel[]> {
    const upsertPromises = models.map((model, index) => {
      const databaseModel = model.toDatabase();
      const primaryKeyName = (model.constructor as any).primaryKeyName();
      const { [primaryKeyName]: _, ...updateData } = databaseModel;

      const args2: any = {
        ...args?.[index],
        where: this.buildPrimaryKeyWhere(model),
        create: updateData,
        update: updateData,
      };

      // @ts-ignore
      return this.getPrismaService().upsert(args2);
    });

    const prismaResponse = await Promise.all(upsertPromises);

    return this.modelClass.hydrateMany<ConcreteModel>(prismaResponse);
  }

  async groupBy(
    args: TypeMapConcreteModelOperations<ConcreteModelName, 'groupBy'>['args'],
  ): Promise<ConcreteModel[]> {
    // @ts-ignore
    const prismaResponse = await this.getPrismaService().groupBy(args);

    return this.modelClass.hydrateMany<ConcreteModel>(prismaResponse);
  }

  async count(
    args?: TypeMapConcreteModelOperations<ConcreteModelName, 'count'>['args'],
  ): Promise<number> {
    // @ts-ignore
    const prismaResponse = await this.getPrismaService().count(args);
    return prismaResponse;
  }

  async findMany(
    args: TypeMapConcreteModelOperations<ConcreteModelName, 'findMany'>['args'],
  ): Promise<ConcreteModel[]> {
    // @ts-ignore
    const prismaResponse = await this.getPrismaService().findMany(args);

    const hydratedModels =
      this.modelClass.hydrateMany<ConcreteModel>(prismaResponse);

    return hydratedModels;
  }

  async findUnique(
    args: TypeMapConcreteModelOperations<
      ConcreteModelName,
      'findUnique'
    >['args'],
  ): Promise<ConcreteModel> {
    // @ts-ignore
    const prismaResponse = await this.getPrismaService().findUnique(args);
    return this.modelClass.hydrateOne<ConcreteModel>(prismaResponse);
  }

  async findFirst(
    args: TypeMapConcreteModelOperations<
      ConcreteModelName,
      'findFirst'
    >['args'],
  ): Promise<ConcreteModel> {
    // @ts-ignore
    const prismaResponse = await this.getPrismaService().findFirst(args);
    return this.modelClass.hydrateOne<ConcreteModel>(prismaResponse);
  }

  async retrieve(primaryKeyValue: number | string): Promise<ConcreteModel> {
    const primaryKeyName = this.getPrimaryKeyName();

    const args: any = {
      where: {
        [primaryKeyName]: primaryKeyValue,
      },
    };

    // @ts-ignore
    const model = await this.getPrismaService().findUnique(args);

    if (!model) {
      throw new NotFoundException(
        `${this.modelClass.name.toString()} not found`,
      );
    }

    const hydratedModel = this.modelClass.hydrateOne<ConcreteModel>(model);

    return hydratedModel;
  }

  async delete(
    primaryKeyValue: number | string,
    args?: TypeMapConcreteModelOperations<ConcreteModelName, 'delete'>['args'],
  ): Promise<void> {
    const primaryKeyName = this.getPrimaryKeyName();

    const args2: any = {
      ...args,
      where: {
        [primaryKeyName]: primaryKeyValue,
      },
    };

    // @ts-ignore
    await this.getPrismaService().delete(args2);
  }

  async deleteMany(
    args: TypeMapConcreteModelOperations<
      ConcreteModelName,
      'deleteMany'
    >['args'],
  ): Promise<Prisma.BatchPayload> {
    // @ts-ignore
    return await this.getPrismaService().deleteMany(args);
  }

  async getPaginationData(
    pageNumber: number,
    pageSize: number,
    args: TypeMapConcreteModelOperations<ConcreteModelName, 'count'>['args'],
  ): Promise<PaginatedData<ConcreteModel>> {
    const prismaServiceInstance = this.prisma[this.prismaKey as ModelMeta];

    const skip = (pageNumber - 1) * pageSize;

    const databaseArgs = {
      ...args,
      skip,
      take: pageSize,
    };

    // @ts-ignore
    const count = await prismaServiceInstance.count(args);
    const maxPageNumber = Math.ceil(count / pageSize);

    if (maxPageNumber < pageNumber && count !== 0) {
      throw new BadRequestException(`Max page number is ${maxPageNumber}`);
    }

    // @ts-ignore
    const modelList = await prismaServiceInstance.findMany(databaseArgs);

    return {
      data: this.modelClass.hydrateMany<ConcreteModel>(modelList),
      pagination: {
        total_items: count,
        page_number: pageNumber,
        page_size: pageSize,
        max_page_number: maxPageNumber,
      },
    };
  }
}
