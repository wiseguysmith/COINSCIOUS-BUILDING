import { DatabaseService } from './database';
import { logger } from './logger';

export interface SystemMetrics {
  timestamp: string;
  system: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    nodeVersion: string;
    platform: string;
  };
  indexer: {
    eventsProcessed: number;
    errorsCount: number;
    lastProcessedBlock: number;
    currentBlock: number;
    blockLag: number;
    eventsPerMinute: number;
    averageProcessingTime: number;
  };
  database: {
    connectionCount: number;
    queryCount: number;
    averageQueryTime: number;
    errorCount: number;
  };
  contracts: {
    totalTransfers: number;
    totalComplianceActions: number;
    totalPayouts: number;
    totalSnapshots: number;
    uniqueWallets: number;
  };
  alerts: {
    totalAlerts: number;
    alertsBySeverity: Record<string, number>;
    alertsByType: Record<string, number>;
  };
}

export interface AlertMetrics {
  totalAlerts: number;
  alertsBySeverity: Record<string, number>;
  alertsByType: Record<string, number>;
  recentAlerts: Array<{
    type: string;
    severity: string;
    timestamp: string;
    title: string;
  }>;
}

export class MetricsCollector {
  private db: DatabaseService;
  private startTime: number;
  private eventsProcessed = 0;
  private errorsCount = 0;
  private lastProcessedBlock = 0;
  private queryCount = 0;
  private queryTimes: number[] = [];
  private alertCounts: Record<string, number> = {};
  private alertSeverityCounts: Record<string, number> = {};

  constructor(db: DatabaseService) {
    this.db = db;
    this.startTime = Date.now();
  }

  async collectMetrics(): Promise<SystemMetrics> {
    const now = Date.now();
    const uptime = now - this.startTime;

    // Collect system metrics
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Collect database metrics
    const dbMetrics = await this.collectDatabaseMetrics();

    // Collect contract metrics
    const contractMetrics = await this.collectContractMetrics();

    // Collect alert metrics
    const alertMetrics = await this.collectAlertMetrics();

    return {
      timestamp: new Date().toISOString(),
      system: {
        uptime,
        memoryUsage,
        cpuUsage,
        nodeVersion: process.version,
        platform: process.platform
      },
      indexer: {
        eventsProcessed: this.eventsProcessed,
        errorsCount: this.errorsCount,
        lastProcessedBlock: this.lastProcessedBlock,
        currentBlock: 0, // Will be updated by caller
        blockLag: 0, // Will be calculated by caller
        eventsPerMinute: this.eventsProcessed / (uptime / 60000),
        averageProcessingTime: this.calculateAverageProcessingTime()
      },
      database: dbMetrics,
      contracts: contractMetrics,
      alerts: alertMetrics
    };
  }

  private async collectDatabaseMetrics() {
    try {
      // This would typically query database connection pool metrics
      // For now, we'll use mock data
      return {
        connectionCount: 5, // Mock value
        queryCount: this.queryCount,
        averageQueryTime: this.calculateAverageQueryTime(),
        errorCount: 0 // Mock value
      };
    } catch (error) {
      logger.error('Failed to collect database metrics', { error });
      return {
        connectionCount: 0,
        queryCount: this.queryCount,
        averageQueryTime: 0,
        errorCount: 1
      };
    }
  }

