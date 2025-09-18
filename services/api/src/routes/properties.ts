import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  CreatePropertySchema,
  UpdatePropertySchema,
  PropertyFilterSchema,
  PropertyResponseSchema,
  requireIdempotency
} from '../lib/validation';
import { AuthService, AuthenticatedRequest } from '../lib/auth';

/**
 * Properties route handler
 * @notice Manages real estate properties and deals
 */
export default async function propertiesRoutes(
  fastify: FastifyInstance,
  options: { prisma: PrismaClient; authService: AuthService }
) {
  const { prisma, authService } = options;

  // GET /properties - List properties with filtering
  fastify.get('/properties', {
    schema: {
      querystring: PropertyFilterSchema,
      response: {
        200: z.object({
          success: z.boolean(),
          data: z.array(PropertyResponseSchema),
          pagination: z.object({
            page: z.number(),
            limit: z.number(),
            total: z.number(),
            totalPages: z.number()
          })
        })
      }
    },
    preHandler: [authService.authenticate, authService.requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authRequest = request as AuthenticatedRequest;
      const query = request.query as z.infer<typeof PropertyFilterSchema>;
      
      const organizationId = authRequest.user.organizationId;
      
      // Build filter conditions
      const where: any = {
        organizationId,
        isActive: query.isActive !== undefined ? query.isActive : true
      };

      if (query.partitions && query.partitions.length > 0) {
        where.partitions = {
          hasSome: query.partitions
        };
      }

      if (query.minValuation !== undefined) {
        where.valuationUSD = {
          ...where.valuationUSD,
          gte: query.minValuation
        };
      }

      if (query.maxValuation !== undefined) {
        where.valuationUSD = {
          ...where.valuationUSD,
          lte: query.maxValuation
        };
      }

      // Get total count
      const total = await prisma.property.count({ where });

      // Get properties with pagination
      const properties = await prisma.property.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: {
          [query.sortBy || 'createdAt']: query.sortOrder
        }
      });

      const totalPages = Math.ceil(total / query.limit);

      reply.send({
        success: true,
        data: properties.map(prop => ({
          ...prop,
          totalShares: prop.totalShares.toString() // Convert BigInt to string
        })),
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages
        }
      });
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      reply.code(500).send({
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch properties'
      });
    }
  });

  // POST /properties - Create new property
  fastify.post('/properties', {
    schema: {
      body: CreatePropertySchema,
      response: {
        201: z.object({
          success: z.boolean(),
          data: PropertyResponseSchema,
          message: z.string()
        })
      }
    },
    preHandler: [
      requireIdempotency,
      authService.authenticate,
      authService.requireAdmin
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authRequest = request as AuthenticatedRequest;
      const body = request.body as z.infer<typeof CreatePropertySchema>;
      
      const organizationId = authRequest.user.organizationId;

      // Check for duplicate property name in organization
      const existingProperty = await prisma.property.findFirst({
        where: {
          organizationId,
          name: body.name,
          isActive: true
        }
      });

      if (existingProperty) {
        reply.code(409).send({
          code: 'CONFLICT',
          message: 'Property with this name already exists'
        });
        return;
      }

      // Create property
      const property = await prisma.property.create({
        data: {
          ...body,
          organizationId
        }
      });

      // Log admin action
      await prisma.adminAction.create({
        data: {
          userId: authRequest.user.id,
          organizationId,
          action: 'CREATE_PROPERTY',
          details: {
            propertyId: property.id,
            propertyName: property.name,
            timestamp: new Date().toISOString()
          }
        }
      });

      reply.code(201).send({
        success: true,
        data: {
          ...property,
          totalShares: property.totalShares.toString() // Convert BigInt to string
        },
        message: 'Property created successfully'
      });
    } catch (error) {
      console.error('Failed to create property:', error);
      reply.code(500).send({
        code: 'INTERNAL_ERROR',
        message: 'Failed to create property'
      });
    }
  });

  // GET /properties/:id - Get property by ID
  fastify.get('/properties/:id', {
    schema: {
      params: z.object({
        id: z.string().cuid('Invalid property ID')
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          data: PropertyResponseSchema
        })
      }
    },
    preHandler: [authService.authenticate, authService.requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authRequest = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      
      const organizationId = authRequest.user.organizationId;

      const property = await prisma.property.findFirst({
        where: {
          id,
          organizationId,
          isActive: true
        }
      });

      if (!property) {
        reply.code(404).send({
          code: 'NOT_FOUND',
          message: 'Property not found'
        });
        return;
      }

      reply.send({
        success: true,
        data: {
          ...property,
          totalShares: property.totalShares.toString() // Convert BigInt to string
        }
      });
    } catch (error) {
      console.error('Failed to fetch property:', error);
      reply.code(500).send({
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch property'
      });
    }
  });

  // PUT /properties/:id - Update property
  fastify.put('/properties/:id', {
    schema: {
      params: z.object({
        id: z.string().cuid('Invalid property ID')
      }),
      body: UpdatePropertySchema,
      response: {
        200: z.object({
          success: z.boolean(),
          data: PropertyResponseSchema,
          message: z.string()
        })
      }
    },
    preHandler: [
      requireIdempotency,
      authService.authenticate,
      authService.requireAdmin
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authRequest = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const body = request.body as z.infer<typeof UpdatePropertySchema>;
      
      const organizationId = authRequest.user.organizationId;

      // Check if property exists and belongs to organization
      const existingProperty = await prisma.property.findFirst({
        where: {
          id,
          organizationId,
          isActive: true
        }
      });

      if (!existingProperty) {
        reply.code(404).send({
          code: 'NOT_FOUND',
          message: 'Property not found'
        });
        return;
      }

      // Update property
      const property = await prisma.property.update({
        where: { id },
        data: body
      });

      // Log admin action
      await prisma.adminAction.create({
        data: {
          userId: authRequest.user.id,
          organizationId,
          action: 'UPDATE_PROPERTY',
          details: {
            propertyId: property.id,
            propertyName: property.name,
            changes: body,
            timestamp: new Date().toISOString()
          }
        }
      });

      reply.send({
        success: true,
        data: {
          ...property,
          totalShares: property.totalShares.toString() // Convert BigInt to string
        },
        message: 'Property updated successfully'
      });
    } catch (error) {
      console.error('Failed to update property:', error);
      reply.code(500).send({
        code: 'INTERNAL_ERROR',
        message: 'Failed to update property'
      });
    }
  });

  // DELETE /properties/:id - Soft delete property
  fastify.delete('/properties/:id', {
    schema: {
      params: z.object({
        id: z.string().cuid('Invalid property ID')
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string()
        })
      }
    },
    preHandler: [
      requireIdempotency,
      authService.authenticate,
      authService.requireAdmin
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authRequest = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      
      const organizationId = authRequest.user.organizationId;

      // Check if property exists and belongs to organization
      const existingProperty = await prisma.property.findFirst({
        where: {
          id,
          organizationId,
          isActive: true
        }
      });

      if (!existingProperty) {
        reply.code(404).send({
          code: 'NOT_FOUND',
          message: 'Property not found'
        });
        return;
      }

      // Soft delete property
      await prisma.property.update({
        where: { id },
        data: { isActive: false }
      });

      // Log admin action
      await prisma.adminAction.create({
        data: {
          userId: authRequest.user.id,
          organizationId,
          action: 'DELETE_PROPERTY',
          details: {
            propertyId: id,
            propertyName: existingProperty.name,
            timestamp: new Date().toISOString()
          }
        }
      });

      reply.send({
        success: true,
        message: 'Property deleted successfully'
      });
    } catch (error) {
      console.error('Failed to delete property:', error);
      reply.code(500).send({
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete property'
      });
    }
  });
}
