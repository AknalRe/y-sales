import { z } from 'zod';

export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 200;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
});

export function parsePaginationQuery(query: unknown) {
  const parsed = paginationQuerySchema.parse(query ?? {});
  const offset = (parsed.page - 1) * parsed.limit;
  return {
    page: parsed.page,
    limit: parsed.limit,
    offset,
  };
}
