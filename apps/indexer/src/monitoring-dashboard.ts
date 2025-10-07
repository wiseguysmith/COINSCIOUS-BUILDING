import { DatabaseService } from './database';
import { AlertService } from './alerts';
import { EmailService } from './email-service';
import { MetricsCollector } from './metrics';
import { HealthMonitor } from './health';
import { logger } from './logger';

export interface DashboardData {
  timestamp: string;
  systemHealth: {
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    uptime: string;
    lastCheck: string;
  };
  keyMetrics: {
    eventsProcessed: number;
    errorsCount: number;
    blockLag: number;
    uniqueWallets: number;
    totalTransfers: number;
    totalPayouts: number;
  };
  alerts: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    recent: Array<{
      type: string;
      severity: string;
      title: string;
      timestamp: string;
    }>;
  };
  performance: {
    eventsPerMinute: number;
    averageProcessingTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  contracts: {
    totalTransfers: number;
    totalComplianceActions: number;
    totalPayouts: number;
    totalSnapshots: number;
    uniqueWallets: number;
  };
}

export class MonitoringDashboard {
  private db: DatabaseService;
  private alerts: AlertService;
  private email: EmailService;
  private metrics: MetricsCollector;
  private health: HealthMonitor;
  private dashboardData: DashboardData | null = null;

  constructor(
    db: DatabaseService,
    alerts: AlertService,
    email: EmailService,
    metrics: MetricsCollector,
    health: HealthMonitor
  ) {
    this.db = db;
    this.alerts = alerts;
    this.email = email;
    this.metrics = metrics;
    this.health = health;
  }

  async generateDashboardData(): Promise<DashboardData> {
    try {
      // Get system health
      const healthStatus = await this.health.getHealthStatus();
      
      // Get metrics
      const systemMetrics = await this.metrics.collectMetrics();
      
      // Get alert data
      const alertData = await this.getAlertData();
      
      // Get contract data
      const contractData = await this.getContractData();

      const dashboardData: DashboardData = {
        timestamp: new Date().toISOString(),
        systemHealth: {
          status: healthStatus.status,
          uptime: this.formatUptime(systemMetrics.system.uptime),
          lastCheck: new Date().toISOString()
        },
        keyMetrics: {
          eventsProcessed: systemMetrics.indexer.eventsProcessed,
          errorsCount: systemMetrics.indexer.errorsCount,
          blockLag: systemMetrics.indexer.blockLag,
          uniqueWallets: contractData.uniqueWallets,
          totalTransfers: contractData.totalTransfers,
          totalPayouts: contractData.totalPayouts
        },
        alerts: alertData,
        performance: {
          eventsPerMinute: systemMetrics.indexer.eventsPerMinute,
          averageProcessingTime: systemMetrics.indexer.averageProcessingTime,
          memoryUsage: Math.round(systemMetrics.system.memoryUsage.heapUsed / 1024 / 1024), // MB
          cpuUsage: this.calculateCpuUsage(systemMetrics.system.cpuUsage)
        },
        contracts: contractData
      };

      this.dashboardData = dashboardData;
      return dashboardData;

    } catch (error) {
      logger.error('Failed to generate dashboard data', { error });
      throw error;
    }
  }

