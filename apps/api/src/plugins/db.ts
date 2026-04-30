import { createDb } from '@yuksales/db';
import { resolveDatabaseUrl } from '@yuksales/db/database-url';

export const db = createDb(resolveDatabaseUrl());


