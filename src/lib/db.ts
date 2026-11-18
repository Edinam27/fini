import { Pool } from "pg";

declare global {
  var _pgPool: Pool | undefined;
}

let clientString: string | null = null;

function getPool(): Pool {
  if (!clientString) {
    clientString = process.env.DATABASE_URL ?? null;
    if (!clientString) {
      throw new Error(
        "DATABASE_URL is not set. Put your Neon connection string in .env"
      );
    }
    // pg v8 currently aliases sslmode=require to verify-full and warns about
    // the upcoming semantic change; opting into libpq compatibility keeps the
    // behavior stable and silences the warning.
    if (/sslmode=require/.test(clientString) && !clientString.includes("uselibpqcompat")) {
      clientString += "&uselibpqcompat=true";
    }
  }
  if (!global._pgPool) {
    // node-postgres honors sslmode in the connection string.
    global._pgPool = new Pool({ connectionString: clientString, max: 5 });
  }
  return global._pgPool;
}

/** Run a parameterized query; returns plain row objects. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}

/** Run a query and return the first row, or null when empty. */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