  private async getAlertData() {
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
        `);

        const alerts = alertQuery.rows;
        const severityCounts = {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        };

        alerts.forEach(alert => {
          const severity = alert.severity.toLowerCase();
          if (severity in severityCounts) {
            severityCounts[severity as keyof typeof severityCounts]++;
          }
        });

        return {
          total: alerts.length,
          critical: severityCounts.critical,
          high: severityCounts.high,
          medium: severityCounts.medium,
          low: severityCounts.low,
          recent: alerts.slice(0, 10).map(alert => ({
            type: alert.alert_type,
            severity: alert.severity,
            title: alert.title,
            timestamp: alert.created_at
          }))
        };
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Failed to get alert data', { error });
      return {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        recent: []
      };
    }
  }

  private async getContractData() {
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
      logger.error('Failed to get contract data', { error });
      return {
        totalTransfers: 0,
        totalComplianceActions: 0,
        totalPayouts: 0,
        totalSnapshots: 0,
        uniqueWallets: 0
      };
    }
  }

  private formatUptime(uptimeMs: number): string {
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  private calculateCpuUsage(cpuUsage: NodeJS.CpuUsage): number {
    // This is a simplified calculation
    // In production, you'd want more sophisticated CPU monitoring
    return Math.round(cpuUsage.user / 1000000); // Convert to percentage
  }

  // Send dashboard data via email
  async sendDashboardEmail(to: string | string[]) {
    if (!this.dashboardData) {
      await this.generateDashboardData();
    }

    const html = this.generateDashboardHTML(this.dashboardData!);
    const text = this.generateDashboardText(this.dashboardData!);

    return await this.email.sendEmail({
      to,
      subject: `COINSCIOUS Monitoring Dashboard - ${new Date().toLocaleDateString()}`,
      html,
      text,
      priority: 'normal'
    });
  }

  private generateDashboardHTML(data: DashboardData): string {
    const statusColor = data.systemHealth.status === 'HEALTHY' ? '#36a64f' : 
                       data.systemHealth.status === 'DEGRADED' ? '#ffaa00' : '#ff0000';
    
    const statusEmoji = data.systemHealth.status === 'HEALTHY' ? '✅' : 
                       data.systemHealth.status === 'DEGRADED' ? '⚠️' : '🚨';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>COINSCIOUS Monitoring Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 1200px; margin: 0 auto; }
          .header { background-color: #2196F3; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: white; padding: 20px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px; }
          .card { background-color: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3; }
          .metric { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .metric-value { font-weight: bold; color: #2196F3; }
          .status { display: inline-block; background-color: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
          .alert-item { padding: 8px; background-color: #fff; border-radius: 4px; margin-bottom: 4px; border-left: 3px solid #ddd; }
          .alert-critical { border-left-color: #ff0000; }
          .alert-high { border-left-color: #ff6600; }
          .alert-medium { border-left-color: #ffaa00; }
          .alert-low { border-left-color: #36a64f; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 COINSCIOUS Monitoring Dashboard</h1>
            <p>Generated: ${data.timestamp}</p>
          </div>
          <div class="content">
            <div class="grid">
              <div class="card">
                <h3>${statusEmoji} System Health</h3>
                <div class="metric"><span>Status:</span><span class="status">${data.systemHealth.status}</span></div>
                <div class="metric"><span>Uptime:</span><span class="metric-value">${data.systemHealth.uptime}</span></div>
                <div class="metric"><span>Last Check:</span><span>${new Date(data.systemHealth.lastCheck).toLocaleString()}</span></div>
              </div>
              
              <div class="card">
                <h3>📈 Key Metrics</h3>
                <div class="metric"><span>Events Processed:</span><span class="metric-value">${data.keyMetrics.eventsProcessed.toLocaleString()}</span></div>
                <div class="metric"><span>Errors:</span><span class="metric-value">${data.keyMetrics.errorsCount}</span></div>
                <div class="metric"><span>Block Lag:</span><span class="metric-value">${data.keyMetrics.blockLag}</span></div>
                <div class="metric"><span>Unique Wallets:</span><span class="metric-value">${data.keyMetrics.uniqueWallets.toLocaleString()}</span></div>
              </div>
              
              <div class="card">
                <h3>🚨 Alerts (24h)</h3>
                <div class="metric"><span>Total:</span><span class="metric-value">${data.alerts.total}</span></div>
                <div class="metric"><span>Critical:</span><span class="metric-value" style="color: #ff0000;">${data.alerts.critical}</span></div>
                <div class="metric"><span>High:</span><span class="metric-value" style="color: #ff6600;">${data.alerts.high}</span></div>
                <div class="metric"><span>Medium:</span><span class="metric-value" style="color: #ffaa00;">${data.alerts.medium}</span></div>
                <div class="metric"><span>Low:</span><span class="metric-value" style="color: #36a64f;">${data.alerts.low}</span></div>
              </div>
              
              <div class="card">
                <h3>⚡ Performance</h3>
                <div class="metric"><span>Events/Min:</span><span class="metric-value">${data.performance.eventsPerMinute.toFixed(2)}</span></div>
                <div class="metric"><span>Avg Processing:</span><span class="metric-value">${data.performance.averageProcessingTime}ms</span></div>
                <div class="metric"><span>Memory Usage:</span><span class="metric-value">${data.performance.memoryUsage}MB</span></div>
                <div class="metric"><span>CPU Usage:</span><span class="metric-value">${data.performance.cpuUsage}%</span></div>
              </div>
            </div>
            
            <div class="card">
              <h3>📋 Recent Alerts</h3>
              ${data.alerts.recent.length > 0 ? 
                data.alerts.recent.map(alert => `
                  <div class="alert-item alert-${alert.severity.toLowerCase()}">
                    <strong>${alert.title}</strong> (${alert.severity})
                    <br><small>${alert.type} - ${new Date(alert.timestamp).toLocaleString()}</small>
                  </div>
                `).join('') :
                '<p>No recent alerts</p>'
              }
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateDashboardText(data: DashboardData): string {
    return `
COINSCIOUS Monitoring Dashboard
Generated: ${data.timestamp}

System Health: ${data.systemHealth.status}
Uptime: ${data.systemHealth.uptime}

Key Metrics:
- Events Processed: ${data.keyMetrics.eventsProcessed.toLocaleString()}
- Errors: ${data.keyMetrics.errorsCount}
- Block Lag: ${data.keyMetrics.blockLag}
- Unique Wallets: ${data.keyMetrics.uniqueWallets.toLocaleString()}
- Total Transfers: ${data.keyMetrics.totalTransfers.toLocaleString()}
- Total Payouts: ${data.keyMetrics.totalPayouts.toLocaleString()}

Alerts (24h):
- Total: ${data.alerts.total}
- Critical: ${data.alerts.critical}
- High: ${data.alerts.high}
- Medium: ${data.alerts.medium}
- Low: ${data.alerts.low}

Performance:
- Events/Min: ${data.performance.eventsPerMinute.toFixed(2)}
- Avg Processing: ${data.performance.averageProcessingTime}ms
- Memory Usage: ${data.performance.memoryUsage}MB
- CPU Usage: ${data.performance.cpuUsage}%

Recent Alerts:
${data.alerts.recent.map(alert => 
  `- ${alert.title} (${alert.severity}) - ${alert.type} - ${new Date(alert.timestamp).toLocaleString()}`
).join('\n')}
    `.trim();
  }

  // Get current dashboard data
  getDashboardData(): DashboardData | null {
    return this.dashboardData;
  }
}
