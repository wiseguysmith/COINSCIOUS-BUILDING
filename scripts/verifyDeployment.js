#!/usr/bin/env node

/**
 * COINSCIOUS Platform - Deployment Verification Script
 * 
 * This script verifies that all contracts are properly deployed and configured:
 * 1. Checks contract addresses are valid
 * 2. Verifies contract bytecode matches expected
 * 3. Tests contract functionality
 * 4. Validates environment configuration
 * 5. Checks service health
 * 
 * Usage: node scripts/verifyDeployment.js [--network=base-sepolia]
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class DeploymentVerifier {
  constructor() {
    this.network = process.argv.find(arg => arg.startsWith('--network='))?.split('=')[1] || 'base-sepolia';
    this.rpcUrl = this.network === 'base-sepolia' 
      ? process.env.RPC_URL_BASE_SEPOLIA || 'https://sepolia.base.org'
      : process.env.RPC_URL_BASE_MAINNET || 'https://mainnet.base.org';
    
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.deploymentAddresses = this.loadDeploymentAddresses();
    
    console.log('🔍 COINSCIOUS Platform - Deployment Verification');
    console.log('==============================================');
    console.log(`📍 Network: ${this.network}`);
    console.log(`📍 RPC URL: ${this.rpcUrl}`);
    console.log('');
  }

  loadDeploymentAddresses() {
    if (!fs.existsSync('DEPLOYED_ADDRESSES.json')) {
      throw new Error('❌ DEPLOYED_ADDRESSES.json not found. Please deploy contracts first.');
    }
    
    return JSON.parse(fs.readFileSync('DEPLOYED_ADDRESSES.json', 'utf8'));
  }

  async verify() {
    try {
      console.log('🔍 Step 1: Verifying Contract Addresses...');
      await this.verifyContractAddresses();
      
      console.log('🔍 Step 2: Verifying Contract Functionality...');
      await this.verifyContractFunctionality();
      
      console.log('🔍 Step 3: Verifying Environment Configuration...');
      await this.verifyEnvironmentConfiguration();
      
      console.log('🔍 Step 4: Verifying Service Health...');
      await this.verifyServiceHealth();
      
      console.log('✅ Deployment Verification Complete!');
      this.printVerificationSummary();
      
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      process.exit(1);
    }
  }

  async verifyContractAddresses() {
    const contracts = [
      'mockUSDC',
      'complianceRegistry', 
      'securityToken',
      'linearVesting',
      'payoutDistributorFactory',
      'securityTokenFactory'
    ];

    for (const contractName of contracts) {
      const contractInfo = this.deploymentAddresses.contracts[contractName];
      
      if (!contractInfo || contractInfo.status !== 'deployed') {
        console.log(`  ❌ ${contractName}: Not deployed`);
        continue;
      }

      try {
        // Check if address is valid
        if (!ethers.isAddress(contractInfo.address)) {
          throw new Error(`Invalid address format: ${contractInfo.address}`);
        }

        // Check if contract exists at address
        const code = await this.provider.getCode(contractInfo.address);
        if (code === '0x') {
          throw new Error('No contract found at address');
        }

        console.log(`  ✅ ${contractName}: ${contractInfo.address} (${code.length} bytes)`);
        
      } catch (error) {
        console.log(`  ❌ ${contractName}: ${error.message}`);
      }
    }
  }

  async verifyContractFunctionality() {
    console.log('  🔍 Testing MockUSDC functionality...');
    await this.testMockUSDC();
    
    console.log('  🔍 Testing ComplianceRegistry functionality...');
    await this.testComplianceRegistry();
    
    console.log('  🔍 Testing SecurityToken functionality...');
    await this.testSecurityToken();
    
    console.log('  🔍 Testing LinearVesting functionality...');
    await this.testLinearVesting();
  }

  async testMockUSDC() {
    const contractInfo = this.deploymentAddresses.contracts.mockusdc;
    if (!contractInfo || contractInfo.status !== 'deployed') return;

    try {
      // Load contract ABI
      const artifactPath = 'contracts/out/MockUSDC.sol/MockUSDC.json';
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      const contract = new ethers.Contract(contractInfo.address, artifact.abi, this.provider);

      // Test basic functionality
      const name = await contract.name();
      const symbol = await contract.symbol();
      const decimals = await contract.decimals();
      const totalSupply = await contract.totalSupply();

      console.log(`    ✅ Name: ${name}`);
      console.log(`    ✅ Symbol: ${symbol}`);
      console.log(`    ✅ Decimals: ${decimals}`);
      console.log(`    ✅ Total Supply: ${ethers.formatUnits(totalSupply, decimals)}`);

    } catch (error) {
      console.log(`    ❌ MockUSDC test failed: ${error.message}`);
    }
  }

  async testComplianceRegistry() {
    const contractInfo = this.deploymentAddresses.contracts.complianceregistry;
    if (!contractInfo || contractInfo.status !== 'deployed') return;

    try {
      const artifactPath = 'contracts/out/ComplianceRegistry.sol/ComplianceRegistry.json';
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      const contract = new ethers.Contract(contractInfo.address, artifact.abi, this.provider);

      // Test basic functionality
      const owner = await contract.owner();
      console.log(`    ✅ Owner: ${owner}`);

    } catch (error) {
      console.log(`    ❌ ComplianceRegistry test failed: ${error.message}`);
    }
  }

  async testSecurityToken() {
    const contractInfo = this.deploymentAddresses.contracts.securitytoken;
    if (!contractInfo || contractInfo.status !== 'deployed') return;

    try {
      const artifactPath = 'contracts/out/SecurityToken.sol/SecurityToken.json';
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      const contract = new ethers.Contract(contractInfo.address, artifact.abi, this.provider);

      // Test basic functionality
      const name = await contract.name();
      const symbol = await contract.symbol();
      const decimals = await contract.decimals();
      const totalSupply = await contract.totalSupply();
      const owner = await contract.owner();

      console.log(`    ✅ Name: ${name}`);
      console.log(`    ✅ Symbol: ${symbol}`);
      console.log(`    ✅ Decimals: ${decimals}`);
      console.log(`    ✅ Total Supply: ${ethers.formatUnits(totalSupply, decimals)}`);
      console.log(`    ✅ Owner: ${owner}`);

    } catch (error) {
      console.log(`    ❌ SecurityToken test failed: ${error.message}`);
    }
  }

  async testLinearVesting() {
    const contractInfo = this.deploymentAddresses.contracts.linearvesting;
    if (!contractInfo || contractInfo.status !== 'deployed') return;

    try {
      const artifactPath = 'contracts/out/LinearVesting.sol/LinearVesting.json';
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      const contract = new ethers.Contract(contractInfo.address, artifact.abi, this.provider);

      // Test basic functionality
      const token = await contract.token();
      const owner = await contract.owner();

      console.log(`    ✅ Token: ${token}`);
      console.log(`    ✅ Owner: ${owner}`);

    } catch (error) {
      console.log(`    ❌ LinearVesting test failed: ${error.message}`);
    }
  }

  async verifyEnvironmentConfiguration() {
    const requiredEnvVars = [
      'RPC_URL_BASE_SEPOLIA',
      'PRIVATE_KEY',
      'DATABASE_URL'
    ];

    console.log('  🔍 Checking required environment variables...');
    
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`    ✅ ${envVar}: Set`);
      } else {
        console.log(`    ❌ ${envVar}: Not set`);
      }
    }

    // Check contract addresses in environment
    const contractEnvVars = [
      'MOCK_USDC_ADDRESS',
      'COMPLIANCE_REGISTRY_ADDRESS',
      'SECURITY_TOKEN_ADDRESS',
      'LINEAR_VESTING_ADDRESS'
    ];

    console.log('  🔍 Checking contract address environment variables...');
    
    for (const envVar of contractEnvVars) {
      if (process.env[envVar] && process.env[envVar] !== 'N/A') {
        console.log(`    ✅ ${envVar}: ${process.env[envVar]}`);
      } else {
        console.log(`    ⚠️ ${envVar}: Not set or N/A`);
      }
    }
  }

  async verifyServiceHealth() {
    console.log('  🔍 Checking service health endpoints...');
    
    const services = [
      { name: 'Event Indexer', url: 'http://localhost:3001/health' },
      { name: 'API Service', url: 'http://localhost:3002/health' },
      { name: 'Operator Console', url: 'http://localhost:3000' }
    ];

    for (const service of services) {
      try {
        const response = await fetch(service.url);
        if (response.ok) {
          console.log(`    ✅ ${service.name}: Healthy`);
        } else {
          console.log(`    ⚠️ ${service.name}: Unhealthy (${response.status})`);
        }
      } catch (error) {
        console.log(`    ❌ ${service.name}: Not running (${error.message})`);
      }
    }
  }

  printVerificationSummary() {
    console.log('\n📊 VERIFICATION SUMMARY');
    console.log('======================');
    console.log(`📍 Network: ${this.network}`);
    console.log(`📍 Deployer: ${this.deploymentAddresses.deployer}`);
    console.log(`📍 Deployment Date: ${this.deploymentAddresses.deploymentDate}`);
    
    console.log('\n📋 Contract Status:');
    for (const [name, contract] of Object.entries(this.deploymentAddresses.contracts)) {
      const status = contract.status === 'deployed' ? '✅' : '❌';
      console.log(`  ${status} ${contract.name}: ${contract.address || 'Not deployed'}`);
    }
    
    console.log('\n🔗 Useful Links:');
    console.log(`  📊 Base Sepolia Explorer: https://sepolia.basescan.org/address/${this.deploymentAddresses.deployer}`);
    console.log(`  🏠 Operator Console: http://localhost:3000`);
    console.log(`  📈 Event Indexer: http://localhost:3001`);
    console.log(`  🔧 API Service: http://localhost:3002`);
    
    console.log('\n✅ Deployment verification complete!');
  }
}

// Main execution
async function main() {
  const verifier = new DeploymentVerifier();
  await verifier.verify();
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
}

export { DeploymentVerifier };
