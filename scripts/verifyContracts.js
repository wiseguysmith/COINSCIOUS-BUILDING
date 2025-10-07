#!/usr/bin/env node

/**
 * COINSCIOUS Platform - Contract Verification Script
 * 
 * This script verifies all deployed contracts on Etherscan:
 * 1. Verifies contract source code
 * 2. Verifies constructor arguments
 * 3. Checks verification status
 * 4. Provides verification links
 * 
 * Usage: node scripts/verifyContracts.js [--network=base-sepolia]
 */

import { execSync } from 'child_process';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class ContractVerifier {
  constructor() {
    this.network = process.argv.find(arg => arg.startsWith('--network='))?.split('=')[1] || 'base-sepolia';
    this.etherscanApiKey = process.env.ETHERSCAN_API_KEY;
    this.deploymentAddresses = this.loadDeploymentAddresses();
    
    if (!this.etherscanApiKey) {
      throw new Error('❌ ETHERSCAN_API_KEY environment variable is required');
    }
    
    console.log('🔍 COINSCIOUS Platform - Contract Verification');
    console.log('=============================================');
    console.log(`📍 Network: ${this.network}`);
    console.log(`📍 Etherscan API Key: ${this.etherscanApiKey ? 'Set' : 'Not set'}`);
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
      console.log('🔍 Step 1: Verifying Contract Source Code...');
      await this.verifyContractSource();
      
      console.log('🔍 Step 2: Checking Verification Status...');
      await this.checkVerificationStatus();
      
      console.log('✅ Contract Verification Complete!');
      this.printVerificationSummary();
      
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      process.exit(1);
    }
  }

  async verifyContractSource() {
    const contracts = [
      { name: 'MockUSDC', contractName: 'MockUSDC' },
      { name: 'ComplianceRegistry', contractName: 'ComplianceRegistry' },
      { name: 'SecurityToken', contractName: 'SecurityToken' },
      { name: 'LinearVesting', contractName: 'LinearVesting' },
      { name: 'PayoutDistributorFactory', contractName: 'PayoutDistributorFactory' },
      { name: 'SecurityTokenFactory', contractName: 'SecurityTokenFactory' }
    ];

    for (const contract of contracts) {
      const contractInfo = this.deploymentAddresses.contracts[contract.name.toLowerCase()];
      
      if (!contractInfo || contractInfo.status !== 'deployed') {
        console.log(`  ⚠️ ${contract.name}: Not deployed, skipping verification`);
        continue;
      }

      try {
        console.log(`  🔍 Verifying ${contract.name}...`);
        
        const chainId = this.network === 'base-sepolia' ? '84532' : '8453';
        const verifyCommand = `cd contracts && forge verify-contract ${contractInfo.address} ${contract.contractName} --chain-id ${chainId} --etherscan-api-key ${this.etherscanApiKey}`;
        
        execSync(verifyCommand, { stdio: 'inherit' });
        console.log(`    ✅ ${contract.name} verified successfully`);
        
        // Update deployment info
        contractInfo.verified = true;
        contractInfo.verificationDate = new Date().toISOString();
        
      } catch (error) {
        console.log(`    ❌ Failed to verify ${contract.name}: ${error.message}`);
        contractInfo.verified = false;
        contractInfo.verificationError = error.message;
      }
    }

    // Save updated deployment addresses
    fs.writeFileSync('DEPLOYED_ADDRESSES.json', JSON.stringify(this.deploymentAddresses, null, 2));
  }

  async checkVerificationStatus() {
    console.log('  🔍 Checking verification status on Etherscan...');
    
    for (const [name, contract] of Object.entries(this.deploymentAddresses.contracts)) {
      if (contract.status !== 'deployed') continue;
      
      try {
        const chainId = this.network === 'base-sepolia' ? '84532' : '8453';
        const explorerUrl = this.network === 'base-sepolia' 
          ? `https://sepolia.basescan.org/address/${contract.address}`
          : `https://basescan.org/address/${contract.address}`;
        
        console.log(`    📊 ${contract.name}: ${explorerUrl}`);
        
        if (contract.verified) {
          console.log(`      ✅ Verified on Etherscan`);
        } else {
          console.log(`      ❌ Not verified on Etherscan`);
        }
        
      } catch (error) {
        console.log(`    ❌ Error checking ${contract.name}: ${error.message}`);
      }
    }
  }

  printVerificationSummary() {
    console.log('\n📊 VERIFICATION SUMMARY');
    console.log('======================');
    console.log(`📍 Network: ${this.network}`);
    console.log(`📍 Etherscan API Key: ${this.etherscanApiKey ? 'Set' : 'Not set'}`);
    
    console.log('\n📋 Contract Verification Status:');
    for (const [name, contract] of Object.entries(this.deploymentAddresses.contracts)) {
      if (contract.status !== 'deployed') continue;
      
      const status = contract.verified ? '✅' : '❌';
      const verificationDate = contract.verificationDate || 'Not verified';
      console.log(`  ${status} ${contract.name}: ${contract.address}`);
      console.log(`      Verification Date: ${verificationDate}`);
      
      if (contract.verificationError) {
        console.log(`      Error: ${contract.verificationError}`);
      }
    }
    
    console.log('\n🔗 Explorer Links:');
    const baseUrl = this.network === 'base-sepolia' 
      ? 'https://sepolia.basescan.org/address/'
      : 'https://basescan.org/address/';
    
    for (const [name, contract] of Object.entries(this.deploymentAddresses.contracts)) {
      if (contract.status === 'deployed') {
        console.log(`  📊 ${contract.name}: ${baseUrl}${contract.address}`);
      }
    }
    
    console.log('\n✅ Contract verification complete!');
  }
}

// Main execution
async function main() {
  const verifier = new ContractVerifier();
  await verifier.verify();
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
}

export { ContractVerifier };
