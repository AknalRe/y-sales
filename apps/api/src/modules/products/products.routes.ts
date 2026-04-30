import type { FastifyInstance } from 'fastify';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { inventoryBalances, inventoryMovements, products, warehouses } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';

const productSchema = z.object({
  sku: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
  unit: z.string().min(1).default('pcs'),
  priceDefault: z.string().or(z.number()).transform(String).default('0'),
  initialStock: z.string().or(z.number()).transform(String).optional(),
});

export async function productRoutes(app: FastifyInstance) {
  app.get('/products', { preHandler: requirePermission('sales.view') }, async (request) => {
    const companyId = requireTenantId(request);
    const rows = await db.select().from(products).where(eq(products.companyId, companyId)).orderBy(asc(products.name));
    return { products: rows };
  });

  app.post('/products', { preHandler: requirePermission('products.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const body = productSchema.parse(request.body);
    const [product] = await db.insert(products).values({
      companyId,
      sku: body.sku,
      name: body.name,
      description: body.description,
      unit: body.unit,
      priceDefault: body.priceDefault,
      status: 'active',
    }).onConflictDoUpdate({
      target: [products.companyId, products.sku],
      set: {
        name: body.name,
        description: body.description,
        unit: body.unit,
        priceDefault: body.priceDefault,
        updatedAt: new Date(),
      },
    }).returning();

    const [mainWarehouse] = await db.select().from(warehouses).where(and(eq(warehouses.companyId, companyId), eq(warehouses.code, 'WH-MAIN')));
    if (mainWarehouse && body.initialStock) {
      await db.insert(inventoryBalances).values({
        companyId,
        warehouseId: mainWarehouse.id,
        productId: product.id,
        quantity: body.initialStock,
        reservedQuantity: '0',
      }).onConflictDoUpdate({
        target: [inventoryBalances.warehouseId, inventoryBalances.productId],
        set: { quantity: body.initialStock, updatedAt: new Date() },
      });
      await db.insert(inventoryMovements).values({
        companyId,
        warehouseId: mainWarehouse.id,
        productId: product.id,
        movementType: 'adjustment',
        quantityDelta: body.initialStock,
        referenceType: 'admin_stock_input',
        notes: 'Input stok utama dari admin',
        createdByUserId: request.user?.id,
      });
    }

    return { product };
  });
}


