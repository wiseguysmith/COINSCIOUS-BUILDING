import Fastify from 'fastify';
import cors from 'fastify-cors';
import helmet from 'fastify-helmet';
import rateLimit from 'fastify-rate-limit';
import swagger from 'fastify-swagger';
import swaggerUi from 'fastify-swagger-ui';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Import routes
import propertiesRoutes from './routes/properties';
import webhooksRoutes from './routes/webhooks';
import adminActionsRoutes from './routes/adminActions';

// Import utilities
import { AuthService } from './lib/auth';
import { HMACVerifier } from './lib/hmac';
import { OnchainIntegration } from './lib/onchain';

// Load environment variables
dotenv.config();

/**
 * Main Fastify server for the Security Token Platform API
 * @notice Handles all API endpoints with proper security and validation
 */

// Environment configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const HMAC_SECRET = process.env.HMAC_SECRET || 'your-super-secret-hmac-key-change-in-production';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/coinscious';

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize utilities
const authService = new AuthService(prisma, JWT_SECRET);
const hmacVerifier = new HMACVerifier(HMAC_SECRET);
const onchainIntegration = new OnchainIntegration(prisma);

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: NODE_ENV === 'development' ? 'info' : 'warn',
    prettyPrint: NODE_ENV === 'development'
  },
  trustProxy: true
});

// Register plugins
fastify.register(cors, {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
  credentials: true
});

fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
});

fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  skipOnError: true,
  keyGenerator: (request) => {
    return request.ip || 'anonymous';
  }
});

// Swagger documentation
fastify.register(swagger, {
  swagger: {
    info: {
      title: 'COINSCIOUS API',
      description: 'Security Token Platform API',
      version: '1.0.0'
    },
    host: process.env.API_HOST || 'localhost:3000',
    schemes: ['http', 'https'],
    consumes: ['application/json'],
    produces: ['application/json'],
    securityDefinitions: {
      Bearer: {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header'
      }
    }
  }
});

fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true
  }
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    reply.send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV,
      database: 'connected'
    });
  } catch (error) {
    reply.code(503).send({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// Register routes
fastify.register(propertiesRoutes, {
  prisma,
  authService
});

fastify.register(webhooksRoutes, {
  prisma,
  hmacVerifier,
  onchainIntegration
});

fastify.register(adminActionsRoutes);

// Global error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  // Handle validation errors
  if (error.validation) {
    reply.code(400).send({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: {
        reason: error.message,
        field: error.validation?.[0]?.dataPath,
        value: error.validation?.[0]?.data
      }
    });
    return;
  }

  // Handle Prisma errors
  if (error.code === 'P2002') {
    reply.code(409).send({
      code: 'CONFLICT',
      message: 'Resource already exists',
      details: {
        reason: 'Unique constraint violation'
      }
    });
    return;
  }

  if (error.code === 'P2025') {
    reply.code(404).send({
      code: 'NOT_FOUND',
      message: 'Resource not found',
      details: {
        reason: 'Record not found in database'
      }
    });
    return;
  }

  // Default error response
  reply.code(500).send({
    code: 'INTERNAL_ERROR',
    message: NODE_ENV === 'development' ? error.message : 'Internal server error',
    details: NODE_ENV === 'development' ? {
      reason: error.stack
    } : undefined
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  fastify.log.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    await fastify.close();
    await prisma.$disconnect();
    fastify.log.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    fastify.log.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const start = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    fastify.log.info('Database connected successfully');

    // Start server
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    
    fastify.log.info(`Server listening on port ${PORT}`);
    fastify.log.info(`Environment: ${NODE_ENV}`);
    fastify.log.info(`API Documentation: http://localhost:${PORT}/docs`);
    fastify.log.info(`Health Check: http://localhost:${PORT}/health`);
    
  } catch (error) {
    fastify.log.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  fastify.log.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  fastify.log.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
start();
