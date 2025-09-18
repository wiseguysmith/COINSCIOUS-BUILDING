#!/usr/bin/env tsx

import { createPublicClient, http, parseAbi, getContract } from 'viem';
import { baseSepolia } from 'viem/chains';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as cron from 'node-cron';
import { logger } from './logger';
import { EventIndexer } from './indexer';
import { AlertService } from './alerts';
import { DatabaseService } from './database';

// Load environment variables
require('dotenv').config();

interface Deployments {
  contracts: {
    logAnchor: string;
    complianceRegistry: string;
    securityTokenFactory: string;
    payoutDistributorFactory: string;
  };
  deployer: string;
  gnosisSafe: string;
  timelockController: string;
  mockUSDC?: string;
}

class IndexerService {
  private client: any;
  private db: DatabaseService;
  private indexer: EventIndexer;
  private alerts: AlertService;
  private deployments: Deployments;
  private isRunning = false;

  constructor() {
    // Initialize Viem client
    this.client = createPublicClient({
      chain: baseSepolia,
      transport: http(process.env.RPC_URL_BASE_SEPOLIA || 'https://sepolia.base.org'),
    });

    // Initialize database
    this.db = new DatabaseService();

    // Initialize alert service
    this.alerts = new AlertService();

    // Load deployments
    this.loadDeployments();

    // Initialize event indexer
    this.indexer = new EventIndexer(this.client, this.db, this.alerts, this.deployments);
  }

  private loadDeployments() {
    try {
      const deploymentsPath = process.env.DEPLOYMENTS_JSON_PATH || 'deployments/base-sepolia-addresses.json';
      const deploymentsData = readFileSync(deploymentsPath, 'utf8');
      this.deployments = JSON.parse(deploymentsData);
      logger.info('Deployments loaded successfully', { deployments: this.deployments });
    } catch (error) {
      logger.error('Failed to load deployments', { error });
      throw new Error('Deployments file not found. Please deploy contracts first.');
    }
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Indexer is already running');
      return;
    }

    try {
      logger.info('Starting COINSCIOUS Event Indexer...');
      
      // Initialize database
      await this.db.initialize();
      logger.info('Database initialized');

      // Start event indexing
      await this.indexer.start();
      logger.info('Event indexer started');

      // Start periodic tasks
      this.startPeriodicTasks();

      this.isRunning = true;
      logger.info('Indexer service started successfully');

    } catch (error) {
      logger.error('Failed to start indexer service', { error });
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    try {
      logger.info('Stopping indexer service...');
      
      await this.indexer.stop();
      await this.db.close();
      
      this.isRunning = false;
      logger.info('Indexer service stopped');

    } catch (error) {
      logger.error('Error stopping indexer service', { error });
    }
  }

  private startPeriodicTasks() {
    // Check for 12(g) threshold every hour
    cron.schedule('0 * * * *', async () => {
      try {
        await this.checkTwelveGThreshold();
      } catch (error) {
        logger.error('Error checking 12(g) threshold', { error });
      }
    });

    // Health check every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.healthCheck();
      } catch (error) {
        logger.error('Health check failed', { error });
      }
    });

    logger.info('Periodic tasks scheduled');
  }

  private async checkTwelveGThreshold() {
    try {
      const holderCount = await this.db.getHolderCount();
      const limit = parseInt(process.env.TWELVE_G_LIMIT || '2000');
      const warn1Pct = parseInt(process.env.TWELVE_G_WARN1_PCT || '70');
      const warn2Pct = parseInt(process.env.TWELVE_G_WARN2_PCT || '90');

      const warn1Threshold = Math.floor(limit * warn1Pct / 100);
      const warn2Threshold = Math.floor(limit * warn2Pct / 100);

      if (holderCount >= warn2Threshold) {
        await this.alerts.sendAlert({
          type: 'twelve_g_critical',
          severity: 'CRITICAL',
          title: '12(g) Threshold Critical',
          message: `Holder count (${holderCount}) is at ${warn2Pct}% of 12(g) threshold (${limit})`,
          data: { holderCount, limit, percentage: Math.floor(holderCount / limit * 100) }
        });
      } else if (holderCount >= warn1Threshold) {
        await this.alerts.sendAlert({
          type: 'twelve_g_warning',
          severity: 'HIGH',
          title: '12(g) Threshold Warning',
          message: `Holder count (${holderCount}) is at ${warn1Pct}% of 12(g) threshold (${limit})`,
          data: { holderCount, limit, percentage: Math.floor(holderCount / limit * 100) }
        });
      }

    } catch (error) {
      logger.error('Error checking 12(g) threshold', { error });
    }
  }

  private async healthCheck() {
    try {
      // Check database connection
      await this.db.healthCheck();
      
      // Check RPC connection
      const blockNumber = await this.client.getBlockNumber();
      
      logger.debug('Health check passed', { blockNumber });
    } catch (error) {
      logger.error('Health check failed', { error });
      await this.alerts.sendAlert({
        type: 'health_check_failed',
        severity: 'HIGH',
        title: 'Indexer Health Check Failed',
        message: `Health check failed: ${(error as Error).message}`,
        data: { error: (error as Error).message }
      });
    }
  }
}

// Main execution
async function main() {
  const indexer = new IndexerService();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await indexer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await indexer.stop();
    process.exit(0);
  });

  try {
    await indexer.start();
  } catch (error) {
    logger.error('Failed to start indexer', { error });
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error in main', { error });
    process.exit(1);
  });
}

export { IndexerService };

