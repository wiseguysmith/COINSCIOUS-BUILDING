import { test, expect, describe, beforeAll, afterAll } from '@jest/globals';
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { HMACVerifier } from '../lib/hmac';
import { OnchainIntegration } from '../lib/onchain';
import webhooksRoutes from '../routes/webhooks';

/**
 * End-to-end tests for KYC webhook endpoint
 * @notice Tests idempotency, HMAC verification, and proper processing
 */

describe('KYC Webhook Endpoint', () => {
  let fastify: Fastify.FastifyInstance;
  let prisma: PrismaClient;
  let hmacVerifier: HMACVerifier;
  let onchainIntegration: OnchainIntegration;

  // Test data
  const testEventId = 'test-event-123';
  const testWallet = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
  const testSecret = 'test-hmac-secret-key-for-testing-purposes-only';
  const testOrganizationId = 'test-org-123';

  beforeAll(async () => {
    // Create test Fastify instance
    fastify = Fastify({
      logger: false // Disable logging for tests
    });

    // Initialize test database (use test database URL)
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/coinscious_test'
        }
      }
    });

    // Initialize utilities
    hmacVerifier = new HMACVerifier(testSecret);
    onchainIntegration = new OnchainIntegration(prisma);

    // Register webhook routes
    await fastify.register(webhooksRoutes, {
      prisma,
      hmacVerifier,
      onchainIntegration
    });

    // Create test organization
    await prisma.organization.create({
      data: {
        id: testOrganizationId,
        name: 'Test Organization',
        slug: 'test-org'
      }
    });

    // Create test user
    await prisma.user.create({
      data: {
        id: 'test-user-123',
        email: 'test@example.com',
        passwordHash: 'test-hash',
        role: 'ADMIN',
        organizationId: testOrganizationId
      }
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.webhookEvent.deleteMany({
      where: { organizationId: testOrganizationId }
    });
    await prisma.adminAction.deleteMany({
      where: { organizationId: testOrganizationId }
    });
    await prisma.user.deleteMany({
      where: { organizationId: testOrganizationId }
    });
    await prisma.organization.delete({
      where: { id: testOrganizationId }
    });

    // Close connections
    await prisma.$disconnect();
    await fastify.close();
  });

  beforeEach(async () => {
    // Clean up webhook events before each test
    await prisma.webhookEvent.deleteMany({
      where: { organizationId: testOrganizationId }
    });
  });

  describe('POST /webhooks/kyc', () => {
    const basePayload = {
      eventId: testEventId,
      eventType: 'kyc_verified' as const,
      timestamp: new Date().toISOString(),
      data: {
        wallet: testWallet,
        countryCode: 'US',
        accredited: true,
        lockupUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        revoked: false,
        expiresAt: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString() // 2 years from now
      }
    };

    const generateSignature = (payload: any) => {
      return hmacVerifier.generateSignature(JSON.stringify(payload));
    };

    test('should process valid KYC webhook successfully', async () => {
      const payload = { ...basePayload };
      const signature = generateSignature(payload);

      const response = await fastify.inject({
        method: 'POST',
        url: '/webhooks/kyc',
        headers: {
          'x-alloy-signature': signature,
          'x-vendor': 'alloy'
        },
        payload
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual({
        success: true,
        message: 'KYC webhook processed successfully',
        eventId: testEventId
      });

      // Verify webhook event was stored
      const webhookEvent = await prisma.webhookEvent.findUnique({
        where: {
          organizationId_vendor_eventId: {
            organizationId: testOrganizationId,
            vendor: 'alloy',
            eventId: testEventId
          }
        }
      });

      expect(webhookEvent).toBeTruthy();
      expect(webhookEvent?.processed).toBe(true);
      expect(webhookEvent?.payload).toEqual(payload);
    });

    test('should reject webhook with invalid HMAC signature', async () => {
      const payload = { ...basePayload };
      const invalidSignature = 'invalid-signature';

      const response = await fastify.inject({
        method: 'POST',
        url: '/webhooks/kyc',
        headers: {
          'x-alloy-signature': invalidSignature,
          'x-vendor': 'alloy'
        },
        payload
      });

      expect(response.statusCode).toBe(401);
      const responseBody = JSON.parse(response.payload);
      expect(responseBody.code).toBe('UNAUTHORIZED');
      expect(responseBody.message).toBe('Invalid webhook signature');
    });

    test('should reject webhook with missing signature header', async () => {
      const payload = { ...basePayload };

      const response = await fastify.inject({
        method: 'POST',
        url: '/webhooks/kyc',
        headers: {
          'x-vendor': 'alloy'
        },
        payload
      });

      expect(response.statusCode).toBe(401);
      const responseBody = JSON.parse(response.payload);
      expect(responseBody.code).toBe('UNAUTHORIZED');
      expect(responseBody.message).toBe('Invalid webhook signature');
    });

    test('should reject webhook with invalid payload structure', async () => {
      const invalidPayload = {
        eventId: testEventId,
        // Missing required fields
        eventType: 'invalid_type',
        data: {
          wallet: 'invalid-wallet-address'
        }
      };

      const signature = generateSignature(invalidPayload);

      const response = await fastify.inject({
        method: 'POST',
        url: '/webhooks/kyc',
        headers: {
          'x-alloy-signature': signature,
          'x-vendor': 'alloy'
        },
        payload: invalidPayload
      });

      expect(response.statusCode).toBe(400);
      const responseBody = JSON.parse(response.payload);
      expect(responseBody.code).toBe('BAD_REQUEST');
      expect(responseBody.message).toBe('Invalid webhook payload structure');
    });

    test('should handle duplicate webhook events with idempotency', async () => {
      const payload = { ...basePayload };
      const signature = generateSignature(payload);

      // First webhook - should succeed
      const firstResponse = await fastify.inject({
        method: 'POST',
        url: '/webhooks/kyc',
        headers: {
          'x-alloy-signature': signature,
          'x-vendor': 'alloy'
        },
        payload
      });

      expect(firstResponse.statusCode).toBe(200);

      // Second webhook with same event ID - should return success (already processed)
      const secondResponse = await fastify.inject({
        method: 'POST',
        url: '/webhooks/kyc',
        headers: {
          'x-alloy-signature': signature,
          'x-vendor': 'alloy'
        },
        payload
      });

      expect(secondResponse.statusCode).toBe(200);
      const responseBody = JSON.parse(secondResponse.payload);
      expect(responseBody.message).toBe('Webhook already processed');

      // Verify only one webhook event was stored
      const webhookEvents = await prisma.webhookEvent.findMany({
        where: {
          organizationId: testOrganizationId,
          vendor: 'alloy',
          eventId: testEventId
        }
      });

      expect(webhookEvents).toHaveLength(1);
      expect(webhookEvents[0]?.processed).toBe(true);
    });

    test('should process different event types correctly', async () => {
      const eventTypes = ['kyc_verified', 'kyc_rejected', 'accreditation_updated'];

      for (const eventType of eventTypes) {
        const payload = {
          ...basePayload,
          eventId: `${testEventId}-${eventType}`,
          eventType: eventType as any
        };
        const signature = generateSignature(payload);

        const response = await fastify.inject({
          method: 'POST',
          url: '/webhooks/kyc',
          headers: {
            'x-alloy-signature': signature,
            'x-vendor': 'alloy'
          },
          payload
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.payload).success).toBe(true);
      }
    });

    test('should handle webhook with different vendors', async () => {
      const vendors = ['alloy', 'parallel'];

      for (const vendor of vendors) {
        const payload = {
          ...basePayload,
          eventId: `${testEventId}-${vendor}`
        };
        const signature = generateSignature(payload);

        const response = await fastify.inject({
          method: 'POST',
          url: '/webhooks/kyc',
          headers: {
            [`x-${vendor}-signature`]: signature,
            'x-vendor': vendor
          },
          payload
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.payload).success).toBe(true);
      }
    });

    test('should log admin actions for webhook processing', async () => {
      const payload = { ...basePayload };
      const signature = generateSignature(payload);

      await fastify.inject({
        method: 'POST',
        url: '/webhooks/kyc',
        headers: {
          'x-alloy-signature': signature,
          'x-vendor': 'alloy'
        },
        payload
      });

      // Verify admin action was logged
      const adminAction = await prisma.adminAction.findFirst({
        where: {
          organizationId: testOrganizationId,
          action: 'PROCESS_KYC_WEBHOOK'
        }
      });

      expect(adminAction).toBeTruthy();
      expect(adminAction?.details).toMatchObject({
        eventId: testEventId,
        eventType: 'kyc_verified',
        wallet: testWallet,
        vendor: 'alloy'
      });
    });

    test('should handle webhook processing errors gracefully', async () => {
      // Create a payload that will cause an error (invalid wallet format)
      const invalidPayload = {
        ...basePayload,
        data: {
          ...basePayload.data,
          wallet: 'invalid-wallet'
        }
      };

      const signature = generateSignature(invalidPayload);

      const response = await fastify.inject({
        method: 'POST',
        url: '/webhooks/kyc',
        headers: {
          'x-alloy-signature': signature,
          'x-vendor': 'alloy'
        },
        payload: invalidPayload
      });

      // Should still return 200 to webhook sender (don't expose internal errors)
      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /webhooks/events', () => {
    test('should list webhook events with pagination', async () => {
      // Create some test webhook events
      const testEvents = [
        { eventId: 'event-1', eventType: 'kyc_verified', vendor: 'alloy' },
        { eventId: 'event-2', eventType: 'kyc_rejected', vendor: 'parallel' },
        { eventId: 'event-3', eventType: 'accreditation_updated', vendor: 'alloy' }
      ];

      for (const event of testEvents) {
        await prisma.webhookEvent.create({
          data: {
            organizationId: testOrganizationId,
            vendor: event.vendor,
            eventId: event.eventId,
            eventType: event.eventType,
            payload: { test: 'data' },
            processed: true
          }
        });
      }

      const response = await fastify.inject({
        method: 'GET',
        url: '/webhooks/events?page=1&limit=2'
      });

      expect(response.statusCode).toBe(200);
      const responseBody = JSON.parse(response.payload);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data).toHaveLength(2);
      expect(responseBody.pagination.total).toBe(3);
      expect(responseBody.pagination.totalPages).toBe(2);
    });

    test('should filter webhook events by vendor and event type', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/webhooks/events?vendor=alloy&eventType=kyc_verified'
      });

      expect(response.statusCode).toBe(200);
      const responseBody = JSON.parse(response.payload);
      expect(responseBody.success).toBe(true);
      
      // All returned events should match the filter
      responseBody.data.forEach((event: any) => {
        expect(event.vendor).toBe('alloy');
        expect(event.eventType).toBe('kyc_verified');
      });
    });
  });
});
