import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url().default('postgres://YukSales:YukSales@localhost:5432/YukSales_sales'),
  API_PORT: z.coerce.number().default(4000),
  JWT_ACCESS_SECRET: z.string().min(12).default('change-me-access'),
  JWT_REFRESH_SECRET: z.string().min(12).default('change-me-refresh'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('1d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  WEB_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,https://localhost:5173,https://127.0.0.1:5173,https://localhost:5174,https://127.0.0.1:5174'),
  API_HTTPS_ENABLED: z.coerce.boolean().default(false),
  API_TLS_KEY_PATH: z.string().default('192.168.18.66+2-key.pem'),
  API_TLS_CERT_PATH: z.string().default('192.168.18.66+2.pem'),
  REFRESH_COOKIE_NAME: z.string().default('yuksales_refresh_token'),
  REFRESH_COOKIE_SECURE: z.coerce.boolean().default(true),
  APP_DEBUG: z.coerce.boolean().default(false),
});

export const env = envSchema.parse(process.env);

if (env.NODE_ENV === 'production') {
  const unsafeSecrets = [
    env.JWT_ACCESS_SECRET === 'change-me-access',
    env.JWT_REFRESH_SECRET === 'change-me-refresh',
    env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET,
  ];

  if (unsafeSecrets.some(Boolean)) {
    throw new Error('JWT secrets wajib diset unik dan aman pada production.');
  }
}
