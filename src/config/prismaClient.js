const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getPrismaClient } = require('@prisma/client/runtime/library');
const { enginesVersion } = require('@prisma/engines-version');
const { version: clientVersion } = require('@prisma/client/package.json');

const schemaPath = path.resolve(__dirname, '..', 'prisma', 'schema.prisma');
const inlineSchema = fs.readFileSync(schemaPath, 'utf8');
const inlineSchemaHash = crypto.createHash('sha256').update(inlineSchema).digest('hex');

const uuidDefault = { name: 'uuid', args: [] };
const nowDefault = { name: 'now', args: [] };

const scalarField = (name, type, options = {}) => {
  const hasDefaultValue = options.hasDefaultValue ?? options.defaultValue !== undefined;

  const field = {
    kind: 'scalar',
    name,
    isRequired: options.required ?? true,
    isList: false,
    isUnique: options.unique ?? false,
    isId: options.id ?? false,
    isReadOnly: options.readOnly ?? false,
    type,
    dbName: null,
    hasDefaultValue
  };

  if (hasDefaultValue && options.defaultValue !== undefined) {
    field.default = options.defaultValue;
  }

  return field;
};

const runtimeModel = (dbName, fields, options = {}) => ({
  dbName,
  fields,
  uniqueFields: options.uniqueFields ?? [],
  uniqueIndexes: options.uniqueIndexes ?? [],
  primaryKey: options.primaryKey ?? { name: null, fields: ['id'] }
});

