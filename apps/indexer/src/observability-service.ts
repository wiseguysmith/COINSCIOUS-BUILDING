import { DatabaseService } from './database';
import { AlertService } from './alerts';
import { EmailService } from './email-service';
import { MetricsCollector } from './metrics';
import { HealthMonitor } from './health';
import { MonitoringDashboard } from './monitoring-dashboard';
import { logger } from './logger';
import * as cron from 'node-cron';

export interface ObservabilityConfig {
  healthCheckInterval: number; // minutes
  metricsCollectionInterval: number; // minutes
  dashboardUpdateInterval: number; // minutes
  dailyReportTime: string; // HH:MM format
  alertEmailRecipients: string[];
  dashboardEmailRecipients: string[];
  dailyReportRecipients: string[];
}

export class ObservabilityService {
  private db: DatabaseService;
  private alerts: AlertService;
  private email: EmailService;
  private metrics: MetricsCollector;
  private health: HealthMonitor;
  private dashboard: MonitoringDashboard;
  private config: ObservabilityConfig;
  private isRunning = false;

  constructor(
    db: DatabaseService,
    alerts: AlertService,
    email: EmailService,
    metrics: MetricsCollector,
    health: HealthMonitor,
    config: ObservabilityConfig
  ) {
    this.db = db;
    this.alerts = alerts;
    this.email = email;
    this.metrics = metrics;
    this.health = health;
    this.dashboard = new MonitoringDashboard(db, alerts, email, metrics, health);
    this.config = config;
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Observability service is already running');
      return;
    }

    try {
      logger.info('Starting observability service...');

      // Test email connection
      const emailConnected = await this.email.testConnection();
      if (!emailConnected) {
        logger.warn('Email service not available - alerts will only go to Slack');
      }

      // Start scheduled tasks
      this.startScheduledTasks();

      this.isRunning = true;
      logger.info('Observability service started successfully');

    } catch (error) {
      logger.error('Failed to start observability service', { error });
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    try {
      logger.info('Stopping observability service...');
      this.isRunning = false;
      logger.info('Observability service stopped');
    } catch (error) {
      logger.error('Error stopping observability service', { error });
    }
  }

