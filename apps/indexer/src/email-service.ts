import nodemailer from 'nodemailer';
import { logger } from './logger';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailAlert {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  priority?: 'high' | 'normal' | 'low';
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpUser || !smtpPass) {
      logger.warn('Email service not configured - missing SMTP credentials');
      return;
    }

    this.config = {
      host: smtpHost,
      port: parseInt(smtpPort || '587'),
      secure: smtpPort === '465',
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    };

    this.transporter = nodemailer.createTransporter(this.config);
    logger.info('Email service initialized', { host: smtpHost, port: this.config.port });
  }

  async sendEmail(alert: EmailAlert): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email service not available - skipping email send');
      return false;
    }

    try {
      const mailOptions = {
        from: `"COINSCIOUS Platform" <${this.config!.auth.user}>`,
        to: Array.isArray(alert.to) ? alert.to.join(', ') : alert.to,
        subject: alert.subject,
        text: alert.text,
        html: alert.html,
        priority: alert.priority || 'normal',
        attachments: alert.attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully', { 
        messageId: result.messageId,
        to: alert.to,
        subject: alert.subject
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to send email', { error, alert });
      return false;
    }
  }

  async sendAlertEmail(
    to: string | string[],
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    title: string,
    message: string,
    data?: any
  ): Promise<boolean> {
    const severityColors = {
      LOW: '#36a64f',
      MEDIUM: '#ffaa00',
      HIGH: '#ff6600',
      CRITICAL: '#ff0000'
    };

    const severityEmojis = {
      LOW: 'ℹ️',
      MEDIUM: '⚠️',
      HIGH: '🚨',
      CRITICAL: '🔥'
    };

    const priority = severity === 'CRITICAL' ? 'high' : severity === 'HIGH' ? 'high' : 'normal';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>COINSCIOUS Alert</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background-color: ${severityColors[severity]}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { padding: 20px; }
          .severity { display: inline-block; background-color: ${severityColors[severity]}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .data { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 15px; }
          .footer { padding: 20px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
          .timestamp { color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${severityEmojis[severity]} COINSCIOUS Alert</h1>
            <p class="timestamp">${new Date().toISOString()}</p>
          </div>
          <div class="content">
            <h2>${title}</h2>
            <p><span class="severity">${severity}</span></p>
            <p>${message}</p>
            ${data ? `
              <div class="data">
                <h3>Additional Data:</h3>
                <pre style="white-space: pre-wrap; word-wrap: break-word;">${JSON.stringify(data, null, 2)}</pre>
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>This is an automated alert from the COINSCIOUS Platform monitoring system.</p>
            <p>If you need immediate assistance, please contact the operations team.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
COINSCIOUS Alert: ${title}

Severity: ${severity}
Time: ${new Date().toISOString()}

${message}

${data ? `Additional Data:\n${JSON.stringify(data, null, 2)}` : ''}

---
This is an automated alert from the COINSCIOUS Platform monitoring system.
    `.trim();

    return await this.sendEmail({
      to,
      subject: `[${severity}] COINSCIOUS Alert: ${title}`,
      html,
      text,
      priority
    });
  }

  async sendSystemStatusEmail(
    to: string | string[],
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY',
    details: any
  ): Promise<boolean> {
    const statusColors = {
      HEALTHY: '#36a64f',
      DEGRADED: '#ffaa00',
      UNHEALTHY: '#ff0000'
    };

    const statusEmojis = {
      HEALTHY: '✅',
      DEGRADED: '⚠️',
      UNHEALTHY: '🚨'
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>COINSCIOUS System Status</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background-color: ${statusColors[status]}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { padding: 20px; }
          .status { display: inline-block; background-color: ${statusColors[status]}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 14px; font-weight: bold; }
          .metrics { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 15px; }
          .metric { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .footer { padding: 20px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${statusEmojis[status]} System Status Report</h1>
            <p>${new Date().toISOString()}</p>
          </div>
          <div class="content">
            <h2>Overall Status: <span class="status">${status}</span></h2>
            <div class="metrics">
              <h3>System Metrics:</h3>
              ${Object.entries(details.metrics || {}).map(([key, value]) => 
                `<div class="metric"><span>${key}:</span><span>${value}</span></div>`
              ).join('')}
            </div>
            <div class="metrics">
              <h3>Health Checks:</h3>
              ${Object.entries(details.checks || {}).map(([key, check]) => 
                `<div class="metric"><span>${key}:</span><span style="color: ${check.status === 'PASS' ? 'green' : check.status === 'WARN' ? 'orange' : 'red'}">${check.status}</span></div>`
              ).join('')}
            </div>
          </div>
          <div class="footer">
            <p>This is an automated status report from the COINSCIOUS Platform monitoring system.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
COINSCIOUS System Status Report

Status: ${status}
Time: ${new Date().toISOString()}

System Metrics:
${Object.entries(details.metrics || {}).map(([key, value]) => `${key}: ${value}`).join('\n')}

Health Checks:
${Object.entries(details.checks || {}).map(([key, check]) => `${key}: ${check.status}`).join('\n')}

---
This is an automated status report from the COINSCIOUS Platform monitoring system.
    `.trim();

    return await this.sendEmail({
      to,
      subject: `COINSCIOUS System Status: ${status}`,
      html,
      text,
      priority: status === 'UNHEALTHY' ? 'high' : 'normal'
    });
  }

  async sendDailyReport(
    to: string | string[],
    reportData: any
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>COINSCIOUS Daily Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background-color: #2196F3; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { padding: 20px; }
          .section { margin-bottom: 20px; }
          .metric { display: flex; justify-content: space-between; margin-bottom: 8px; padding: 8px; background-color: #f8f9fa; border-radius: 4px; }
          .footer { padding: 20px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 COINSCIOUS Daily Report</h1>
            <p>${new Date().toLocaleDateString()}</p>
          </div>
          <div class="content">
            ${Object.entries(reportData).map(([section, data]) => `
              <div class="section">
                <h3>${section}</h3>
                ${Object.entries(data as any).map(([key, value]) => 
                  `<div class="metric"><span>${key}:</span><span>${value}</span></div>`
                ).join('')}
              </div>
            `).join('')}
          </div>
          <div class="footer">
            <p>This is an automated daily report from the COINSCIOUS Platform monitoring system.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
COINSCIOUS Daily Report - ${new Date().toLocaleDateString()}

${Object.entries(reportData).map(([section, data]) => 
  `${section}:\n${Object.entries(data as any).map(([key, value]) => `  ${key}: ${value}`).join('\n')}`
).join('\n\n')}

---
This is an automated daily report from the COINSCIOUS Platform monitoring system.
    `.trim();

    return await this.sendEmail({
      to,
      subject: `COINSCIOUS Daily Report - ${new Date().toLocaleDateString()}`,
      html,
      text,
      priority: 'normal'
    });
  }

  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed', { error });
      return false;
    }
  }
}
