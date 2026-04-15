import type { AnyRecord } from "../types/domain";

type TableFieldSchema = {
  type: string;
  required?: boolean;
  unique?: boolean;
  default?: unknown;
};

type TableSchema = {
  required: string[];
  fields: Record<string, TableFieldSchema>;
};

export class SchemaRegistry {
  static readonly dbSchema: Record<string, TableSchema> = {
    partners: {
      required: ["user_id"],
      fields: {
        user_id: { type: "text", required: true, unique: true },
        name: { type: "text", required: false, default: null },
        email: { type: "text", required: false, default: null },
        company: { type: "text", required: false, default: null },
      },
    },
    connected_pages: {
      required: ["partner_id", "fb_page_id"],
      fields: {
        partner_id: { type: "uuid", required: true },
        fb_page_id: { type: "text", required: true },
        page_name: { type: "text", required: false, default: null },
        page_token_encrypted: { type: "text", required: false, default: null },
        fan_count: { type: "bigint", required: false, default: 0 },
        is_active: { type: "boolean", required: false, default: true },
        last_synced_at: { type: "timestamptz", required: false, default: null },
      },
    },
    posts: {
      required: ["page_id", "fb_post_id"],
      fields: {
        page_id: { type: "uuid", required: true },
        fb_post_id: { type: "text", required: true },
        message: { type: "text", required: false, default: null },
        type: { type: "text", required: false, default: null },
        permalink: { type: "text", required: false, default: null },
        created_time: { type: "timestamptz", required: false, default: null },
      },
    },
    page_insights: {
      required: ["page_id", "metric_name"],
      fields: {
        page_id: { type: "uuid", required: true },
        metric_name: { type: "text", required: true },
        metric_value: { type: "jsonb", required: false, default: null },
        period: { type: "text", required: false, default: null },
        end_time: { type: "timestamptz", required: false, default: null },
      },
    },
    post_insights: {
      required: ["post_id", "metric_name"],
      fields: {
        post_id: { type: "uuid", required: true },
        metric_name: { type: "text", required: true },
        metric_value: { type: "jsonb", required: false, default: null },
        period: { type: "text", required: false, default: null },
        end_time: { type: "timestamptz", required: false, default: null },
      },
    },
    cm_earnings_post: {
      required: ["post_id"],
      fields: {
        post_id: { type: "uuid", required: true },
        earnings_amount: { type: "numeric", required: false, default: 0 },
        approximate_earnings: { type: "numeric", required: false, default: 0 },
        currency: { type: "text", required: false, default: "USD" },
        period: { type: "text", required: false, default: null },
        end_time: { type: "timestamptz", required: false, default: null },
      },
    },
    cm_earnings_page: {
      required: ["page_id"],
      fields: {
        page_id: { type: "uuid", required: true },
        earnings_amount: { type: "numeric", required: false, default: 0 },
        approximate_earnings: { type: "numeric", required: false, default: 0 },
        content_type_breakdown: { type: "jsonb", required: false, default: null },
        currency: { type: "text", required: false, default: "USD" },
        period: { type: "text", required: false, default: null },
        end_time: { type: "timestamptz", required: false, default: null },
      },
    },
    third_party_data: {
      required: ["data_type"],
      fields: {
        page_id: { type: "uuid", required: false, default: null },
        post_id: { type: "uuid", required: false, default: null },
        data_type: { type: "text", required: true },
        value: { type: "jsonb", required: false, default: null },
      },
    },
    sync_jobs: {
      required: ["page_id", "job_type"],
      fields: {
        page_id: { type: "uuid", required: true },
        job_type: { type: "text", required: true },
        status: { type: "text", required: false, default: "pending" },
        started_at: { type: "timestamptz", required: false, default: null },
        completed_at: { type: "timestamptz", required: false, default: null },
        error_log: { type: "text", required: false, default: null },
      },
    },
  };

  static getTableSchema(tableName: string): TableSchema | null {
    return this.dbSchema[tableName] || null;
  }

  static getRequiredFields(tableName: string): string[] {
    return this.dbSchema[tableName]?.required || [];
  }

  static validateData(tableName: string, data: AnyRecord): { valid: boolean; errors: string[] } {
    const schema = this.dbSchema[tableName];
    const errors: string[] = [];

    if (!schema) {
      return { valid: false, errors: [`Table schema for '${tableName}' not found`] };
    }

    for (const requiredField of schema.required) {
      if (!Object.prototype.hasOwnProperty.call(data, requiredField) || data[requiredField] === undefined || data[requiredField] === null) {
        errors.push(`Required field '${requiredField}' is missing or null`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

export const dbSchema = SchemaRegistry.dbSchema;
export const getTableSchema = SchemaRegistry.getTableSchema;
export const getRequiredFields = SchemaRegistry.getRequiredFields;
export const validateData = SchemaRegistry.validateData;