  private async collectContractMetrics() {
    try {
      const client = await this.db['pool'].connect();
      try {
        const queries = await Promise.all([
          client.query('SELECT COUNT(*) as count FROM token_transfers'),
          client.query('SELECT COUNT(*) as count FROM compliance_actions'),
          client.query('SELECT COUNT(*) as count FROM payouts'),
          client.query('SELECT COUNT(*) as count FROM snapshots'),
          client.query(`
            SELECT COUNT(DISTINCT wallet_address) as count FROM (
              SELECT from_address as wallet_address FROM token_transfers
              UNION
              SELECT to_address as wallet_address FROM token_transfers
            ) holders
          `)
        ]);

        return {
          totalTransfers: parseInt(queries[0].rows[0].count),
          totalComplianceActions: parseInt(queries[1].rows[0].count),
          totalPayouts: parseInt(queries[2].rows[0].count),
          totalSnapshots: parseInt(queries[3].rows[0].count),
          uniqueWallets: parseInt(queries[4].rows[0].count)
        };
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Failed to collect contract metrics', { error });
      return {
        totalTransfers: 0,
        totalComplianceActions: 0,
        totalPayouts: 0,
        totalSnapshots: 0,
        uniqueWallets: 0
      };
    }
  }

  private async collectAlertMetrics(): Promise<AlertMetrics> {
    try {
      const client = await this.db['pool'].connect();
      try {
        const alertQuery = await client.query(`
          SELECT 
            alert_type,
            severity,
            title,
            created_at
          FROM alerts 
          WHERE created_at >= NOW() - INTERVAL '24 hours'
          ORDER BY created_at DESC
          LIMIT 100
        `);

        const alerts = alertQuery.rows;
        const alertsByType: Record<string, number> = {};
        const alertsBySeverity: Record<string, number> = {};

        alerts.forEach(alert => {
          alertsByType[alert.alert_type] = (alertsByType[alert.alert_type] || 0) + 1;
          alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
        });

        return {
          totalAlerts: alerts.length,
          alertsBySeverity,
          alertsByType,
          recentAlerts: alerts.slice(0, 10).map(alert => ({
            type: alert.alert_type,
            severity: alert.severity,
            timestamp: alert.created_at,
            title: alert.title
          }))
        };
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Failed to collect alert metrics', { error });
      return {
        totalAlerts: 0,
        alertsBySeverity: {},
        alertsByType: {},
        recentAlerts: []
      };
    }
  }

  private calculateAverageProcessingTime(): number {
    // This would typically track actual processing times
    // For now, return a mock value
    return 150; // milliseconds
  }

  private calculateAverageQueryTime(): number {
    if (this.queryTimes.length === 0) return 0;
    return this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length;
  }

  // Methods to update metrics
  incrementEventsProcessed() {
    this.eventsProcessed++;
  }

  incrementErrorsCount() {
    this.errorsCount++;
  }

  updateLastProcessedBlock(blockNumber: number) {
    this.lastProcessedBlock = blockNumber;
  }

  recordQuery(queryTime: number) {
    this.queryCount++;
    this.queryTimes.push(queryTime);
    
    // Keep only last 1000 query times to prevent memory issues
    if (this.queryTimes.length > 1000) {
      this.queryTimes = this.queryTimes.slice(-1000);
    }
  }

  recordAlert(type: string, severity: string) {
    this.alertCounts[type] = (this.alertCounts[type] || 0) + 1;
    this.alertSeverityCounts[severity] = (this.alertSeverityCounts[severity] || 0) + 1;
  }

  // Get metrics summary for alerts
  getMetricsSummary(): string {
    const uptime = Date.now() - this.startTime;
    const uptimeHours = Math.floor(uptime / (1000 * 60 * 60));
    const uptimeMinutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

    return `
System Uptime: ${uptimeHours}h ${uptimeMinutes}m
Events Processed: ${this.eventsProcessed}
Errors: ${this.errorsCount}
Last Processed Block: ${this.lastProcessedBlock}
Events/Minute: ${(this.eventsProcessed / (uptime / 60000)).toFixed(2)}
Database Queries: ${this.queryCount}
Average Query Time: ${this.calculateAverageQueryTime().toFixed(2)}ms
    `.trim();
  }

  // Reset metrics (useful for testing)
  reset() {
    this.eventsProcessed = 0;
    this.errorsCount = 0;
    this.lastProcessedBlock = 0;
    this.queryCount = 0;
    this.queryTimes = [];
    this.alertCounts = {};
    this.alertSeverityCounts = {};
    this.startTime = Date.now();
  }
}