  private startScheduledTasks() {
    // Health check every N minutes
    cron.schedule(`*/${this.config.healthCheckInterval} * * * *`, async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Health check failed', { error });
      }
    });

    // Metrics collection every N minutes
    cron.schedule(`*/${this.config.metricsCollectionInterval} * * * *`, async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        logger.error('Metrics collection failed', { error });
      }
    });

    // Dashboard update every N minutes
    cron.schedule(`*/${this.config.dashboardUpdateInterval} * * * *`, async () => {
      try {
        await this.updateDashboard();
      } catch (error) {
        logger.error('Dashboard update failed', { error });
      }
    });

    // Daily report at specified time
    cron.schedule(`0 ${this.config.dailyReportTime} * * *`, async () => {
      try {
        await this.sendDailyReport();
      } catch (error) {
        logger.error('Daily report failed', { error });
      }
    });

    logger.info('Scheduled tasks started', {
      healthCheckInterval: this.config.healthCheckInterval,
      metricsCollectionInterval: this.config.metricsCollectionInterval,
      dashboardUpdateInterval: this.config.dashboardUpdateInterval,
      dailyReportTime: this.config.dailyReportTime
    });
  }

  private async performHealthCheck() {
    try {
      const healthStatus = await this.health.getHealthStatus();
      
      // Check if any critical components are failing
      const criticalFailures = Object.values(healthStatus.checks).filter(
        check => check.status === 'FAIL'
      );

      if (criticalFailures.length > 0) {
        await this.alerts.sendAlert({
          type: 'health_check_critical',
          severity: 'CRITICAL',
          title: 'Critical Health Check Failure',
          message: `${criticalFailures.length} critical components are failing`,
          data: {
            failures: criticalFailures,
            overallStatus: healthStatus.status,
            timestamp: new Date().toISOString()
          }
        });

        // Send email alert for critical failures
        if (this.config.alertEmailRecipients.length > 0) {
          await this.email.sendAlertEmail(
            this.config.alertEmailRecipients,
            'CRITICAL',
            'Critical Health Check Failure',
            `${criticalFailures.length} critical components are failing`,
            { failures: criticalFailures, overallStatus: healthStatus.status }
          );
        }
      }

      // Check for degraded performance
      const warnings = Object.values(healthStatus.checks).filter(
        check => check.status === 'WARN'
      );

      if (warnings.length > 0 && criticalFailures.length === 0) {
        await this.alerts.sendAlert({
          type: 'health_check_warning',
          severity: 'HIGH',
          title: 'System Performance Degraded',
          message: `${warnings.length} components showing warnings`,
          data: {
            warnings,
            overallStatus: healthStatus.status,
            timestamp: new Date().toISOString()
          }
        });
      }

      logger.debug('Health check completed', { 
        status: healthStatus.status,
        criticalFailures: criticalFailures.length,
        warnings: warnings.length
      });

    } catch (error) {
      logger.error('Health check failed', { error });
      await this.alerts.sendHealthCheckAlert((error as Error).message);
    }
  }

  private async collectMetrics() {
    try {
      const metrics = await this.metrics.collectMetrics();
      
      // Check for performance issues
      if (metrics.indexer.eventsPerMinute < 10) {
        await this.alerts.sendAlert({
          type: 'low_throughput',
          severity: 'MEDIUM',
          title: 'Low Event Processing Rate',
          message: `Events per minute is low: ${metrics.indexer.eventsPerMinute.toFixed(2)}`,
          data: { eventsPerMinute: metrics.indexer.eventsPerMinute }
        });
      }

      if (metrics.indexer.blockLag > 50) {
        await this.alerts.sendAlert({
          type: 'high_block_lag',
          severity: 'HIGH',
          title: 'High Block Lag',
          message: `Indexer is ${metrics.indexer.blockLag} blocks behind`,
          data: { blockLag: metrics.indexer.blockLag }
        });
      }

      if (metrics.indexer.errorsCount > 10) {
        await this.alerts.sendAlert({
          type: 'high_error_rate',
          severity: 'HIGH',
          title: 'High Error Rate',
          message: `Error count is high: ${metrics.indexer.errorsCount}`,
          data: { errorsCount: metrics.indexer.errorsCount }
        });
      }

      // Check memory usage
      const memoryUsageMB = Math.round(metrics.system.memoryUsage.heapUsed / 1024 / 1024);
      if (memoryUsageMB > 1000) { // More than 1GB
        await this.alerts.sendAlert({
          type: 'high_memory_usage',
          severity: 'MEDIUM',
          title: 'High Memory Usage',
          message: `Memory usage is high: ${memoryUsageMB}MB`,
          data: { memoryUsageMB }
        });
      }

      logger.debug('Metrics collected', {
        eventsProcessed: metrics.indexer.eventsProcessed,
        errorsCount: metrics.indexer.errorsCount,
        blockLag: metrics.indexer.blockLag,
        memoryUsageMB
      });

    } catch (error) {
      logger.error('Metrics collection failed', { error });
    }
  }

  private async updateDashboard() {
    try {
      await this.dashboard.generateDashboardData();
      logger.debug('Dashboard updated');
    } catch (error) {
      logger.error('Dashboard update failed', { error });
    }
  }

  private async sendDailyReport() {
    try {
      if (this.config.dailyReportRecipients.length === 0) {
        logger.debug('No daily report recipients configured');
        return;
      }

      await this.dashboard.generateDashboardData();
      await this.dashboard.sendDashboardEmail(this.config.dailyReportRecipients);
      
      logger.info('Daily report sent', { 
        recipients: this.config.dailyReportRecipients.length 
      });

    } catch (error) {
      logger.error('Daily report failed', { error });
    }
  }

  // Manual methods for testing and immediate alerts
  async sendTestAlert() {
    await this.alerts.sendAlert({
      type: 'test_alert',
      severity: 'LOW',
      title: 'Test Alert',
      message: 'This is a test alert to verify the observability system is working',
      data: { timestamp: new Date().toISOString() }
    });
  }

  async sendTestEmail() {
    if (this.config.alertEmailRecipients.length === 0) {
      logger.warn('No email recipients configured for test');
      return;
    }

    await this.email.sendAlertEmail(
      this.config.alertEmailRecipients[0],
      'LOW',
      'Test Email',
      'This is a test email to verify the email service is working',
      { timestamp: new Date().toISOString() }
    );
  }

  async getCurrentStatus() {
    return await this.dashboard.generateDashboardData();
  }

  // Update metrics (called by other services)
  incrementEventsProcessed() {
    this.metrics.incrementEventsProcessed();
  }

  incrementErrorsCount() {
    this.metrics.incrementErrorsCount();
  }

  updateLastProcessedBlock(blockNumber: number) {
    this.metrics.updateLastProcessedBlock(blockNumber);
  }

  recordQuery(queryTime: number) {
    this.metrics.recordQuery(queryTime);
  }

  recordAlert(type: string, severity: string) {
    this.metrics.recordAlert(type, severity);
  }
}
