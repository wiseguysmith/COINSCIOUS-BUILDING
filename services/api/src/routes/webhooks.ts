import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { HMACVerifier, validateWebhookPayload } from '../lib/hmac';
import { OnchainIntegration } from '../lib/onchain';
import { KYCWebhookSchema } from '../lib/validation';

/**
 * Webhooks route handler
 * @notice Handles external webhooks from KYC and compliance providers
 */
export default async function webhooksRoutes(
  fastify: FastifyInstance,
  options: {
    prisma: PrismaClient;
    hmacVerifier: HMACVerifier;
    onchainIntegration: OnchainIntegration;
  }
) {
  const { prisma, hmacVerifier, onchainIntegration } = options;

  // POST /webhooks/kyc - KYC webhook from Alloy/Parallel
  fastify.post('/webhooks/kyc', {
    schema: {
      body: KYCWebhookSchema,
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
          eventId: z.string()
        }),
        400: z.object({
          code: z.string(),
          message: z.string(),
          details: z.object({
            reason: z.string().optional()
          }).optional()
        }),
        409: z.object({
          code: z.string(),
          message: z.string(),
          details: z.object({
            reason: z.string().optional()
          }).optional()
        })
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as z.infer<typeof KYCWebhookSchema>;
      const headers = request.headers as Record<string, string>;
      
      // Determine vendor from headers or URL path
      const vendor = headers['x-vendor'] || 'alloy'; // Default to alloy
      
      // Verify HMAC signature
      const isValidSignature = hmacVerifier.verifyWebhookSignature(
        JSON.stringify(body),
        headers,
        vendor
      );

      if (!isValidSignature) {
        reply.code(401).send({
          code: 'UNAUTHORIZED',
          message: 'Invalid webhook signature',
          details: {
            reason: 'HMAC verification failed'
          }
        });
        return;
      }

      // Validate webhook payload structure
      const validatedPayload = validateWebhookPayload(body);
      if (!validatedPayload) {
        reply.code(400).send({
          code: 'BAD_REQUEST',
          message: 'Invalid webhook payload structure',
          details: {
            reason: 'Payload validation failed'
          }
        });
        return;
      }

      // Check for idempotency (prevent duplicate processing)
      const existingEvent = await prisma.webhookEvent.findUnique({
        where: {
          organizationId_vendor_eventId: {
            organizationId: 'default', // TODO: Extract from webhook or config
            vendor,
            eventId: body.eventId
          }
        }
      });

      if (existingEvent) {
        if (existingEvent.processed) {
          // Already processed, return success
          reply.send({
            success: true,
            message: 'Webhook already processed',
            eventId: body.eventId
          });
          return;
        } else {
          // Duplicate event, return conflict
          reply.code(409).send({
            code: 'CONFLICT',
            message: 'Duplicate webhook event',
            details: {
              reason: 'Event ID already exists'
            }
          });
          return;
        }
      }

      // Store webhook event for idempotency
      const webhookEvent = await prisma.webhookEvent.create({
        data: {
          organizationId: 'default', // TODO: Extract from webhook or config
          vendor,
          eventId: body.eventId,
          eventType: body.eventType,
          payload: body,
          processed: false
        }
      });

      // Process KYC webhook based on event type
      let onchainResult: string | null = null;
      
      switch (body.eventType) {
        case 'kyc_verified':
        case 'accreditation_updated':
          // Set compliance claims onchain
          onchainResult = await onchainIntegration.setClaims(
            body.data.wallet,
            {
              countryCode: body.data.countryCode,
              accredited: body.data.accredited,
              lockupUntil: body.data.lockupUntil ? new Date(body.data.lockupUntil) : undefined,
              revoked: body.data.revoked,
              expiresAt: new Date(body.data.expiresAt)
            },
            'default' // TODO: Extract organization ID from webhook or config
          );
          break;

        case 'kyc_rejected':
          // Mark wallet as non-compliant
          // This could involve revoking claims or setting a rejected status
          console.log('KYC rejected for wallet:', body.data.wallet);
          break;

        default:
          console.warn('Unknown KYC event type:', body.eventType);
      }

      // Mark webhook as processed
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { processed: true }
      });

      // Log the webhook processing
      await prisma.adminAction.create({
        data: {
          userId: 'system', // System action
          organizationId: 'default', // TODO: Extract from webhook or config
          action: 'PROCESS_KYC_WEBHOOK',
          details: {
            eventId: body.eventId,
            eventType: body.eventType,
            wallet: body.data.wallet,
            vendor,
            onchainResult,
            timestamp: new Date().toISOString()
          }
        }
      });

      reply.send({
        success: true,
        message: 'KYC webhook processed successfully',
        eventId: body.eventId
      });

    } catch (error) {
      console.error('Failed to process KYC webhook:', error);
      
      // Don't expose internal errors to webhook sender
      reply.code(500).send({
        code: 'INTERNAL_ERROR',
        message: 'Failed to process webhook',
        details: {
          reason: 'Internal server error'
        }
      });
    }
  });

  // GET /webhooks/events - List webhook events (for debugging)
  fastify.get('/webhooks/events', {
    schema: {
      querystring: z.object({
        vendor: z.string().optional(),
        eventType: z.string().optional(),
        processed: z.boolean().optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(20)
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          data: z.array(z.object({
            id: z.string(),
            vendor: z.string(),
            eventId: z.string(),
            eventType: z.string(),
            processed: z.boolean(),
            createdAt: z.date()
          })),
          pagination: z.object({
            page: z.number(),
            limit: z.number(),
            total: z.number(),
            totalPages: z.number()
          })
        })
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as {
        vendor?: string;
        eventType?: string;
        processed?: boolean;
        page: number;
        limit: number;
      };

      // Build filter conditions
      const where: any = {};
      
      if (query.vendor) {
        where.vendor = query.vendor;
      }
      
      if (query.eventType) {
        where.eventType = query.eventType;
      }
      
      if (query.processed !== undefined) {
        where.processed = query.processed;
      }

      // Get total count
      const total = await prisma.webhookEvent.count({ where });

      // Get webhook events with pagination
      const events = await prisma.webhookEvent.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          vendor: true,
          eventId: true,
          eventType: true,
          processed: true,
          createdAt: true
        }
      });

      const totalPages = Math.ceil(total / query.limit);

      reply.send({
        success: true,
        data: events,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages
        }
      });

    } catch (error) {
      console.error('Failed to fetch webhook events:', error);
      reply.code(500).send({
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch webhook events'
      });
    }
  });

  // POST /webhooks/test - Test webhook endpoint for development
  fastify.post('/webhooks/test', {
    schema: {
      body: z.object({
        message: z.string().optional(),
        timestamp: z.string().optional()
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
          receivedAt: z.string()
        })
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as { message?: string; timestamp?: string };
      
      reply.send({
        success: true,
        message: body.message || 'Test webhook received',
        receivedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Failed to process test webhook:', error);
      reply.code(500).send({
        code: 'INTERNAL_ERROR',
        message: 'Failed to process test webhook'
      });
    }
  });
}
