#!/usr/bin/env node

/**
 * COINSCIOUS Platform - Deployment Status Checker
 * 
 * This script provides a comprehensive overview of the deployment status:
 * 1. Checks which contracts are deployed
 * 2. Verifies contract functionality
 * 3. Checks service health
 * 4. Provides deployment summary
 * 
 * Usage: node scripts/checkDeploymentStatus.js [--network=base-sepolia]
 */

import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class DeploymentStatusChecker {
  constructor() {
    this.network = process.argv.find(arg => arg.startsWith('--network='))?.split('=')[1] || 'base-sepolia';
    this.rpcUrl = this.network === 'base-sepolia' 
      ? process.env.RPC_URL_BASE_SEPOLIA || 'https://sepolia.base.org'
      : process.env.RPC_URL_BASE_MAINNET || 'https://mainnet.base.org';
    
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.deploymentAddresses = this.loadDeploymentAddresses();
    
    console.log('📊 COINSCIOUS Platform - Deployment Status Check');
    console.log('==============================================');
    console.log(`📍 Network: ${this.network}`);
    console.log(`📍 RPC URL: ${this.rpcUrl}`);
    console.log('');
  }

  loadDeploymentAddresses() {
    if (!fs.existsSync('DEPLOYED_ADDRESSES.json')) {
      console.log('⚠️ DEPLOYED_ADDRESSES.json not found. No contracts deployed yet.');
      return {
        network: this.network,
        deploymentDate: null,
        deployer: null,
        contracts: {},
        deploymentOrder: [],
        nextSteps: ['Deploy contracts first']
      };
    }
    
    return JSON.parse(fs.readFileSync('DEPLOYED_ADDRESSES.json', 'utf8'));
  }

  async check() {
    try {
      console.log('🔍 Step 1: Checking Contract Deployment Status...');
      await this.checkContractDeployment();
      
      console.log('🔍 Step 2: Checking Contract Functionality...');
      await this.checkContractFunctionality();
      
      console.log('🔍 Step 3: Checking Service Health...');
      await this.checkServiceHealth();
      
      console.log('🔍 Step 4: Checking Environment Configuration...');
      await this.checkEnvironmentConfiguration();
      
      console.log('✅ Deployment Status Check Complete!');
      this.printStatusSummary();
      
    } catch (error) {
      console.error('❌ Status check failed:', error.message);
      process.exit(1);
    }
  }

  async checkContractDeployment() {
    const contracts = [
      { name: 'MockUSDC', priority: 1, required: true },
      { name: 'ComplianceRegistry', priority: 2, required: true },
      { name: 'SecurityToken', priority: 3, required: true },
      { name: 'LinearVesting', priority: 4, required: true },
      { name: 'PayoutDistributorFactory', priority: 5, required: false },
      { name: 'SecurityTokenFactory', priority: 6, required: false }
    ];

    let deployedCount = 0;
    let requiredDeployedCount = 0;

    for (const contract of contracts) {
      const contractInfo = this.deploymentAddresses.contracts[contract.name.toLowerCase()];
      
      if (!contractInfo || contractInfo.status !== 'deployed') {
        const status = contract.required ? '❌ REQUIRED' : '⚠️ OPTIONAL';
        console.log(`  ${status} ${contract.name}: Not deployed`);
        continue;
      }

      try {
        // Check if contract exists at address
        const code = await this.provider.getCode(contractInfo.address);
        if (code === '0x') {
          console.log(`  ❌ ${contract.name}: No contract found at address`);
          continue;
        }

        const status = contract.required ? '✅ REQUIRED' : '✅ OPTIONAL';
        console.log(`  ${status} ${contract.name}: ${contractInfo.address} (${code.length} bytes)`);
        
        deployedCount++;
        if (contract.required) {
          requiredDeployedCount++;
        }
        
      } catch (error) {
        console.log(`  ❌ ${contract.name}: Error checking contract (${error.message})`);
      }
    }

    console.log(`\n  📊 Summary: ${deployedCount}/${contracts.length} contracts deployed`);
    console.log(`  📊 Required: ${requiredDeployedCount}/${contracts.filter(c => c.required).length} required contracts deployed`);
  }

  async checkContractFunctionality() {
    const contracts = [
      { name: 'MockUSDC', testFunction: 'testMockUSDC' },
      { name: 'ComplianceRegistry', testFunction: 'testComplianceRegistry' },
      { name: 'SecurityToken', testFunction: 'testSecurityToken' },
      { name: 'LinearVesting', testFunction: 'testLinearVesting' }
    ];

    for (const contract of contracts) {
      const contractInfo = this.deploymentAddresses.contracts[contract.name.toLowerCase()];
      
      if (!contractInfo || contractInfo.status !== 'deployed') {
        console.log(`  ⚠️ ${contract.name}: Not deployed, skipping functionality test`);
        continue;
      }

      try {
        await this[contract.testFunction](contractInfo);
      } catch (error) {
        console.log(`  ❌ ${contract.name}: Functionality test failed (${error.message})`);
      }
    }
  }

  async testMockUSDC(contractInfo) {
    const artifactPath = 'contracts/out/MockUSDC.sol/MockUSDC.json';
    if (!fs.existsSync(artifactPath)) {
      console.log(`    ⚠️ MockUSDC: Artifact not found, skipping test`);
      return;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const contract = new ethers.Contract(contractInfo.address, artifact.abi, this.provider);

    const name = await contract.name();
    const symbol = await contract.symbol();
    const decimals = await contract.decimals();
    const totalSupply = await contract.totalSupply();

    console.log(`    ✅ MockUSDC: ${name} (${symbol}) - ${ethers.formatUnits(totalSupply, decimals)} tokens`);
  }

  async testComplianceRegistry(contractInfo) {
    const artifactPath = 'contracts/out/ComplianceRegistry.sol/ComplianceRegistry.json';
    if (!fs.existsSync(artifactPath)) {
      console.log(`    ⚠️ ComplianceRegistry: Artifact not found, skipping test`);
      return;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const contract = new ethers.Contract(contractInfo.address, artifact.abi, this.provider);

    const owner = await contract.owner();
    console.log(`    ✅ ComplianceRegistry: Owner is ${owner}`);
  }

  async testSecurityToken(contractInfo) {
    const artifactPath = 'contracts/out/SecurityToken.sol/SecurityToken.json';
    if (!fs.existsSync(artifactPath)) {
      console.log(`    ⚠️ SecurityToken: Artifact not found, skipping test`);
      return;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const contract = new ethers.Contract(contractInfo.address, artifact.abi, this.provider);

    const name = await contract.name();
    const symbol = await contract.symbol();
    const decimals = await contract.decimals();
    const totalSupply = await contract.totalSupply();
    const owner = await contract.owner();

    console.log(`    ✅ SecurityToken: ${name} (${symbol}) - ${ethers.formatUnits(totalSupply, decimals)} tokens`);
    console.log(`    ✅ SecurityToken: Owner is ${owner}`);
  }

  async testLinearVesting(contractInfo) {
    const artifactPath = 'contracts/out/LinearVesting.sol/LinearVesting.json';
    if (!fs.existsSync(artifactPath)) {
      console.log(`    ⚠️ LinearVesting: Artifact not found, skipping test`);
      return;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const contract = new ethers.Contract(contractInfo.address, artifact.abi, this.provider);

    const token = await contract.token();
    const owner = await contract.owner();

    console.log(`    ✅ LinearVesting: Token is ${token}, Owner is ${owner}`);
  }

  async checkServiceHealth() {
    const services = [
      { name: 'Event Indexer', url: 'http://localhost:3001/health', port: 3001 },
      { name: 'API Service', url: 'http://localhost:3002/health', port: 3002 },
      { name: 'Operator Console', url: 'http://localhost:3000', port: 3000 }
    ];

    for (const service of services) {
      try {
        const response = await fetch(service.url);
        if (response.ok) {
          console.log(`  ✅ ${service.name}: Healthy (port ${service.port})`);
        } else {
          console.log(`  ⚠️ ${service.name}: Unhealthy (port ${service.port}, status ${response.status})`);
        }
      } catch (error) {
        console.log(`  ❌ ${service.name}: Not running (port ${service.port})`);
      }
    }
  }

  async checkEnvironmentConfiguration() {
    const requiredEnvVars = [
      'RPC_URL_BASE_SEPOLIA',
      'PRIVATE_KEY',
      'DATABASE_URL'
    ];

    const optionalEnvVars = [
      'ETHERSCAN_API_KEY',
      'SLACK_WEBHOOK_URL',
      'SMTP_HOST',
      'SMTP_USER'
    ];

    console.log('  🔍 Required Environment Variables:');
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`    ✅ ${envVar}: Set`);
      } else {
        console.log(`    ❌ ${envVar}: Not set`);
      }
    }

    console.log('  🔍 Optional Environment Variables:');
    for (const envVar of optionalEnvVars) {
      if (process.env[envVar]) {
        console.log(`    ✅ ${envVar}: Set`);
      } else {
        console.log(`    ⚠️ ${envVar}: Not set`);
      }
    }
  }

  printStatusSummary() {
    console.log('\n📊 DEPLOYMENT STATUS SUMMARY');
    console.log('============================');
    console.log(`📍 Network: ${this.network}`);
    console.log(`📍 Deployer: ${this.deploymentAddresses.deployer || 'Not set'}`);
    console.log(`📍 Deployment Date: ${this.deploymentAddresses.deploymentDate || 'Not deployed'}`);
    
    console.log('\n📋 Contract Status:');
    const contracts = [
      'mockUSDC',
      'complianceRegistry', 
      'securityToken',
      'linearVesting',
      'payoutDistributorFactory',
      'securityTokenFactory'
    ];

    for (const contractName of contracts) {
      const contract = this.deploymentAddresses.contracts[contractName];
      if (contract && contract.status === 'deployed') {
        const verified = contract.verified ? ' (Verified)' : ' (Not verified)';
        console.log(`  ✅ ${contract.name}: ${contract.address}${verified}`);
      } else {
        console.log(`  ❌ ${contractName}: Not deployed`);
      }
    }
    
    console.log('\n🔗 Useful Links:');
    if (this.deploymentAddresses.deployer) {
      const baseUrl = this.network === 'base-sepolia' 
        ? 'https://sepolia.basescan.org/address/'
        : 'https://basescan.org/address/';
      console.log(`  📊 Explorer: ${baseUrl}${this.deploymentAddresses.deployer}`);
    }
    console.log(`  🏠 Operator Console: http://localhost:3000`);
    console.log(`  📈 Event Indexer: http://localhost:3001`);
    console.log(`  🔧 API Service: http://localhost:3002`);
    
    console.log('\n📝 Next Steps:');
    if (this.deploymentAddresses.nextSteps && this.deploymentAddresses.nextSteps.length > 0) {
      for (const step of this.deploymentAddresses.nextSteps) {
        console.log(`  • ${step}`);
      }
    } else {
      console.log('  • Deploy contracts first');
      console.log('  • Configure environment variables');
      console.log('  • Start services');
    }
    
    console.log('\n✅ Deployment status check complete!');
  }
}

// Main execution
async function main() {
  const checker = new DeploymentStatusChecker();
  await checker.check();
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Status check failed:', error);
    process.exit(1);
  });
}

export { DeploymentStatusChecker };
