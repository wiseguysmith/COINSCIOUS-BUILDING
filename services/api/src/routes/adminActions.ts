import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole } from '../lib/auth';

const prisma = new PrismaClient();

// Query parameters for filtering admin actions
const listQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  action: z.string().optional(),
  targetType: z.string().optional(),
  actorId: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50)
});

// Response schema for admin actions
const adminActionSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  actorId: z.string(),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string().nullable(),
  reason: z.string().nullable(),
  meta: z.any().nullable(),
  createdAt: z.string()
});

const listResponseSchema = z.object({
  actions: z.array(adminActionSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number()
  })
});

export default async function adminActionsRoutes(fastify: FastifyInstance) {
  // GET /admin-actions - List admin actions with filtering and pagination
  fastify.get('/admin-actions', {
    schema: {
      querystring: listQuerySchema,
      response: {
        200: listResponseSchema
      }
    },
    preHandler: [authenticate, requireRole(['ADMIN', 'COMPLIANCE', 'ANALYST'])]
  }, async (request: FastifyRequest<{ Querystring: z.infer<typeof listQuerySchema> }>, reply: FastifyReply) => {
    try {
      const { from, to, action, targetType, actorId, page, limit } = request.query;
      const user = request.user!;
      
      // Build where clause
      const where: any = {
        orgId: user.organizationId
      };
      
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
      }
      
      if (action) {
        where.action = { contains: action, mode: 'insensitive' };
      }
      
      if (targetType) {
        where.targetType = { contains: targetType, mode: 'insensitive' };
      }
      
      if (actorId) {
        where.actorId = actorId;
      }
      
      // Calculate pagination
      const skip = (page - 1) * limit;
      
      // Get total count
      const total = await prisma.adminAction.count({ where });
      const totalPages = Math.ceil(total / limit);
      
      // Get actions with pagination
      const actions = await prisma.adminAction.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      });
      
      // Transform to response format
      const responseActions = actions.map(action => ({
        id: action.id,
        orgId: action.orgId,
        actorId: action.actorId,
        action: action.action,
        targetType: action.targetType,
        targetId: action.targetId,
        reason: action.reason,
        meta: action.meta,
        createdAt: action.createdAt.toISOString(),
        actor: action.actor
      }));
      
      return reply.send({
        actions: responseActions,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      });
      
    } catch (error) {
      request.log.error('Error fetching admin actions:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch admin actions'
      });
    }
  });
  
  // GET /admin-actions/:id - Get specific admin action
  fastify.get('/admin-actions/:id', {
    schema: {
      params: z.object({
        id: z.string()
      }),
      response: {
        200: adminActionSchema.extend({
          actor: z.object({
            id: z.string(),
            email: z.string(),
            firstName: z.string().nullable(),
            lastName: z.string().nullable(),
            role: z.string()
          })
        })
      }
    },
    preHandler: [authenticate, requireRole(['ADMIN', 'COMPLIANCE', 'ANALYST'])]
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const user = request.user!;
      
      const action = await prisma.adminAction.findFirst({
        where: {
          id,
          orgId: user.organizationId
        },
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        }
      });
      
      if (!action) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'Admin action not found'
        });
      }
      
      return reply.send({
        id: action.id,
        orgId: action.orgId,
        actorId: action.actorId,
        action: action.action,
        targetType: action.targetType,
        targetId: action.targetId,
        reason: action.reason,
        meta: action.meta,
        createdAt: action.createdAt.toISOString(),
        actor: action.actor
      });
      
    } catch (error) {
      request.log.error('Error fetching admin action:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch admin action'
      });
    }
  });
  
  // GET /admin-actions/export/csv - Export admin actions as CSV
  fastify.get('/admin-actions/export/csv', {
    schema: {
      querystring: listQuerySchema.omit({ page: true, limit: true })
    },
    preHandler: [authenticate, requireRole(['ADMIN', 'COMPLIANCE'])]
  }, async (request: FastifyRequest<{ Querystring: Omit<z.infer<typeof listQuerySchema>, 'page' | 'limit'> }>, reply: FastifyReply) => {
    try {
      const { from, to, action, targetType, actorId } = request.query;
      const user = request.user!;
      
      // Build where clause (same as list endpoint)
      const where: any = {
        orgId: user.organizationId
      };
      
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
      }
      
      if (action) {
        where.action = { contains: action, mode: 'insensitive' };
      }
      
      if (targetType) {
        where.targetType = { contains: targetType, mode: 'insensitive' };
      }
      
      if (actorId) {
        where.actorId = actorId;
      }
      
      // Get all actions for export
      const actions = await prisma.adminAction.findMany({
        where,
        include: {
          actor: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      // Generate CSV
      const csvHeaders = [
        'ID',
        'Organization ID',
        'Actor Email',
        'Actor Name',
        'Actor Role',
        'Action',
        'Target Type',
        'Target ID',
        'Reason',
        'Created At'
      ];
      
      const csvRows = actions.map(action => [
        action.id,
        action.orgId,
        action.actor.email,
        `${action.actor.firstName || ''} ${action.actor.lastName || ''}`.trim(),
        action.actor.role,
        action.action,
        action.targetType,
        action.targetId || '',
        action.reason || '',
        action.createdAt.toISOString()
      ]);
      
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
      
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="admin-actions.csv"');
      
      return reply.send(csvContent);
      
    } catch (error) {
      request.log.error('Error exporting admin actions:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to export admin actions'
      });
    }
  });
  
  // GET /admin-actions/audit-summary - Get audit summary statistics
  fastify.get('/admin-actions/audit-summary', {
    schema: {
      querystring: z.object({
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional()
      })
    },
    preHandler: [authenticate, requireRole(['ADMIN', 'COMPLIANCE'])]
  }, async (request: FastifyRequest<{ Querystring: { from?: string; to?: string } }>, reply: FastifyReply) => {
    try {
      const { from, to } = request.query;
      const user = request.user!;
      
      const where: any = {
        orgId: user.organizationId
      };
      
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
      }
      
      // Get summary statistics
      const [totalActions, actionTypes, topActors] = await Promise.all([
        prisma.adminAction.count({ where }),
        prisma.adminAction.groupBy({
          by: ['action'],
          where,
          _count: {
            action: true
          },
          orderBy: {
            _count: {
              action: 'desc'
            }
          },
          take: 10
        }),
        prisma.adminAction.groupBy({
          by: ['actorId'],
          where,
          _count: {
            actorId: true
          },
          orderBy: {
            _count: {
              actorId: 'desc'
            }
          },
          take: 10
        })
      ]);
      
      // Get actor details for top actors
      const topActorDetails = await Promise.all(
        topActors.map(async (actor) => {
          const user = await prisma.user.findUnique({
            where: { id: actor.actorId },
            select: { email: true, firstName: true, lastName: true, role: true }
          });
          return {
            actorId: actor.actorId,
            count: actor._count.actorId,
            user
          };
        })
      );
      
      return reply.send({
        totalActions,
        actionTypes: actionTypes.map(type => ({
          action: type.action,
          count: type._count.action
        })),
        topActors: topActorDetails,
        dateRange: {
          from: from || 'all',
          to: to || 'all'
        }
      });
      
    } catch (error) {
      request.log.error('Error generating audit summary:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to generate audit summary'
      });
    }
  });
}
