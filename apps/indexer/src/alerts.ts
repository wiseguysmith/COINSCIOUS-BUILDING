import axios from 'axios';
import { logger } from './logger';

export interface AlertData {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  data?: any;
}

export class AlertService {
  private slackWebhookUrl: string | null = null;
  private smtpConfig: any = null;

  constructor() {
    this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL || null;
    this.smtpConfig = process.env.SMTP_HOST ? {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    } : null;
  }

  async sendAlert(alert: AlertData) {
    try {
      logger.info('Sending alert', { type: alert.type, severity: alert.severity });

      // Send to Slack if configured
      if (this.slackWebhookUrl) {
        await this.sendSlackAlert(alert);
      }

      // Send email if configured
      if (this.smtpConfig) {
        await this.sendEmailAlert(alert);
      }

      // Log to database
      await this.logAlert(alert);

    } catch (error) {
      logger.error('Failed to send alert', { error, alert });
    }
  }

  private async sendSlackAlert(alert: AlertData) {
    if (!this.slackWebhookUrl) return;

    try {
      const color = this.getSeverityColor(alert.severity);
      const emoji = this.getSeverityEmoji(alert.severity);

      const message = {
        text: `${emoji} COINSCIOUS Alert: ${alert.title}`,
        attachments: [
          {
            color: color,
            fields: [
              {
                title: 'Severity',
                value: alert.severity,
                short: true
              },
              {
                title: 'Type',
                value: alert.type,
                short: true
              },
              {
                title: 'Message',
                value: alert.message,
                short: false
              },
              {
                title: 'Timestamp',
                value: new Date().toISOString(),
                short: true
              }
            ],
            footer: 'COINSCIOUS Platform',
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      };

      if (alert.data) {
        message.attachments[0].fields.push({
          title: 'Data',
          value: `\`\`\`json\n${JSON.stringify(alert.data, null, 2)}\n\`\`\``,
          short: false
        });
      }

      await axios.post(this.slackWebhookUrl, message, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      logger.debug('Slack alert sent successfully', { type: alert.type });

    } catch (error) {
      logger.error('Failed to send Slack alert', { error, alert });
    }
  }

  private async sendEmailAlert(alert: AlertData) {
    if (!this.smtpConfig) return;

    try {
      // For now, we'll just log the email alert
      // In production, you'd use nodemailer or similar
      logger.info('Email alert would be sent', {
        to: process.env.ALERT_EMAIL || 'alerts@coinscious.com',
        subject: `[${alert.severity}] COINSCIOUS Alert: ${alert.title}`,
        body: alert.message,
        data: alert.data
      });

    } catch (error) {
      logger.error('Failed to send email alert', { error, alert });
    }
  }

  private async logAlert(alert: AlertData) {
    try {
      // This would typically insert into the database
      // For now, we'll just log it
      logger.info('Alert logged', {
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        data: alert.data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to log alert', { error, alert });
    }
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'LOW': return '#36a64f';      // Green
      case 'MEDIUM': return '#ffaa00';   // Orange
      case 'HIGH': return '#ff6600';     // Red-Orange
      case 'CRITICAL': return '#ff0000'; // Red
      default: return '#808080';         // Gray
    }
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'LOW': return 'ℹ️';
      case 'MEDIUM': return '⚠️';
      case 'HIGH': return '🚨';
      case 'CRITICAL': return '🔥';
      default: return '📢';
    }
  }

  // Specific alert methods for common scenarios
  async sendSystemPauseAlert(operator: string, reason: string) {
    await this.sendAlert({
      type: 'system_pause',
      severity: 'CRITICAL',
      title: 'System Paused',
      message: `The system has been paused by ${operator}. Reason: ${reason}`,
      data: { operator, reason, timestamp: new Date().toISOString() }
    });
  }

  async sendSystemUnpauseAlert(operator: string) {
    await this.sendAlert({
      type: 'system_unpause',
      severity: 'HIGH',
      title: 'System Unpaused',
      message: `The system has been unpaused by ${operator}`,
      data: { operator, timestamp: new Date().toISOString() }
    });
  }

  async sendWalletFreezeAlert(wallet: string, operator: string, reason: string) {
    await this.sendAlert({
      type: 'wallet_freeze',
      severity: 'HIGH',
      title: 'Wallet Frozen',
      message: `Wallet ${wallet} has been frozen by ${operator}. Reason: ${reason}`,
      data: { wallet, operator, reason, timestamp: new Date().toISOString() }
    });
  }

  async sendWalletUnfreezeAlert(wallet: string, operator: string, reason: string) {
    await this.sendAlert({
      type: 'wallet_unfreeze',
      severity: 'MEDIUM',
      title: 'Wallet Unfrozen',
      message: `Wallet ${wallet} has been unfrozen by ${operator}. Reason: ${reason}`,
      data: { wallet, operator, reason, timestamp: new Date().toISOString() }
    });
  }

  async sendPayoutAlert(snapshotId: number, amount: string, holderCount: number) {
    await this.sendAlert({
      type: 'payout_distributed',
      severity: 'MEDIUM',
      title: 'Payout Distributed',
      message: `Payout distributed for snapshot ${snapshotId}. Amount: ${amount}, Holders: ${holderCount}`,
      data: { snapshotId, amount, holderCount, timestamp: new Date().toISOString() }
    });
  }

  async sendTwelveGAlert(holderCount: number, limit: number, percentage: number) {
    const severity = percentage >= 90 ? 'CRITICAL' : percentage >= 70 ? 'HIGH' : 'MEDIUM';
    
    await this.sendAlert({
      type: 'twelve_g_threshold',
      severity,
      title: '12(g) Threshold Alert',
      message: `Holder count (${holderCount}) is at ${percentage}% of 12(g) threshold (${limit})`,
      data: { holderCount, limit, percentage, timestamp: new Date().toISOString() }
    });
  }

  async sendHealthCheckAlert(error: string) {
    await this.sendAlert({
      type: 'health_check_failed',
      severity: 'HIGH',
      title: 'Health Check Failed',
      message: `System health check failed: ${error}`,
      data: { error, timestamp: new Date().toISOString() }
    });
  }

  async sendIndexerErrorAlert(error: string, blockNumber?: string) {
    await this.sendAlert({
      type: 'indexer_error',
      severity: 'HIGH',
      title: 'Indexer Error',
      message: `Event indexer encountered an error: ${error}`,
      data: { error, blockNumber, timestamp: new Date().toISOString() }
    });
  }
}
