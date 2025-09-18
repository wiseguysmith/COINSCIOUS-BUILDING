import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

/**
 * Authentication and authorization middleware
 * @notice Handles JWT verification and role-based access control
 */

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string;
    role: 'ADMIN' | 'COMPLIANCE' | 'ANALYST';
    organizationId: string;
  };
}

export interface JWTPayload {
  id: string;
  email: string;
  role: 'ADMIN' | 'COMPLIANCE' | 'ANALYST';
  organizationId: string;
  iat: number;
  exp: number;
}

export class AuthService {
  private prisma: PrismaClient;
  private jwtSecret: string;

  constructor(prisma: PrismaClient, jwtSecret: string) {
    this.prisma = prisma;
    this.jwtSecret = jwtSecret;
  }

  /**
   * Generates JWT token for user
   * @param user User data
   * @returns JWT token
   */
  generateToken(user: {
    id: string;
    email: string;
    role: 'ADMIN' | 'COMPLIANCE' | 'ANALYST';
    organizationId: string;
  }): string {
    return jwt.sign(user, this.jwtSecret, {
      expiresIn: '24h',
      issuer: 'coinscious-api',
      audience: 'coinscious-users'
    });
  }

  /**
   * Verifies JWT token
   * @param token JWT token
   * @returns Decoded payload or null
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'coinscious-api',
        audience: 'coinscious-users'
      }) as JWTPayload;
    } catch (error) {
      console.error('JWT verification failed:', error);
      return null;
    }
  }

  /**
   * Authentication middleware
   * @param request Fastify request
   * @param reply Fastify reply
   */
  async authenticate(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const authHeader = request.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.code(401).send({
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header'
        });
        return;
      }

      const token = authHeader.substring(7);
      const payload = this.verifyToken(token);

      if (!payload) {
        reply.code(401).send({
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token'
        });
        return;
      }

      // Verify user still exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
        select: {
          id: true,
          email: true,
          role: true,
          organizationId: true,
          isActive: true
        }
      });

      if (!user || !user.isActive) {
        reply.code(401).send({
          code: 'UNAUTHORIZED',
          message: 'User not found or inactive'
        });
        return;
      }

      // Attach user to request
      (request as AuthenticatedRequest).user = {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      };
    } catch (error) {
      console.error('Authentication error:', error);
      reply.code(500).send({
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed'
      });
    }
  }

  /**
   * Role-based authorization middleware
   * @param allowedRoles Array of allowed roles
   * @returns Middleware function
   */
  requireRole(allowedRoles: Array<'ADMIN' | 'COMPLIANCE' | 'ANALYST'>) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        
        if (!authRequest.user) {
          reply.code(401).send({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          });
          return;
        }

        if (!allowedRoles.includes(authRequest.user.role)) {
          reply.code(403).send({
            code: 'FORBIDDEN',
            message: `Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`
          });
          return;
        }
      } catch (error) {
        console.error('Authorization error:', error);
        reply.code(500).send({
          code: 'INTERNAL_ERROR',
          message: 'Authorization failed'
        });
      }
    };
  }

  /**
   * Organization-scoped access middleware
   * @param request Fastify request
   * @param reply Fastify reply
   */
  async requireOrganizationAccess(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const authRequest = request as AuthenticatedRequest;
      
      if (!authRequest.user) {
        reply.code(401).send({
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        });
        return;
      }

      // For now, all users can access their organization's data
      // This can be enhanced with more granular permissions later
      request.headers['x-organization-id'] = authRequest.user.organizationId;
    } catch (error) {
      console.error('Organization access check failed:', error);
      reply.code(500).send({
        code: 'INTERNAL_ERROR',
        message: 'Organization access check failed'
      });
    }
  }

  /**
   * Admin-only middleware
   */
  requireAdmin = this.requireRole(['ADMIN']);

  /**
   * Compliance or Admin middleware
   */
  requireComplianceOrAdmin = this.requireRole(['ADMIN', 'COMPLIANCE']);

  /**
   * Any authenticated user middleware
   */
  requireAuth = this.requireRole(['ADMIN', 'COMPLIANCE', 'ANALYST']);
}

/**
 * Idempotency middleware
 * @param request Fastify request
 * @param reply Fastify reply
 */
export async function requireIdempotency(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const idempotencyKey = request.headers['idempotency-key'];
  
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    reply.code(400).send({
      code: 'BAD_REQUEST',
      message: 'Idempotency-Key header is required for POST requests'
    });
    return;
  }

  if (idempotencyKey.length < 16 || idempotencyKey.length > 128) {
    reply.code(400).send({
      code: 'BAD_REQUEST',
      message: 'Idempotency-Key must be between 16 and 128 characters'
    });
    return;
  }

  // The actual idempotency check will be implemented in the route handlers
  // using the WebhookEvent model to store and check for duplicates
}
