import { getDB } from "../config/database";
import { BaseRepository } from "../core/base.repository";
import type {
  CmEarningsPageEntity,
  CmEarningsPostEntity,
  PageEarningsCreateInput,
  PostEarningsCreateInput,
} from "../types/domain";
import { PrismaHelpers } from "../utils/prismaHelpers";
import { validateData } from "../utils/schema";

export class EarningsRepository extends BaseRepository<unknown> {
  protected readonly tableName = "cm_earnings_post";

  private get postDelegate() {
    return getDB().cmEarningsPost;
  }

  private get pageDelegate() {
    return getDB().cmEarningsPage;
  }

  protected get delegate() {
    return this.postDelegate;
  }

  private normalizeEarningsInput<T extends PageEarningsCreateInput | PostEarningsCreateInput>(earningsData: T): Record<string, unknown> {
    const normalized = PrismaHelpers.stripUndefined(earningsData) as Record<string, unknown>;

    if (typeof normalized.earnings_amount === "bigint") {
      normalized.earnings_amount = normalized.earnings_amount.toString();
    }

    if (typeof normalized.approximate_earnings === "bigint") {
      normalized.approximate_earnings = normalized.approximate_earnings.toString();
    }

    return normalized;
  }

  async createPostEarnings(earningsData: PostEarningsCreateInput): Promise<CmEarningsPostEntity> {
    const validation = validateData("cm_earnings_post", earningsData as unknown as Record<string, unknown>);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    return PrismaHelpers.normalizeRecord(
      await this.postDelegate.create({
        data: this.normalizeEarningsInput(earningsData) as never,
      })
    ) as unknown as CmEarningsPostEntity;
  }

  async getPostEarnings(postId: string): Promise<CmEarningsPostEntity[]> {
    return PrismaHelpers.normalizeRecords(
      await this.postDelegate.findMany({
        where: { post_id: postId },
      })
    ) as unknown as CmEarningsPostEntity[];
  }

  async createPageEarnings(earningsData: PageEarningsCreateInput): Promise<CmEarningsPageEntity> {
    const validation = validateData("cm_earnings_page", earningsData as unknown as Record<string, unknown>);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    return PrismaHelpers.normalizeRecord(
      await this.pageDelegate.create({
        data: this.normalizeEarningsInput(earningsData) as never,
      })
    ) as unknown as CmEarningsPageEntity;
  }

  async getPageEarnings(pageId: string): Promise<CmEarningsPageEntity[]> {
    return PrismaHelpers.normalizeRecords(
      await this.pageDelegate.findMany({
        where: { page_id: pageId },
        orderBy: { end_time: "desc" },
      })
    ) as unknown as CmEarningsPageEntity[];
  }

  async upsertPostEarnings(earningsData: PostEarningsCreateInput): Promise<CmEarningsPostEntity> {
    return PrismaHelpers.normalizeRecord(
      await PrismaHelpers.upsertByLookup({
        delegate: this.postDelegate,
        where: PrismaHelpers.buildWhere({
          post_id: earningsData.post_id,
          period: earningsData.period,
          end_time: earningsData.end_time,
        }),
        create: this.normalizeEarningsInput(earningsData),
        update: this.normalizeEarningsInput(earningsData),
      })
    ) as unknown as CmEarningsPostEntity;
  }

  async upsertPageEarnings(earningsData: PageEarningsCreateInput): Promise<CmEarningsPageEntity> {
    return PrismaHelpers.normalizeRecord(
      await PrismaHelpers.upsertByLookup({
        delegate: this.pageDelegate,
        where: PrismaHelpers.buildWhere({
          page_id: earningsData.page_id,
          period: earningsData.period,
          end_time: earningsData.end_time,
        }),
        create: this.normalizeEarningsInput(earningsData),
        update: this.normalizeEarningsInput(earningsData),
      })
    ) as unknown as CmEarningsPageEntity;
  }
}

export default new EarningsRepository();
