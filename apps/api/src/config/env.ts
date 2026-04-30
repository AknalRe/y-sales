import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const envSchema = z.object({
  DATABASE_URL: z.string().url().default('postgres://YukSales:YukSales@localhost:5432/YukSales_sales'),
  API_PORT: z.coerce.number().default(4000),
  JWT_ACCESS_SECRET: z.string().min(12).default('change-me-access'),
  JWT_REFRESH_SECRET: z.string().min(12).default('change-me-refresh'),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  APP_DEBUG: z.coerce.boolean().default(false),
});

export const env = envSchema.parse(process.env);


