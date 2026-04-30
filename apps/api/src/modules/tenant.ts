import type { FastifyRequest } from 'fastify';

export function requireTenantId(request: FastifyRequest) {
  const companyId = request.user?.companyId;

  if (!companyId) {
    throw Object.assign(new Error('Tenant context tidak ditemukan.'), { statusCode: 401 });
  }

  return companyId;
}


