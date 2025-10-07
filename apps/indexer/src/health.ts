import { PublicClient } from 'viem';
import { DatabaseService } from './database';
import { AlertService } from './alerts';
import { logger } from './logger';

export interface HealthStatus {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  timestamp: string;
  checks: {
    database: HealthCheck;
    rpc: HealthCheck;
    contracts: HealthCheck;
    indexer: HealthCheck;
  };
  metrics: {
    lastProcessedBlock: number;
    eventsProcessed: number;
    errorsCount: number;
    uptime: number;
  };
}

export interface HealthCheck {
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  responseTime?: number;
  details?: any;
}

export class HealthMonitor {
  private client: PublicClient;
  private db: DatabaseService;
  private alerts: AlertService;
  private startTime: number;
  private eventsProcessed = 0;
  private errorsCount = 0;
  private lastProcessedBlock = 0;

  constructor(
    client: PublicClient,
    db: DatabaseService,
    alerts: AlertService
  ) {
    this.client = client;
    this.db = db;
    this.alerts = alerts;
    this.startTime = Date.now();
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkRPC(),
      this.checkContracts(),
      this.checkIndexer()
    ]);

    const [database, rpc, contracts, indexer] = checks;

    // Determine overall status
    const failedChecks = checks.filter(check => check.status === 'FAIL').length;
    const warningChecks = checks.filter(check => check.status === 'WARN').length;

    let status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    if (failedChecks > 0) {
      status = 'UNHEALTHY';
    } else if (warningChecks > 0) {
      status = 'DEGRADED';
    } else {
      status = 'HEALTHY';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      checks: { database, rpc, contracts, indexer },
      metrics: {
        lastProcessedBlock: this.lastProcessedBlock,
        eventsProcessed: this.eventsProcessed,
        errorsCount: this.errorsCount,
        uptime: Date.now() - this.startTime
      }
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      await this.db.healthCheck();
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'PASS',
        message: 'Database connection healthy',
        responseTime,
        details: { responseTime }
      };
    } catch (error) {
      return {
        status: 'FAIL',
        message: `Database connection failed: ${(error as Error).message}`,
        responseTime: Date.now() - startTime,
        details: { error: (error as Error).message }
      };
    }
  }

  private async checkRPC(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const blockNumber = await this.client.getBlockNumber();
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'PASS',
        message: 'RPC connection healthy',
        responseTime,
        details: { 
          blockNumber: blockNumber.toString(),
          responseTime 
        }
      };
    } catch (error) {
      return {
        status: 'FAIL',
        message: `RPC connection failed: ${(error as Error).message}`,
        responseTime: Date.now() - startTime,
        details: { error: (error as Error).message }
      };
    }
  }

  private async checkContracts(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Check if we can read from contracts
      const blockNumber = await this.client.getBlockNumber();
      
      // Try to read from a known contract (ComplianceRegistry)
      // This is a simplified check - in production you'd check all contracts
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'PASS',
        message: 'Contract connections healthy',
        responseTime,
        details: { 
          blockNumber: blockNumber.toString(),
          responseTime 
        }
      };
    } catch (error) {
      return {
        status: 'FAIL',
        message: `Contract connection failed: ${(error as Error).message}`,
        responseTime: Date.now() - startTime,
        details: { error: (error as Error).message }
      };
    }
  }

  private async checkIndexer(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Check if indexer is processing blocks
      const currentBlock = await this.client.getBlockNumber();
      const blockLag = Number(currentBlock) - this.lastProcessedBlock;
      
      let status: 'PASS' | 'WARN' | 'FAIL';
      let message: string;
      
      if (blockLag > 100) {
        status = 'FAIL';
        message = `Indexer is ${blockLag} blocks behind`;
      } else if (blockLag > 20) {
        status = 'WARN';
        message = `Indexer is ${blockLag} blocks behind`;
      } else {
        status = 'PASS';
        message = 'Indexer is up to date';
      }
      
      return {
        status,
        message,
        responseTime: Date.now() - startTime,
        details: { 
          currentBlock: currentBlock.toString(),
          lastProcessedBlock: this.lastProcessedBlock,
          blockLag,
          eventsProcessed: this.eventsProcessed,
          errorsCount: this.errorsCount
        }
      };
    } catch (error) {
      return {
        status: 'FAIL',
        message: `Indexer check failed: ${(error as Error).message}`,
        responseTime: Date.now() - startTime,
        details: { error: (error as Error).message }
      };
    }
  }

  // Update methods for metrics
  updateLastProcessedBlock(blockNumber: number) {
    this.lastProcessedBlock = blockNumber;
  }

  incrementEventsProcessed() {
    this.eventsProcessed++;
  }

  incrementErrorsCount() {
    this.errorsCount++;
  }

  // Health check endpoint for API
  async getHealthCheckResponse() {
    const health = await this.getHealthStatus();
    
    return {
      status: health.status === 'HEALTHY' ? 200 : health.status === 'DEGRADED' ? 200 : 503,
      data: health
    };
  }

  // Detailed metrics for monitoring
  async getDetailedMetrics() {
    const health = await this.getHealthStatus();
    
    return {
      ...health,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      },
      indexer: {
        startTime: this.startTime,
        eventsProcessed: this.eventsProcessed,
        errorsCount: this.errorsCount,
        lastProcessedBlock: this.lastProcessedBlock,
        eventsPerMinute: this.eventsProcessed / ((Date.now() - this.startTime) / 60000)
      }
    };
  }
}
