export function isSupabaseDatabaseEnabled(env: NodeJS.ProcessEnv = process.env) {
  return String(env.SUPABASE_DATABASE ?? '').toLowerCase() === 'true';
}

export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  if (!isSupabaseDatabaseEnabled(env)) {
    return env.DATABASE_URL ?? 'postgres://YukSales:YukSales@localhost:5432/YukSales_sales';
  }

  if (env.SUPABASE_POOLER_DATABASE_URL) {
    return env.SUPABASE_POOLER_DATABASE_URL;
  }

  if (env.SUPABASE_DATABASE_URL) {
    return env.SUPABASE_DATABASE_URL;
  }

  if (env.SUPABASE_PROJECT_REF && env.DATABASE_PASS) {
    const password = encodeURIComponent(env.DATABASE_PASS);
    const host = `aws-0-ap-southeast-1.pooler.supabase.com`;
    const user = `postgres.${env.SUPABASE_PROJECT_REF}`;
    return `postgresql://${user}:${password}@${host}:6543/postgres`;
  }

  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

  throw new Error('SUPABASE_DATABASE=true membutuhkan SUPABASE_DATABASE_URL, SUPABASE_POOLER_DATABASE_URL, atau SUPABASE_PROJECT_REF + DATABASE_PASS.');
}

export function getPostgresClientOptions(env: NodeJS.ProcessEnv = process.env) {
  if (!isSupabaseDatabaseEnabled(env)) {
    return { max: 10 };
  }

  return {
    max: Number(env.DB_POOL_MAX ?? 5),
    idle_timeout: Number(env.DB_IDLE_TIMEOUT_SECONDS ?? 20),
    connect_timeout: Number(env.DB_CONNECT_TIMEOUT_SECONDS ?? 30),
    prepare: false,
    ssl: 'require' as const,
  };
}



