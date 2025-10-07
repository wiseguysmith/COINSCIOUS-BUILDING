#!/usr/bin/env node

/**
 * COINSCIOUS Platform - Complete System Deployment Script
 * 
 * This script deploys the entire COINSCIOUS platform to Base Sepolia testnet:
 * 1. Compiles all smart contracts
 * 2. Deploys contracts in proper order
 * 3. Verifies contracts on Etherscan
 * 4. Updates deployment addresses
 * 5. Configures environment variables
 * 6. Starts all services
 * 
 * Usage: node deployCompleteSystem.js [--network=base-sepolia] [--verify] [--start-services]
 */

import { ethers } from 'ethers';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class CompleteSystemDeployer {
  constructor() {
    this.network = process.argv.find(arg => arg.startsWith('--network='))?.split('=')[1] || 'base-sepolia';
    this.verify = process.argv.includes('--verify');
    this.startServices = process.argv.includes('--start-services');
    
    this.rpcUrl = this.network === 'base-sepolia' 
      ? process.env.RPC_URL_BASE_SEPOLIA || 'https://sepolia.base.org'
      : process.env.RPC_URL_BASE_MAINNET || 'https://mainnet.base.org';
    
    this.privateKey = process.env.PRIVATE_KEY;
    this.etherscanApiKey = process.env.ETHERSCAN_API_KEY;
    
    if (!this.privateKey) {
      throw new Error('❌ PRIVATE_KEY environment variable is required');
    }
    
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.wallet = new ethers.Wallet(this.privateKey, this.provider);
    
    this.deploymentAddresses = {
      network: this.network,
      deploymentDate: new Date().toISOString(),
      deployer: this.wallet.address,
      contracts: {},
      deploymentOrder: [],
      nextSteps: []
    };
    
    console.log('🚀 COINSCIOUS Platform - Complete System Deployment');
    console.log('================================================');
    console.log(`📍 Network: ${this.network}`);
    console.log(`📍 Deployer: ${this.wallet.address}`);
    console.log(`📍 RPC URL: ${this.rpcUrl}`);
    console.log(`📍 Verify Contracts: ${this.verify ? 'Yes' : 'No'}`);
    console.log(`📍 Start Services: ${this.startServices ? 'Yes' : 'No'}`);
    console.log('');
  }

  async deploy() {
    try {
      console.log('🔧 Step 1: Compiling Smart Contracts...');
      await this.compileContracts();
      
      console.log('🚀 Step 2: Deploying Smart Contracts...');
      await this.deployContracts();
      
      if (this.verify) {
        console.log('🔍 Step 3: Verifying Contracts on Etherscan...');
        await this.verifyContracts();
      }
      
      console.log('📝 Step 4: Updating Deployment Addresses...');
      await this.updateDeploymentAddresses();
      
      console.log('⚙️ Step 5: Configuring Environment...');
      await this.configureEnvironment();
      
      if (this.startServices) {
        console.log('🔄 Step 6: Starting Services...');
        await this.startServices();
      }
      
      console.log('✅ Complete System Deployment Successful!');
      this.printDeploymentSummary();
      
    } catch (error) {
      console.error('❌ Deployment failed:', error.message);
      process.exit(1);
    }
  }

  async compileContracts() {
    try {
      console.log('  📦 Compiling contracts with Foundry...');
      execSync('cd contracts && forge build', { stdio: 'inherit' });
      console.log('  ✅ Contracts compiled successfully');
    } catch (error) {
      throw new Error(`Contract compilation failed: ${error.message}`);
    }
  }

  async deployContracts() {
    const contracts = [
      { name: 'MockUSDC', priority: 1, deployed: false },
      { name: 'ComplianceRegistry', priority: 2, deployed: false },
      { name: 'SecurityToken', priority: 3, deployed: false },
      { name: 'LinearVesting', priority: 4, deployed: false },
      { name: 'PayoutDistributorFactory', priority: 5, deployed: false },
      { name: 'SecurityTokenFactory', priority: 6, deployed: false }
    ];

    // Check if contracts are already deployed
    if (fs.existsSync('DEPLOYED_ADDRESSES.json')) {
      const existing = JSON.parse(fs.readFileSync('DEPLOYED_ADDRESSES.json', 'utf8'));
      contracts.forEach(contract => {
        if (existing.contracts[contract.name.toLowerCase()]?.status === 'deployed') {
          contract.deployed = true;
          console.log(`  ✅ ${contract.name} already deployed`);
        }
      });
    }

    // Deploy contracts in priority order
    for (const contract of contracts.sort((a, b) => a.priority - b.priority)) {
      if (contract.deployed) continue;
      
      console.log(`  🚀 Deploying ${contract.name}...`);
      await this.deployContract(contract.name);
    }
  }

  async deployContract(contractName) {
    try {
      // Load contract artifact
      const artifactPath = `contracts/out/${contractName}.sol/${contractName}.json`;
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      
      const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, this.wallet);
      
      let contract;
      let constructorArgs = [];
      
      switch (contractName) {
        case 'MockUSDC':
          contract = await factory.deploy();
          break;
          
        case 'ComplianceRegistry':
          contract = await factory.deploy();
          break;
          
        case 'SecurityToken':
          // SecurityToken needs ComplianceRegistry address
          const complianceRegistryAddress = this.deploymentAddresses.contracts.complianceregistry?.address;
          if (!complianceRegistryAddress) {
            throw new Error('ComplianceRegistry must be deployed before SecurityToken');
          }
          constructorArgs = [
            'COINSCIOUS Security Token',
            'COIN',
            this.wallet.address, // owner
            complianceRegistryAddress // compliance registry
          ];
          contract = await factory.deploy(...constructorArgs);
          break;
          
        case 'LinearVesting':
          // LinearVesting needs SecurityToken address
          const securityTokenAddress = this.deploymentAddresses.contracts.securitytoken?.address;
          if (!securityTokenAddress) {
            throw new Error('SecurityToken must be deployed before LinearVesting');
          }
          constructorArgs = [securityTokenAddress];
          contract = await factory.deploy(...constructorArgs);
          break;
          
        case 'PayoutDistributorFactory':
          contract = await factory.deploy();
          break;
          
        case 'SecurityTokenFactory':
          contract = await factory.deploy();
          break;
          
        default:
          contract = await factory.deploy();
      }
      
      await contract.waitForDeployment();
      const address = await contract.getAddress();
      
      console.log(`    ✅ ${contractName} deployed to: ${address}`);
      
      // Store deployment info
      this.deploymentAddresses.contracts[contractName.toLowerCase()] = {
        address: address,
        name: contractName,
        status: 'deployed',
        transactionHash: contract.deploymentTransaction()?.hash,
        blockNumber: contract.deploymentTransaction()?.blockNumber,
        constructorArgs: constructorArgs,
        deploymentConfirmed: true
      };
      
      this.deploymentAddresses.deploymentOrder.push(`${contractName} - ✅ COMPLETED`);
      
    } catch (error) {
      throw new Error(`Failed to deploy ${contractName}: ${error.message}`);
    }
  }

  async verifyContracts() {
    if (!this.etherscanApiKey) {
      console.log('  ⚠️ ETHERSCAN_API_KEY not provided, skipping verification');
      return;
    }

    for (const [contractName, contractInfo] of Object.entries(this.deploymentAddresses.contracts)) {
      if (contractInfo.status !== 'deployed') continue;
      
      try {
        console.log(`  🔍 Verifying ${contractInfo.name}...`);
        
        const verifyCommand = `cd contracts && forge verify-contract ${contractInfo.address} ${contractInfo.name} --chain-id ${this.network === 'base-sepolia' ? '84532' : '8453'} --etherscan-api-key ${this.etherscanApiKey}`;
        
        execSync(verifyCommand, { stdio: 'inherit' });
        console.log(`    ✅ ${contractInfo.name} verified successfully`);
        
      } catch (error) {
        console.log(`    ⚠️ Failed to verify ${contractInfo.name}: ${error.message}`);
      }
    }
  }

  async updateDeploymentAddresses() {
    // Update DEPLOYED_ADDRESSES.json
    this.deploymentAddresses.nextSteps = [
      'All core contracts deployed successfully',
      'Environment configured for production',
      'Ready for end-to-end testing'
    ];
    
    fs.writeFileSync('DEPLOYED_ADDRESSES.json', JSON.stringify(this.deploymentAddresses, null, 2));
    console.log('  ✅ Updated DEPLOYED_ADDRESSES.json');
    
    // Create environment configuration
    await this.createEnvironmentConfig();
  }

  async createEnvironmentConfig() {
    const envConfig = `# COINSCIOUS Platform - Generated Environment Configuration
# Generated on: ${new Date().toISOString()}
# Network: ${this.network}

# =============================================================================
# BLOCKCHAIN CONFIGURATION
# =============================================================================

RPC_URL_BASE_SEPOLIA=${this.rpcUrl}
PRIVATE_KEY=${this.privateKey}
ETHERSCAN_API_KEY=${this.etherscanApiKey || 'your_etherscan_api_key_here'}

# =============================================================================
# CONTRACT ADDRESSES
# =============================================================================

# Core Contracts
MOCK_USDC_ADDRESS=${this.deploymentAddresses.contracts.mockusdc?.address || 'N/A'}
COMPLIANCE_REGISTRY_ADDRESS=${this.deploymentAddresses.contracts.complianceregistry?.address || 'N/A'}
SECURITY_TOKEN_ADDRESS=${this.deploymentAddresses.contracts.securitytoken?.address || 'N/A'}
LINEAR_VESTING_ADDRESS=${this.deploymentAddresses.contracts.linearvesting?.address || 'N/A'}
PAYOUT_DISTRIBUTOR_FACTORY_ADDRESS=${this.deploymentAddresses.contracts.payoutdistributorfactory?.address || 'N/A'}
SECURITY_TOKEN_FACTORY_ADDRESS=${this.deploymentAddresses.contracts.securitytokenfactory?.address || 'N/A'}

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================

DATABASE_URL=postgresql://username:password@localhost:5432/coinscious
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_IDLE_TIMEOUT=30000

# =============================================================================
# MONITORING & ALERTING
# =============================================================================

SLACK_WEBHOOK_URL=${process.env.SLACK_WEBHOOK_URL || 'your_slack_webhook_url_here'}
SMTP_HOST=${process.env.SMTP_HOST || 'smtp.gmail.com'}
SMTP_PORT=${process.env.SMTP_PORT || '587'}
SMTP_USER=${process.env.SMTP_USER || 'your_email@gmail.com'}
SMTP_PASS=${process.env.SMTP_PASS || 'your_app_password'}
SMTP_FROM=${process.env.SMTP_FROM || 'alerts@coinscious.com'}

# =============================================================================
# INDEXER CONFIGURATION
# =============================================================================

INDEXER_POLL_INTERVAL=5000
START_BLOCK=0
HEALTH_CHECK_INTERVAL=5
METRICS_COLLECTION_INTERVAL=5
DASHBOARD_UPDATE_INTERVAL=10
DAILY_REPORT_TIME=09:00

# =============================================================================
# COMPLIANCE CONFIGURATION
# =============================================================================

TWELVE_G_LIMIT=2000
TWELVE_G_WARN1_PCT=70
TWELVE_G_WARN2_PCT=90

# =============================================================================
# DEPLOYMENT CONFIGURATION
# =============================================================================

DEPLOYMENTS_JSON_PATH=deployments/base-sepolia-addresses.json
VERIFICATION_DELAY=30
GAS_PRICE_MULTIPLIER=1.1

# =============================================================================
# SECURITY CONFIGURATION
# =============================================================================

JWT_SECRET=${process.env.JWT_SECRET || 'your_jwt_secret_here'}
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGINS=http://localhost:3000,https://console.coinscious.com

# =============================================================================
# DEVELOPMENT CONFIGURATION
# =============================================================================

NODE_ENV=production
DEBUG=coinscious:*
LOG_LEVEL=info
`;

    fs.writeFileSync('.env.production', envConfig);
    console.log('  ✅ Created .env.production configuration');
  }

  async startServices() {
    console.log('  🔄 Starting Event Indexer...');
    try {
      // Start indexer in background
      const indexerProcess = execSync('cd apps/indexer && npm start', { 
        stdio: 'inherit',
        detached: true 
      });
      console.log('    ✅ Event Indexer started');
    } catch (error) {
      console.log('    ⚠️ Failed to start Event Indexer:', error.message);
    }

    console.log('  🔄 Starting Operator Console...');
    try {
      // Start console in background
      const consoleProcess = execSync('cd apps/console && npm run dev', { 
        stdio: 'inherit',
        detached: true 
      });
      console.log('    ✅ Operator Console started');
    } catch (error) {
      console.log('    ⚠️ Failed to start Operator Console:', error.message);
    }
  }

  printDeploymentSummary() {
    console.log('\n🎉 DEPLOYMENT SUMMARY');
    console.log('====================');
    console.log(`📍 Network: ${this.network}`);
    console.log(`📍 Deployer: ${this.wallet.address}`);
    console.log(`📍 Deployment Date: ${this.deploymentAddresses.deploymentDate}`);
    console.log('\n📋 Deployed Contracts:');
    
    for (const [name, contract] of Object.entries(this.deploymentAddresses.contracts)) {
      if (contract.status === 'deployed') {
        console.log(`  ✅ ${contract.name}: ${contract.address}`);
      }
    }
    
    console.log('\n📝 Next Steps:');
    console.log('  1. Copy .env.production to .env');
    console.log('  2. Update database configuration');
    console.log('  3. Configure monitoring and alerting');
    console.log('  4. Run end-to-end tests');
    console.log('  5. Start production services');
    
    console.log('\n🔗 Useful Links:');
    console.log(`  📊 Base Sepolia Explorer: https://sepolia.basescan.org/address/${this.wallet.address}`);
    console.log(`  🏠 Operator Console: http://localhost:3000`);
    console.log(`  📈 Event Indexer: http://localhost:3001`);
    
    console.log('\n✅ Complete System Deployment Successful!');
  }
}

// Main execution
async function main() {
  const deployer = new CompleteSystemDeployer();
  await deployer.deploy();
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
}

export { CompleteSystemDeployer };