const runtimeDataModel = {
  models: {
    Partner: runtimeModel('partners', [
      scalarField('id', 'String', { id: true, unique: true, defaultValue: uuidDefault, hasDefaultValue: true }),
      scalarField('user_id', 'String', { unique: true }),
      scalarField('name', 'String', { required: false }),
      scalarField('email', 'String', { required: false }),
      scalarField('company', 'String', { required: false }),
      scalarField('created_at', 'DateTime', { defaultValue: nowDefault, hasDefaultValue: true })
    ], {
      uniqueFields: [['user_id']]
    }),
    ConnectedPage: runtimeModel('connected_pages', [
      scalarField('id', 'String', { id: true, unique: true, defaultValue: uuidDefault, hasDefaultValue: true }),
      scalarField('partner_id', 'String'),
      scalarField('fb_page_id', 'String'),
      scalarField('page_name', 'String', { required: false }),
      scalarField('page_token_encrypted', 'String', { required: false }),
      scalarField('fan_count', 'BigInt', { defaultValue: 0, hasDefaultValue: true }),
      scalarField('is_active', 'Boolean', { defaultValue: true, hasDefaultValue: true }),
      scalarField('last_synced_at', 'DateTime', { required: false }),
      scalarField('created_at', 'DateTime', { defaultValue: nowDefault, hasDefaultValue: true })
    ]),
    Post: runtimeModel('posts', [
      scalarField('id', 'String', { id: true, unique: true, defaultValue: uuidDefault, hasDefaultValue: true }),
      scalarField('page_id', 'String'),
      scalarField('fb_post_id', 'String'),
      scalarField('message', 'String', { required: false }),
      scalarField('type', 'String', { required: false }),
      scalarField('permalink', 'String', { required: false }),
      scalarField('created_time', 'DateTime', { required: false }),
      scalarField('synced_at', 'DateTime', { defaultValue: nowDefault, hasDefaultValue: true })
    ]),
    PageInsight: runtimeModel('page_insights', [
      scalarField('id', 'String', { id: true, unique: true, defaultValue: uuidDefault, hasDefaultValue: true }),
      scalarField('page_id', 'String'),
      scalarField('metric_name', 'String'),
      scalarField('metric_value', 'Json', { required: false }),
      scalarField('period', 'String', { required: false }),
      scalarField('end_time', 'DateTime', { required: false }),
      scalarField('synced_at', 'DateTime', { defaultValue: nowDefault, hasDefaultValue: true })
    ]),
    PostInsight: runtimeModel('post_insights', [
      scalarField('id', 'String', { id: true, unique: true, defaultValue: uuidDefault, hasDefaultValue: true }),
      scalarField('post_id', 'String'),
      scalarField('metric_name', 'String'),
      scalarField('metric_value', 'Json', { required: false }),
      scalarField('period', 'String', { required: false }),
      scalarField('end_time', 'DateTime', { required: false }),
      scalarField('synced_at', 'DateTime', { defaultValue: nowDefault, hasDefaultValue: true })
    ]),
    CmEarningsPost: runtimeModel('cm_earnings_post', [
      scalarField('id', 'String', { id: true, unique: true, defaultValue: uuidDefault, hasDefaultValue: true }),
      scalarField('post_id', 'String'),
      scalarField('earnings_amount', 'Decimal', { defaultValue: 0, hasDefaultValue: true }),
      scalarField('approximate_earnings', 'Decimal', { defaultValue: 0, hasDefaultValue: true }),
      scalarField('currency', 'String', { defaultValue: 'USD', hasDefaultValue: true }),
      scalarField('period', 'String', { required: false }),
      scalarField('end_time', 'DateTime', { required: false }),
      scalarField('synced_at', 'DateTime', { defaultValue: nowDefault, hasDefaultValue: true })
    ]),
    CmEarningsPage: runtimeModel('cm_earnings_page', [
      scalarField('id', 'String', { id: true, unique: true, defaultValue: uuidDefault, hasDefaultValue: true }),
      scalarField('page_id', 'String'),
      scalarField('earnings_amount', 'Decimal', { defaultValue: 0, hasDefaultValue: true }),
      scalarField('approximate_earnings', 'Decimal', { defaultValue: 0, hasDefaultValue: true }),
      scalarField('content_type_breakdown', 'Json', { required: false }),
      scalarField('currency', 'String', { defaultValue: 'USD', hasDefaultValue: true }),
      scalarField('period', 'String', { required: false }),
      scalarField('end_time', 'DateTime', { required: false }),
      scalarField('synced_at', 'DateTime', { defaultValue: nowDefault, hasDefaultValue: true })
    ]),
    ThirdPartyData: runtimeModel('third_party_data', [
      scalarField('id', 'String', { id: true, unique: true, defaultValue: uuidDefault, hasDefaultValue: true }),
      scalarField('page_id', 'String', { required: false }),
      scalarField('post_id', 'String', { required: false }),
      scalarField('data_type', 'String'),
      scalarField('value', 'Json', { required: false }),
      scalarField('synced_at', 'DateTime', { defaultValue: nowDefault, hasDefaultValue: true })
    ]),
    SyncJob: runtimeModel('sync_jobs', [
      scalarField('id', 'String', { id: true, unique: true, defaultValue: uuidDefault, hasDefaultValue: true }),
      scalarField('page_id', 'String'),
      scalarField('job_type', 'String'),
      scalarField('status', 'String', { defaultValue: 'pending', hasDefaultValue: true }),
      scalarField('started_at', 'DateTime', { required: false }),
      scalarField('completed_at', 'DateTime', { required: false }),
      scalarField('error_log', 'String', { required: false }),
      scalarField('created_at', 'DateTime', { defaultValue: nowDefault, hasDefaultValue: true })
    ])
  },
  enums: {},
  types: {}
};

const prismaClientClass = getPrismaClient({
  runtimeDataModel,
  relativeEnvPaths: {
    rootEnvPath: null,
    schemaEnvPath: null
  },
  relativePath: '.',
  dirname: path.dirname(schemaPath),
  filename: path.basename(schemaPath),
  clientVersion,
  engineVersion: enginesVersion,
  datasourceNames: ['db'],
  activeProvider: 'postgresql',
  inlineSchema,
  inlineDatasources: {
    db: {
      url: {
        fromEnvVar: 'DATABASE_URL',
        value: ''
      }
    }
  },
  inlineSchemaHash
});

module.exports = {
  prismaClientClass,
  runtimeDataModel,
  schemaPath
};
