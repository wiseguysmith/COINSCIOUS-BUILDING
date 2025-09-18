import request from 'supertest';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createTestServer } from '../testUtils/server';
import { createTestUser, createTestOrganization } from '../testUtils/data';

const prisma = new PrismaClient();

describe('Admin Actions API', () => {
  let app: FastifyInstance;
  let adminUser: any;
  let complianceUser: any;
  let analystUser: any;
  let organization: any;
  let adminToken: string;
  let complianceToken: string;
  let analystToken: string;

  beforeAll(async () => {
    app = await createTestServer();
    
    // Create test organization
    organization = await createTestOrganization();
    
    // Create test users with different roles
    adminUser = await createTestUser(organization.id, 'ADMIN');
    complianceUser = await createTestUser(organization.id, 'COMPLIANCE');
    analystUser = await createTestUser(organization.id, 'ANALYST');
    
    // Generate tokens
    adminToken = `Bearer ${adminUser.token}`;
    complianceToken = `Bearer ${complianceUser.token}`;
    analystToken = `Bearer ${analystUser.token}`;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear admin actions before each test
    await prisma.adminAction.deleteMany({
      where: { orgId: organization.id }
    });
  });

  describe('GET /admin-actions', () => {
    it('should list admin actions with pagination', async () => {
      // Create some test admin actions
      const actions = [
        { action: 'CREATE_PROPERTY', targetType: 'Property', targetId: 'prop1' },
        { action: 'UPDATE_INVESTOR', targetType: 'Investor', targetId: 'inv1' },
        { action: 'APPROVE_TRANSFER', targetType: 'Transfer', targetId: 'trans1' }
      ];

      for (const actionData of actions) {
        await prisma.adminAction.create({
          data: {
            orgId: organization.id,
            actorId: adminUser.id,
            ...actionData,
            reason: 'Test action'
          }
        });
      }

      const response = await request(app.server)
        .get('/admin-actions')
        .set('Authorization', adminToken)
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.actions).toHaveLength(2);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2
      });
    });

    it('should filter admin actions by date range', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Create action yesterday
      await prisma.adminAction.create({
        data: {
          orgId: organization.id,
          actorId: adminUser.id,
          action: 'OLD_ACTION',
          targetType: 'Test',
          createdAt: yesterday
        }
      });

      // Create action today
      await prisma.adminAction.create({
        data: {
          orgId: organization.id,
          actorId: adminUser.id,
          action: 'NEW_ACTION',
          targetType: 'Test'
        }
      });

      const response = await request(app.server)
        .get('/admin-actions')
        .set('Authorization', adminToken)
        .query({ 
          from: yesterday.toISOString(),
          to: new Date().toISOString()
        })
        .expect(200);

      expect(response.body.actions).toHaveLength(2);
    });

    it('should filter admin actions by action type', async () => {
      await prisma.adminAction.create({
        data: {
          orgId: organization.id,
          actorId: adminUser.id,
          action: 'CREATE_PROPERTY',
          targetType: 'Property'
        }
      });

      await prisma.adminAction.create({
        data: {
          orgId: organization.id,
          actorId: adminUser.id,
          action: 'UPDATE_INVESTOR',
          targetType: 'Investor'
        }
      });

      const response = await request(app.server)
        .get('/admin-actions')
        .set('Authorization', adminToken)
        .query({ action: 'CREATE' })
        .expect(200);

      expect(response.body.actions).toHaveLength(1);
      expect(response.body.actions[0].action).toBe('CREATE_PROPERTY');
    });

    it('should require authentication', async () => {
      await request(app.server)
        .get('/admin-actions')
        .expect(401);
    });

    it('should allow access for ADMIN, COMPLIANCE, and ANALYST roles', async () => {
      // Test admin access
      await request(app.server)
        .get('/admin-actions')
        .set('Authorization', adminToken)
        .expect(200);

      // Test compliance access
      await request(app.server)
        .get('/admin-actions')
        .set('Authorization', complianceToken)
        .expect(200);

      // Test analyst access
      await request(app.server)
        .get('/admin-actions')
        .set('Authorization', analystToken)
        .expect(200);
    });
  });

  describe('GET /admin-actions/:id', () => {
    let actionId: string;

    beforeEach(async () => {
      const action = await prisma.adminAction.create({
        data: {
          orgId: organization.id,
          actorId: adminUser.id,
          action: 'TEST_ACTION',
          targetType: 'Test',
          targetId: 'test123',
          reason: 'Test reason'
        }
      });
      actionId = action.id;
    });

    it('should return specific admin action', async () => {
      const response = await request(app.server)
        .get(`/admin-actions/${actionId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.id).toBe(actionId);
      expect(response.body.action).toBe('TEST_ACTION');
      expect(response.body.targetType).toBe('Test');
      expect(response.body.targetId).toBe('test123');
      expect(response.body.reason).toBe('Test reason');
      expect(response.body.actor).toBeDefined();
    });

    it('should return 404 for non-existent action', async () => {
      await request(app.server)
        .get('/admin-actions/non-existent-id')
        .set('Authorization', adminToken)
        .expect(404);
    });

    it('should not allow access to actions from other organizations', async () => {
      const otherOrg = await createTestOrganization();
      const otherAction = await prisma.adminAction.create({
        data: {
          orgId: otherOrg.id,
          actorId: adminUser.id,
          action: 'OTHER_ORG_ACTION',
          targetType: 'Test'
        }
      });

      await request(app.server)
        .get(`/admin-actions/${otherAction.id}`)
        .set('Authorization', adminToken)
        .expect(404);
    });
  });

  describe('GET /admin-actions/export/csv', () => {
    beforeEach(async () => {
      await prisma.adminAction.createMany({
        data: [
          {
            orgId: organization.id,
            actorId: adminUser.id,
            action: 'ACTION_1',
            targetType: 'Type1'
          },
          {
            orgId: organization.id,
            actorId: complianceUser.id,
            action: 'ACTION_2',
            targetType: 'Type2'
          }
        ]
      });
    });

    it('should export admin actions as CSV', async () => {
      const response = await request(app.server)
        .get('/admin-actions/export/csv')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('ID,Organization ID,Actor Email');
      expect(response.text).toContain('ACTION_1');
      expect(response.text).toContain('ACTION_2');
    });

    it('should require ADMIN or COMPLIANCE role', async () => {
      // Analyst should not have access
      await request(app.server)
        .get('/admin-actions/export/csv')
        .set('Authorization', analystToken)
        .expect(403);
    });

    it('should apply filters to export', async () => {
      const response = await request(app.server)
        .get('/admin-actions/export/csv')
        .set('Authorization', adminToken)
        .query({ action: 'ACTION_1' })
        .expect(200);

      expect(response.text).toContain('ACTION_1');
      expect(response.text).not.toContain('ACTION_2');
    });
  });

  describe('GET /admin-actions/audit-summary', () => {
    beforeEach(async () => {
      await prisma.adminAction.createMany({
        data: [
          {
            orgId: organization.id,
            actorId: adminUser.id,
            action: 'CREATE_PROPERTY',
            targetType: 'Property'
          },
          {
            orgId: organization.id,
            actorId: adminUser.id,
            action: 'CREATE_PROPERTY',
            targetType: 'Property'
          },
          {
            orgId: organization.id,
            actorId: complianceUser.id,
            action: 'APPROVE_KYC',
            targetType: 'Investor'
          }
        ]
      });
    });

    it('should return audit summary statistics', async () => {
      const response = await request(app.server)
        .get('/admin-actions/audit-summary')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.totalActions).toBe(3);
      expect(response.body.actionTypes).toHaveLength(2);
      expect(response.body.topActors).toHaveLength(2);
      
      const createPropertyAction = response.body.actionTypes.find((a: any) => a.action === 'CREATE_PROPERTY');
      expect(createPropertyAction.count).toBe(2);
    });

    it('should require ADMIN or COMPLIANCE role', async () => {
      await request(app.server)
        .get('/admin-actions/audit-summary')
        .set('Authorization', analystToken)
        .expect(403);
    });

    it('should filter summary by date range', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const response = await request(app.server)
        .get('/admin-actions/audit-summary')
        .set('Authorization', adminToken)
        .query({ from: yesterday.toISOString() })
        .expect(200);

      expect(response.body.dateRange.from).toBe(yesterday.toISOString());
    });
  });

  describe('Data integrity', () => {
    it('should maintain organization isolation', async () => {
      const otherOrg = await createTestOrganization();
      
      // Create action in other org
      await prisma.adminAction.create({
        data: {
          orgId: otherOrg.id,
          actorId: adminUser.id,
          action: 'OTHER_ORG_ACTION',
          targetType: 'Test'
        }
      });

      // Should not see other org's actions
      const response = await request(app.server)
        .get('/admin-actions')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.actions).toHaveLength(0);
    });

    it('should include actor information in responses', async () => {
      const action = await prisma.adminAction.create({
        data: {
          orgId: organization.id,
          actorId: adminUser.id,
          action: 'TEST_ACTION',
          targetType: 'Test'
        }
      });

      const response = await request(app.server)
        .get(`/admin-actions/${action.id}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.actor).toBeDefined();
      expect(response.body.actor.id).toBe(adminUser.id);
      expect(response.body.actor.email).toBe(adminUser.email);
      expect(response.body.actor.role).toBe('ADMIN');
    });
  });
});
