// Return fixed diagnostics: Prisma messages can include query input or credentials.
export function describeDatabaseError(error: unknown) {
  const details = error && typeof error === 'object'
    ? error as { name?: unknown; errorCode?: unknown; code?: unknown; message?: unknown }
    : {};
  const candidate = details.errorCode || details.code;
  const code = typeof candidate === 'string' && /^P\d{4}$/.test(candidate) ? candidate : 'UNKNOWN';
  const isDatabaseError = code !== 'UNKNOWN'
    || (typeof details.name === 'string' && details.name.startsWith('PrismaClient'));

  // Some PostgreSQL/pooler startup failures have no Prisma error code.
  // Match only known causes and return fixed text: raw messages may contain secrets.
  if (code === 'UNKNOWN' && isDatabaseError && typeof details.message === 'string') {
    const message = details.message;
    const unavailable = { code, isDatabaseError, status: 503, apiCode: 'DATABASE_UNAVAILABLE' };
    if (/tenant or user not found/i.test(message)) {
      return { ...unavailable, message: 'The database pooler rejected the tenant or user. Copy the pooler host and project-scoped username from Supabase Connect into DATABASE_URL.' };
    }
    if (/password authentication failed|authentication failed|wrong password/i.test(message)) {
      return { ...unavailable, message: 'Database authentication failed. Verify the database password and connection username in DATABASE_URL.' };
    }
    if (/EMAXCONNSESSION|max\s*clients|too many (?:clients|connections)|remaining connection slots/i.test(message)) {
      return { ...unavailable, message: 'The database connection limit was reached. Check database and pooler connection usage.' };
    }
    if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ENETUNREACH|can.t reach database server/i.test(message)) {
      return { ...unavailable, message: 'The database server is unreachable. Check the connection host, project status and network access; use the Supabase Session pooler if IPv4 is required.' };
    }
    if (/connection (?:attempt )?timed out|ETIMEDOUT|connect timeout/i.test(message)) {
      return { ...unavailable, message: 'The database connection timed out. Check database availability and network access.' };
    }
    if (details.name === 'PrismaClientInitializationError' && !/TLS|security package/i.test(message)) {
      return { ...unavailable, message: 'Prisma could not initialize the database connection. Verify DATABASE_URL, database availability, pooler settings and the deployed Prisma runtime.' };
    }
  }

  if (code === 'P1000') {
    return { code, isDatabaseError, status: 503, apiCode: 'DATABASE_UNAVAILABLE',
      message: 'Database authentication failed. Verify the database password and connection username.' };
  }
  if (code === 'P1001') {
    return { code, isDatabaseError, status: 503, apiCode: 'DATABASE_UNAVAILABLE',
      message: 'The database server is unreachable. Check project status, the connection host, and network access.' };
  }
  if (['P1002', 'P1008', 'P2024'].includes(code)) {
    return { code, isDatabaseError, status: 503, apiCode: 'DATABASE_UNAVAILABLE',
      message: 'The database connection or request timed out.' };
  }
  if (code === 'P1011' || (typeof details.message === 'string' && /TLS|security package/i.test(details.message))) {
    return { code, isDatabaseError, status: 503, apiCode: 'DATABASE_UNAVAILABLE',
      message: 'The database TLS connection failed. Check SSL configuration and the operating system TLS environment.' };
  }
  if (code === 'P1017') {
    return { code, isDatabaseError, status: 503, apiCode: 'DATABASE_UNAVAILABLE',
      message: 'The database closed the connection. Retry after checking database availability.' };
  }
  if (['P1012', 'P1013'].includes(code)) {
    return { code, isDatabaseError, status: 503, apiCode: 'DATABASE_UNAVAILABLE',
      message: 'The database configuration is invalid. Check the environment settings and Prisma schema.' };
  }
  if (['P2021', 'P2022'].includes(code)) {
    return { code, isDatabaseError, status: 503, apiCode: 'DATABASE_SCHEMA_NOT_READY',
      message: 'The database schema is incomplete or incompatible. Check migration status.' };
  }
  if (code === 'P2002') {
    return { code, isDatabaseError, status: 409, apiCode: 'CONFLICT', message: 'A record with these unique fields already exists.' };
  }
  if (code === 'P2025') {
    return { code, isDatabaseError, status: 404, apiCode: 'NOT_FOUND', message: 'The requested record was not found.' };
  }
  return { code, isDatabaseError, status: 500, apiCode: 'DATABASE_ERROR', message: 'The database request failed.' };
}
