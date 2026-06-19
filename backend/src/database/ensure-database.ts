import { Client } from 'pg';

type DatabaseConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  maintenanceDatabase?: string;
};

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

async function databaseExists(client: Client, databaseName: string): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS "exists"',
    [databaseName],
  );

  return result.rows[0]?.exists ?? false;
}

export async function ensureDatabaseExists({
  host,
  port,
  user,
  password,
  database,
  maintenanceDatabase = 'postgres',
}: DatabaseConfig): Promise<void> {

  const adminClient = new Client({
    host,
    port,
    user,
    password,
    database: maintenanceDatabase,
  });

  await adminClient.connect();

  try {
    const exists = await databaseExists(adminClient, database);

    if (!exists) {
      const templatePostgisExists = await databaseExists(
        adminClient,
        'template_postgis',
      );
      const createDatabaseSql = templatePostgisExists
        ? `CREATE DATABASE ${quoteIdentifier(database)} TEMPLATE template_postgis`
        : `CREATE DATABASE ${quoteIdentifier(database)}`;

      await adminClient.query(createDatabaseSql);
    }
  } finally {
    await adminClient.end();
  }

  const appClient = new Client({
    host,
    port,
    user,
    password,
    database,
  });

  await appClient.connect();

  try {
    await appClient.query('CREATE EXTENSION IF NOT EXISTS postgis');
  } finally {
    await appClient.end();
  }
}
