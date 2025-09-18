-- COINSCIOUS Platform Database Schema
-- Supports MVP++ operator console and event indexing

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Token Transfers Table
CREATE TABLE token_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL, -- 18 decimal precision
    partition BYTEA NOT NULL,
    operator_data BYTEA,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(transaction_hash, log_index)
);

-- Compliance Actions Table
CREATE TABLE compliance_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'setClaims', 'revoke', 'freeze', 'unfreeze', 'pause', 'unpause'
    wallet_address VARCHAR(42) NOT NULL,
    operator_address VARCHAR(42) NOT NULL,
    reason_code VARCHAR(66),
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(transaction_hash, log_index)
);

-- Payouts Table
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,
    snapshot_id BIGINT NOT NULL,
    total_amount NUMERIC(78, 0) NOT NULL,
    distribution_mode VARCHAR(20) NOT NULL, -- 'FULL', 'PRO_RATA'
    holder_count INTEGER NOT NULL,
    network_fee_eth NUMERIC(18, 18),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(transaction_hash, log_index)
);

-- Payout Recipients Table
CREATE TABLE payout_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
    wallet_address VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    percentage NUMERIC(5, 4) NOT NULL, -- Up to 4 decimal places for percentage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Snapshots Table
CREATE TABLE snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_id BIGINT NOT NULL UNIQUE,
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    total_supply NUMERIC(78, 0) NOT NULL,
    holder_count INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System State Table
CREATE TABLE system_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(42) NOT NULL
);

-- Alerts Table
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Multisig Actions Table
CREATE TABLE multisig_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type VARCHAR(50) NOT NULL,
    target_address VARCHAR(42) NOT NULL,
    data BYTEA NOT NULL,
    proposer VARCHAR(42) NOT NULL,
    approvers TEXT[] NOT NULL, -- Array of approver addresses
    approvals INTEGER DEFAULT 0,
    required_approvals INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'EXECUTED', 'REJECTED'
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE,
    executed_tx_hash VARCHAR(66),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_token_transfers_from_address ON token_transfers(from_address);
CREATE INDEX idx_token_transfers_to_address ON token_transfers(to_address);
CREATE INDEX idx_token_transfers_timestamp ON token_transfers(timestamp);
CREATE INDEX idx_token_transfers_partition ON token_transfers(partition);

CREATE INDEX idx_compliance_actions_wallet ON compliance_actions(wallet_address);
CREATE INDEX idx_compliance_actions_type ON compliance_actions(action_type);
CREATE INDEX idx_compliance_actions_timestamp ON compliance_actions(timestamp);

CREATE INDEX idx_payouts_snapshot ON payouts(snapshot_id);
CREATE INDEX idx_payouts_timestamp ON payouts(timestamp);

CREATE INDEX idx_payout_recipients_payout ON payout_recipients(payout_id);
CREATE INDEX idx_payout_recipients_wallet ON payout_recipients(wallet_address);

CREATE INDEX idx_snapshots_timestamp ON snapshots(timestamp);

CREATE INDEX idx_alerts_type ON alerts(alert_type);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_created ON alerts(created_at);

CREATE INDEX idx_multisig_actions_status ON multisig_actions(status);
CREATE INDEX idx_multisig_actions_expires ON multisig_actions(expires_at);

-- Views for common queries
CREATE VIEW recent_transfers AS
SELECT 
    tt.*,
    CASE 
        WHEN tt.partition = '\x6a03b0013265372b884812b0d3773c026802ac22c12c90268815d185b1917b18' THEN 'REG_D'
        WHEN tt.partition = '\x6a03b0013265372b884812b0d3773c026802ac22c12c90268815d185b1917b19' THEN 'REG_S'
        ELSE 'UNKNOWN'
    END as partition_name
FROM token_transfers tt
ORDER BY tt.timestamp DESC
LIMIT 100;

CREATE VIEW system_overview AS
SELECT 
    (SELECT COUNT(*) FROM token_transfers) as total_transfers,
    (SELECT COUNT(DISTINCT from_address) + COUNT(DISTINCT to_address) FROM token_transfers) as unique_wallets,
    (SELECT COUNT(*) FROM payouts) as total_payouts,
    (SELECT SUM(total_amount) FROM payouts) as total_distributed,
    (SELECT value FROM system_state WHERE key = 'paused') as system_paused,
    (SELECT value FROM system_state WHERE key = 'controller') as current_controller,
    (SELECT MAX(timestamp) FROM payouts) as last_payout;

-- Insert initial system state
INSERT INTO system_state (key, value, updated_by) VALUES
('paused', 'false', '0x0000000000000000000000000000000000000000'),
('controller', '0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000'),
('version', '1.0.0', '0x0000000000000000000000000000000000000000');

