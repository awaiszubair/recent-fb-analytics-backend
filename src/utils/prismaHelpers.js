const isDecimalLike = (value) => {
  return Boolean(value) && typeof value === 'object' && value.constructor && value.constructor.name === 'Decimal';
};

const normalizeValue = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Date) {
    return value;
  }

  if (isDecimalLike(value)) {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeValue(nestedValue)])
    );
  }

  return value;
};

const normalizeRecord = (record) => normalizeValue(record);

const normalizeRecords = (records) => {
  if (!Array.isArray(records)) {
    return normalizeRecord(records);
  }

  return records.map(normalizeRecord);
};

const stripUndefined = (data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data;
  }

  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );
};

const buildWhere = (criteria = {}) => {
  return stripUndefined(criteria);
};

const upsertByLookup = async ({ delegate, where, create, update }) => {
  const existing = await delegate.findFirst({ where });

  if (existing) {
    const updatePayload = stripUndefined(update || create);

    if (!updatePayload || Object.keys(updatePayload).length === 0) {
      return existing;
    }

    return delegate.update({
      where: { id: existing.id },
      data: updatePayload
    });
  }

  return delegate.create({
    data: stripUndefined(create)
  });
};

const getTableDelegate = (db, tableName) => {
  const tableMap = {
    partners: 'partner',
    connected_pages: 'connectedPage',
    posts: 'post',
    page_insights: 'pageInsight',
    post_insights: 'postInsight',
    cm_earnings_post: 'cmEarningsPost',
    cm_earnings_page: 'cmEarningsPage',
    third_party_data: 'thirdPartyData',
    sync_jobs: 'syncJob'
  };

  const delegateName = tableMap[tableName];

  if (!delegateName || !db[delegateName]) {
    throw new Error(`Prisma delegate for table '${tableName}' not found`);
  }

  return db[delegateName];
};

module.exports = {
  buildWhere,
  getTableDelegate,
  normalizeRecord,
  normalizeRecords,
  stripUndefined,
  upsertByLookup
};
