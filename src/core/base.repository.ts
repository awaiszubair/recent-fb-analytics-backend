import type { AnyRecord } from "../types/domain";
import { PrismaHelpers } from "../utils/prismaHelpers";
import { SchemaRegistry } from "../utils/schema";

export interface PrismaDelegate<T> {
  create(args: { data: AnyRecord }): Promise<T>;
  findUnique(args: { where: AnyRecord }): Promise<T | null>;
  findFirst(args: { where: AnyRecord }): Promise<T | null>;
  findMany(args?: AnyRecord): Promise<T[]>;
  update(args: { where: AnyRecord; data: AnyRecord }): Promise<T>;
}

export abstract class BaseRepository<TModel> {
  protected abstract readonly tableName: string;
  protected abstract get delegate(): PrismaDelegate<TModel>;

  protected validate(data: AnyRecord): void {
    const validation = SchemaRegistry.validateData(this.tableName, data);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }
  }

  protected async createRecord(data: AnyRecord): Promise<TModel> {
    this.validate(data);
    return PrismaHelpers.normalizeRecord(
      await this.delegate.create({
        data: PrismaHelpers.stripUndefined(data),
      })
    ) as TModel;
  }

  protected async findById(id: string): Promise<TModel | null> {
    return PrismaHelpers.normalizeRecord(
      await this.delegate.findUnique({
        where: { id },
      })
    ) as TModel | null;
  }

  protected async findManyRecords(args: AnyRecord = {}): Promise<TModel[]> {
    return PrismaHelpers.normalizeRecords(await this.delegate.findMany(args)) as TModel[];
  }

  protected async updateRecord(where: AnyRecord, updates: AnyRecord): Promise<TModel> {
    const cleanedUpdates = PrismaHelpers.stripUndefined(updates);

    if (!cleanedUpdates || Object.keys(cleanedUpdates).length === 0) {
      const existing = await this.delegate.findFirst({ where });
      return PrismaHelpers.normalizeRecord(existing) as TModel;
    }

    return PrismaHelpers.normalizeRecord(
      await this.delegate.update({
        where,
        data: cleanedUpdates,
      })
    ) as TModel;
  }

  protected async upsertByLookup(where: AnyRecord, create: AnyRecord, update: AnyRecord = create): Promise<TModel> {
    return PrismaHelpers.normalizeRecord(
      await PrismaHelpers.upsertByLookup({
        delegate: this.delegate,
        where: PrismaHelpers.buildWhere(where),
        create,
        update,
      })
    ) as TModel;
  }
}
