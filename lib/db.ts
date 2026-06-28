import { Pool, type QueryResult, type QueryResultRow } from "pg"

function getConnectionString(): string {
  const connectionString = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL
  if (!connectionString) {
    console.error(
      "❌ NEON_DATABASE_URL is not set. Please follow NEON_SETUP.md to configure your database."
    )
    throw new Error(
      "NEON_DATABASE_URL environment variable is required. See NEON_SETUP.md for setup instructions."
    )
  }
  return connectionString
}

declare global {
  var __pgPool: Pool | undefined
}

function createPool(): Pool {
  return new Pool({
    connectionString: getConnectionString(),
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: {
      rejectUnauthorized: false,
    },
  })
}

export function getDbPool(): Pool {
  if (!global.__pgPool) {
    global.__pgPool = createPool()
  }
  return global.__pgPool
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  return getDbPool().query<T>(text, params)
}
