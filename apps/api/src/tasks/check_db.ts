import './env.js';
import { db } from '../plugins/db.js';
import { resolveDatabaseUrl } from '@yuksales/db/database-url';
import { salesTransactions, companies } from '@yuksales/db/schema';
import { count, eq } from 'drizzle-orm';

async function checkData() {
  console.log(`[DEBUG] Resolved DB URL: ${resolveDatabaseUrl().replace(/:[^:]+@/, ':****@')}`);
  const allCompanies = await db.select().from(companies);
  console.log('\n--- COMPANY DATA CHECK ---');
  
  for (const comp of allCompanies) {
    const [orders] = await db.select({ val: count() })
      .from(salesTransactions)
      .where(eq(salesTransactions.companyId, comp.id));
    
    console.log(`Company: ${comp.name} (@${comp.slug})`);
    console.log(`ID: ${comp.id}`);
    console.log(`Total Orders: ${orders.val}`);
    console.log('---------------------------');
  }
}

checkData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
