import type { FastifyInstance } from 'fastify';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { inventoryBalances, inventoryMovements, products, warehouses } from '@yuksales/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { requireTenantId } from '../tenant.js';
import { writeAuditLog } from '../audit/audit.service.js';

const productSchema = z.object({
  sku: z.string().min(2).optional(),
  name: z.string().min(2),
  description: z.string().optional(),
  unit: z.string().min(1).default('pcs'),
  priceDefault: z.string().or(z.number()).transform(String).default('0'),
  initialStock: z.string().or(z.number()).transform(String).optional(),
});

const productUpdateSchema = productSchema.omit({ initialStock: true }).partial().extend({
  status: z.enum(['active', 'inactive']).optional(),
});

function codeSegment(value: string) {
  const words = value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean);
  const segment = words.length > 1
    ? words.map((word) => word[0]).join('').slice(0, 4).toUpperCase()
    : (words[0] ?? '').slice(0, 4).toUpperCase();
  return segment || 'ITEM';
}

function generateProductSku(name: string) {
  return `PRD-${codeSegment(name)}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function nextSequentialCode(prefix: string, existingCodes: string[]) {
  const matcher = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`);
  const max = existingCodes.reduce((currentMax, code) => {
    const match = matcher.exec(code);
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

export async function productRoutes(app: FastifyInstance) {
  app.get('/products', { preHandler: requirePermission('sales.view') }, async (request) => {
    const companyId = requireTenantId(request);
    const rows = await db.select().from(products).where(eq(products.companyId, companyId)).orderBy(asc(products.name));
    return { products: rows };
  });

  app.post('/products', { preHandler: requirePermission('products.manage') }, async (request) => {
    const companyId = requireTenantId(request);
    const body = productSchema.parse(request.body);
    const skuPrefix = generateProductSku(body.name);
    const existingProductCodes = body.sku?.trim()
      ? []
      : (await db.select({ sku: products.sku }).from(products).where(eq(products.companyId, companyId))).map((product) => product.sku);
    const sku = body.sku?.trim() || nextSequentialCode(skuPrefix, existingProductCodes);
    const product = await db.transaction(async (tx) => {
      const [prod] = await tx.insert(products).values({
        companyId,
        sku,
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

      const [mainWarehouse] = await tx.select().from(warehouses).where(and(eq(warehouses.companyId, companyId), eq(warehouses.code, 'WH-MAIN')));
      if (mainWarehouse && body.initialStock) {
        await tx.insert(inventoryBalances).values({
          companyId,
          warehouseId: mainWarehouse.id,
          productId: prod.id,
          quantity: body.initialStock,
          reservedQuantity: '0',
        }).onConflictDoUpdate({
          target: [inventoryBalances.warehouseId, inventoryBalances.productId],
          set: { quantity: body.initialStock, updatedAt: new Date() },
        });
        await tx.insert(inventoryMovements).values({
          companyId,
          warehouseId: mainWarehouse.id,
          productId: prod.id,
          movementType: 'adjustment',
          quantityDelta: body.initialStock,
          referenceType: 'admin_stock_input',
          notes: 'Input stok utama dari admin',
          createdByUserId: request.user?.id,
        });
      }

      return prod;
    });

    await writeAuditLog({ request, action: 'product.created', entityType: 'product', entityId: product.id, newValues: product });

    return { product };
  });

  app.patch('/products/:id', { preHandler: requirePermission('products.manage') }, async (request, reply) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = productUpdateSchema.parse(request.body);
    const [existing] = await db.select().from(products).where(and(eq(products.companyId, companyId), eq(products.id, params.id))).limit(1);
    if (!existing) return reply.status(404).send({ message: 'Produk tidak ditemukan.' });

    const [product] = await db.update(products).set({
      ...body,
      updatedAt: new Date(),
    }).where(and(eq(products.companyId, companyId), eq(products.id, params.id))).returning();

    await writeAuditLog({ request, action: 'product.updated', entityType: 'product', entityId: product.id, oldValues: existing, newValues: product });

    return { product };
  });

  app.delete('/products/:id', { preHandler: requirePermission('products.manage') }, async (request, reply) => {
    const companyId = requireTenantId(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [existing] = await db.select().from(products).where(and(eq(products.companyId, companyId), eq(products.id, params.id))).limit(1);
    if (!existing) return reply.status(404).send({ message: 'Produk tidak ditemukan.' });

    const balances = await db.select().from(inventoryBalances).where(and(eq(inventoryBalances.companyId, companyId), eq(inventoryBalances.productId, params.id)));
    const hasStock = balances.some((balance) => Number(balance.quantity) > 0 || Number(balance.reservedQuantity) > 0);
    if (hasStock) {
      const [product] = await db.update(products).set({ status: 'inactive', updatedAt: new Date() }).where(and(eq(products.companyId, companyId), eq(products.id, params.id))).returning();
      await writeAuditLog({ request, action: 'product.deleted', entityType: 'product', entityId: product.id, oldValues: existing, newValues: product });
      return { product };
    }

    await db.delete(products).where(and(eq(products.companyId, companyId), eq(products.id, params.id)));
    await writeAuditLog({ request, action: 'product.deleted', entityType: 'product', entityId: params.id, oldValues: existing });
    return { success: true };
  });
}
