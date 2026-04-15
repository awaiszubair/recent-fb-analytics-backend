import { database } from "../config/database";
import type { AnyRecord } from "../types/domain";
import { PrismaHelpers } from "./prismaHelpers";
import { SchemaRegistry } from "./schema";

export class SeedService {
  static async insert(tableName: string, data: AnyRecord): Promise<AnyRecord> {
    const validation = SchemaRegistry.validateData(tableName, data);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    const delegate = PrismaHelpers.getTableDelegate(database.client, tableName) as {
      create: (args: { data: AnyRecord }) => Promise<AnyRecord>;
    };

    const insertedData = await delegate.create({
      data: PrismaHelpers.stripUndefined(data),
    });

    return PrismaHelpers.normalizeRecord(insertedData) as AnyRecord;
  }

  static insertPartner(data: AnyRecord): Promise<AnyRecord> {
    return this.insert("partners", {
      user_id: data.user_id,
      name: data.name || null,
      email: data.email || null,
      company: data.company || null,
    });
  }

  static insertConnectedPage(data: AnyRecord): Promise<AnyRecord> {
    return this.insert("connected_pages", {
      partner_id: data.partner_id,
      fb_page_id: data.fb_page_id,
      page_name: data.page_name || null,
      page_token_encrypted: data.page_token_encrypted || null,
      fan_count: data.fan_count ?? 0,
      is_active: data.is_active !== false,
      last_synced_at: data.last_synced_at || null,
    });
  }

  static insertPost(data: AnyRecord): Promise<AnyRecord> {
    return this.insert("posts", {
      page_id: data.page_id,
      fb_post_id: data.fb_post_id,
      message: data.message || null,
      type: data.type || null,
      permalink: data.permalink || null,
      created_time: data.created_time || new Date(),
      synced_at: data.synced_at || new Date(),
    });
  }

  static insertPageInsight(data: AnyRecord): Promise<AnyRecord> {
    return this.insert("page_insights", {
      page_id: data.page_id,
      metric_name: data.metric_name,
      metric_value: data.metric_value || null,
      period: data.period || null,
      end_time: data.end_time || null,
      synced_at: data.synced_at || new Date(),
    });
  }

  static insertPostInsight(data: AnyRecord): Promise<AnyRecord> {
    return this.insert("post_insights", {
      post_id: data.post_id,
      metric_name: data.metric_name,
      metric_value: data.metric_value || null,
      period: data.period || null,
      end_time: data.end_time || null,
      synced_at: data.synced_at || new Date(),
    });
  }

  static insertCMEarningsPost(data: AnyRecord): Promise<AnyRecord> {
    return this.insert("cm_earnings_post", {
      post_id: data.post_id,
      earnings_amount: data.earnings_amount || 0,
      approximate_earnings: data.approximate_earnings || 0,
      currency: data.currency || "USD",
      period: data.period || null,
      end_time: data.end_time || null,
      synced_at: data.synced_at || new Date(),
    });
  }

  static insertCMEarningsPage(data: AnyRecord): Promise<AnyRecord> {
    return this.insert("cm_earnings_page", {
      page_id: data.page_id,
      earnings_amount: data.earnings_amount || 0,
      approximate_earnings: data.approximate_earnings || 0,
      content_type_breakdown: data.content_type_breakdown || null,
      currency: data.currency || "USD",
      period: data.period || null,
      end_time: data.end_time || null,
      synced_at: data.synced_at || new Date(),
    });
  }
}

export default SeedService;
