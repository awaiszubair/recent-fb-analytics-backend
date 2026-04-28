export class Environment {
  static get nodeEnv(): string {
    return process.env.NODE_ENV || "development";
  }

  static get port(): number {
    const value = Number.parseInt(process.env.PORT || "5000", 10);
    return Number.isNaN(value) ? 5000 : value;
  }

  static get apiPrefix(): string {
    return process.env.API_PREFIX || "/api/v1";
  }

  static get corsOrigin(): string {
    return process.env.CORS_ORIGIN || "*";
  }

  static get databaseUrl(): string | undefined {
    return process.env.DATABASE_URL || process.env.POSTGRES_URL;
  }

  static get redisUrl(): string | undefined {
    return process.env.REDIS_URL || process.env.QUEUE_REDIS_URL;
  }

  static get facebookGraphVersion(): string {
    return process.env.FACEBOOK_GRAPH_VERSION || "v25.0";
  }

  static get facebookGraphBaseUrl(): string {
    return `https://graph.facebook.com/${this.facebookGraphVersion}`;
  }

  static get facebookOauthBaseUrl(): string {
    return `https://graph.facebook.com/${this.facebookGraphVersion}`;
  }

  static get fbAppId(): string | undefined {
    return process.env.FB_APP_ID;
  }

  static get fbAppSecret(): string | undefined {
    return process.env.FB_APP_SECRET;
  }

  static get pageTokenEncryptionSecret(): string | undefined {
    return process.env.PAGE_TOKEN_ENCRYPTION_SECRET || process.env.TOKEN_ENCRYPTION_SECRET || process.env.FB_APP_SECRET;
  }

  static get revenueExportApiKey(): string | undefined {
    return process.env.REVENUE_EXPORT_API_KEY || process.env.ADMIN_API_KEY;
  }

  // Cloudflare R2 Configuration
  static get r2AccountId(): string | undefined {
    return process.env.R2_ACCOUNT_ID;
  }

  static get r2AccessKeyId(): string | undefined {
    return process.env.R2_ACCESS_KEY_ID;
  }

  static get r2SecretAccessKey(): string | undefined {
    return process.env.R2_SECRET_ACCESS_KEY;
  }

  static get r2BucketName(): string {
    return process.env.R2_BUCKET_NAME || "newsbomb";
  }
}
