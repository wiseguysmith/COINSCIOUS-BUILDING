import { Pool, PoolClient } from 'pg';
import { logger } from './logger';

export class DatabaseService {
  private pool: Pool;
  private isInitialized = false;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', { error: err });
    });
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      // Run migrations
      await this.runMigrations();

      this.isInitialized = true;
      logger.info('Database initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize database', { error });
      throw error;
    }
  }

  private async runMigrations() {
    const client = await this.pool.connect();
    
    try {
      // Check if migrations table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          applied_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Get applied migrations
      const result = await client.query('SELECT version FROM schema_migrations ORDER BY version');
      const appliedMigrations = result.rows.map(row => row.version);

      // Run pending migrations
      const migrations = [
        { version: 1, sql: this.getInitialSchema() },
        { version: 2, sql: this.getIndexesSchema() },
        { version: 3, sql: this.getViewsSchema() }
      ];

      for (const migration of migrations) {
        if (!appliedMigrations.includes(migration.version)) {
          logger.info(`Running migration ${migration.version}`);
          await client.query(migration.sql);
          await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [migration.version]);
        }
      }

    } finally {
      client.release();
    }
  }

  private getInitialSchema(): string {
    return `
      -- Token Transfers Table
      CREATE TABLE IF NOT EXISTS token_transfers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_hash VARCHAR(66) NOT NULL,
        block_number BIGINT NOT NULL,
        log_index INTEGER NOT NULL,
        from_address VARCHAR(42) NOT NULL,
        to_address VARCHAR(42) NOT NULL,
        amount NUMERIC(78, 0) NOT NULL,
        partition BYTEA NOT NULL,
        operator_data BYTEA,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(transaction_hash, log_index)
      );

      -- Compliance Actions Table
      CREATE TABLE IF NOT EXISTS compliance_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_hash VARCHAR(66) NOT NULL,
        block_number BIGINT NOT NULL,
        log_index INTEGER NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        wallet_address VARCHAR(42) NOT NULL,
        operator_address VARCHAR(42) NOT NULL,
        reason_code VARCHAR(66),
        details JSONB,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(transaction_hash, log_index)
      );

      -- Payouts Table
      CREATE TABLE IF NOT EXISTS payouts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_hash VARCHAR(66) NOT NULL,
        block_number BIGINT NOT NULL,
        log_index INTEGER NOT NULL,
        snapshot_id BIGINT NOT NULL,
        total_amount NUMERIC(78, 0) NOT NULL,
        distribution_mode VARCHAR(20) NOT NULL,
        holder_count INTEGER NOT NULL,
        network_fee_eth NUMERIC(18, 18),
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(transaction_hash, log_index)
      );

      -- Payout Recipients Table
      CREATE TABLE IF NOT EXISTS payout_recipients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
        wallet_address VARCHAR(42) NOT NULL,
        amount NUMERIC(78, 0) NOT NULL,
        percentage NUMERIC(5, 4) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Snapshots Table
      CREATE TABLE IF NOT EXISTS snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        snapshot_id BIGINT NOT NULL UNIQUE,
        transaction_hash VARCHAR(66) NOT NULL,
        block_number BIGINT NOT NULL,
        total_supply NUMERIC(78, 0) NOT NULL,
        holder_count INTEGER NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- System State Table
      CREATE TABLE IF NOT EXISTS system_state (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(100) NOT NULL UNIQUE,
        value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_by VARCHAR(42) NOT NULL
      );

      -- Alerts Table
      CREATE TABLE IF NOT EXISTS alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        alert_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        data JSONB,
        sent_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Multisig Actions Table
      CREATE TABLE IF NOT EXISTS multisig_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action_type VARCHAR(50) NOT NULL,
        target_address VARCHAR(42) NOT NULL,
        data BYTEA NOT NULL,
        proposer VARCHAR(42) NOT NULL,
        approvers TEXT[] NOT NULL,
        approvals INTEGER DEFAULT 0,
        required_approvals INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE,
        executed_tx_hash VARCHAR(66),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
  }

  private getIndexesSchema(): string {
    return `
      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_token_transfers_from_address ON token_transfers(from_address);
      CREATE INDEX IF NOT EXISTS idx_token_transfers_to_address ON token_transfers(to_address);
      CREATE INDEX IF NOT EXISTS idx_token_transfers_timestamp ON token_transfers(timestamp);
      CREATE INDEX IF NOT EXISTS idx_token_transfers_partition ON token_transfers(partition);

      CREATE INDEX IF NOT EXISTS idx_compliance_actions_wallet ON compliance_actions(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_compliance_actions_type ON compliance_actions(action_type);
      CREATE INDEX IF NOT EXISTS idx_compliance_actions_timestamp ON compliance_actions(timestamp);

      CREATE INDEX IF NOT EXISTS idx_payouts_snapshot ON payouts(snapshot_id);
      CREATE INDEX IF NOT EXISTS idx_payouts_timestamp ON payouts(timestamp);

      CREATE INDEX IF NOT EXISTS idx_payout_recipients_payout ON payout_recipients(payout_id);
      CREATE INDEX IF NOT EXISTS idx_payout_recipients_wallet ON payout_recipients(wallet_address);

      CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON snapshots(timestamp);

      CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
      CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
      CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);

      CREATE INDEX IF NOT EXISTS idx_multisig_actions_status ON multisig_actions(status);
      CREATE INDEX IF NOT EXISTS idx_multisig_actions_expires ON multisig_actions(expires_at);
    `;
  }

  private getViewsSchema(): string {
    return `
      -- Views for common queries
      CREATE OR REPLACE VIEW recent_transfers AS
      SELECT 
        tt.*,
        CASE 
          WHEN tt.partition = '\\x6a03b0013265372b884812b0d3773c026802ac22c12c90268815d185b1917b18' THEN 'REG_D'
          WHEN tt.partition = '\\x6a03b0013265372b884812b0d3773c026802ac22c12c90268815d185b1917b19' THEN 'REG_S'
          ELSE 'UNKNOWN'
        END as partition_name
      FROM token_transfers tt
      ORDER BY tt.timestamp DESC
      LIMIT 100;

      CREATE OR REPLACE VIEW system_overview AS
      SELECT 
        (SELECT COUNT(*) FROM token_transfers) as total_transfers,
        (SELECT COUNT(DISTINCT from_address) + COUNT(DISTINCT to_address) FROM token_transfers) as unique_wallets,
        (SELECT COUNT(*) FROM payouts) as total_payouts,
        (SELECT SUM(total_amount) FROM payouts) as total_distributed,
        (SELECT value FROM system_state WHERE key = 'paused') as system_paused,
        (SELECT value FROM system_state WHERE key = 'controller') as current_controller,
        (SELECT MAX(timestamp) FROM payouts) as last_payout;
    `;
  }

  async healthCheck() {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  }

  async getHolderCount(): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT COUNT(DISTINCT wallet_address) as count
        FROM (
          SELECT from_address as wallet_address FROM token_transfers
          UNION
          SELECT to_address as wallet_address FROM token_transfers
        ) holders
      `);
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  async insertTokenTransfer(data: any) {
    const client = await this.pool.connect();
    try {
      await client.query(`
        INSERT INTO token_transfers (
          transaction_hash, block_number, log_index, from_address, to_address,
          amount, partition, operator_data, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (transaction_hash, log_index) DO NOTHING
      `, [
        data.transactionHash,
        data.blockNumber,
        data.logIndex,
        data.from,
        data.to,
        data.amount,
        data.partition,
        data.operatorData,
        data.timestamp
      ]);
    } finally {
      client.release();
    }
  }

  async insertComplianceAction(data: any) {
    const client = await this.pool.connect();
    try {
      await client.query(`
        INSERT INTO compliance_actions (
          transaction_hash, block_number, log_index, action_type,
          wallet_address, operator_address, reason_code, details, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (transaction_hash, log_index) DO NOTHING
      `, [
        data.transactionHash,
        data.blockNumber,
        data.logIndex,
        data.actionType,
        data.walletAddress,
        data.operatorAddress,
        data.reasonCode,
        JSON.stringify(data.details),
        data.timestamp
      ]);
    } finally {
      client.release();
    }
  }

  async insertPayout(data: any) {
    const client = await this.pool.connect();
    try {
      await client.query(`
        INSERT INTO payouts (
          transaction_hash, block_number, log_index, snapshot_id,
          total_amount, distribution_mode, holder_count, network_fee_eth, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (transaction_hash, log_index) DO NOTHING
      `, [
        data.transactionHash,
        data.blockNumber,
        data.logIndex,
        data.snapshotId,
        data.totalAmount,
        data.distributionMode,
        data.holderCount,
        data.networkFeeEth,
        data.timestamp
      ]);
    } finally {
      client.release();
    }
  }

  async insertSnapshot(data: any) {
    const client = await this.pool.connect();
    try {
      await client.query(`
        INSERT INTO snapshots (
          snapshot_id, transaction_hash, block_number, total_supply, holder_count, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (snapshot_id) DO NOTHING
      `, [
        data.snapshotId,
        data.transactionHash,
        data.blockNumber,
        data.totalSupply,
        data.holderCount,
        data.timestamp
      ]);
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

