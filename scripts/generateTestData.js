#!/usr/bin/env node

/**
 * COINSCIOUS Platform - Test Data Generator
 * 
 * This script generates realistic test data for pilot validation:
 * 1. Test investor profiles
 * 2. Test transactions
 * 3. Test compliance scenarios
 * 4. Test vesting schedules
 * 5. Test payout scenarios
 * 
 * Usage: node scripts/generateTestData.js [--count=100] [--output=test-data.json]
 */

import fs from 'fs';
import { ethers } from 'ethers';

class TestDataGenerator {
  constructor() {
    this.count = parseInt(process.argv.find(arg => arg.startsWith('--count='))?.split('=')[1] || '100');
    this.outputFile = process.argv.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'test-data.json';
    
    this.jurisdictions = ['US', 'EU', 'UK', 'CA', 'AU', 'SG', 'JP'];
    this.investorTypes = ['Individual', 'Institution', 'Fund', 'Family Office'];
    this.accreditationStatuses = [true, false];
    this.reasonCodes = [
      'KYC_COMPLETE',
      'ACCREDITED_INVESTOR',
      'INSTITUTIONAL_INVESTOR',
      'QUALIFIED_PURCHASER',
      'RESTRICTED_INVESTOR',
      'NON_ACCREDITED',
      'PENDING_VERIFICATION',
      'REJECTED'
    ];
    
    console.log('📊 COINSCIOUS Platform - Test Data Generator');
    console.log('==========================================');
    console.log(`📍 Count: ${this.count}`);
    console.log(`📍 Output: ${this.outputFile}`);
    console.log('');
  }

  generate() {
    console.log('🔧 Generating test data...');
    
    const testData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        count: this.count,
        version: '1.0.0',
        description: 'COINSCIOUS Platform Test Data for Pilot Validation'
      },
      investors: this.generateInvestors(),
      transactions: this.generateTransactions(),
      complianceActions: this.generateComplianceActions(),
      vestingSchedules: this.generateVestingSchedules(),
      payouts: this.generatePayouts(),
      testScenarios: this.generateTestScenarios()
    };
    
    console.log(`✅ Generated ${this.count} test records`);
    console.log(`  📊 Investors: ${testData.investors.length}`);
    console.log(`  📊 Transactions: ${testData.transactions.length}`);
    console.log(`  📊 Compliance Actions: ${testData.complianceActions.length}`);
    console.log(`  📊 Vesting Schedules: ${testData.vestingSchedules.length}`);
    console.log(`  📊 Payouts: ${testData.payouts.length}`);
    console.log(`  📊 Test Scenarios: ${testData.testScenarios.length}`);
    
    // Save to file
    fs.writeFileSync(this.outputFile, JSON.stringify(testData, null, 2));
    console.log(`\n💾 Test data saved to: ${this.outputFile}`);
    
    return testData;
  }

  generateInvestors() {
    const investors = [];
    
    for (let i = 0; i < this.count; i++) {
      const investor = {
        id: `INV-${String(i + 1).padStart(4, '0')}`,
        address: ethers.Wallet.createRandom().address,
        name: this.generateRandomName(),
        email: this.generateRandomEmail(),
        phone: this.generateRandomPhone(),
        jurisdiction: this.getRandomItem(this.jurisdictions),
        investorType: this.getRandomItem(this.investorTypes),
        accreditationStatus: this.getRandomItem(this.accreditationStatuses),
        kycStatus: this.getRandomItem(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED']),
        riskProfile: this.getRandomItem(['LOW', 'MEDIUM', 'HIGH']),
        investmentLimit: this.generateRandomAmount(1000, 1000000),
        createdAt: this.generateRandomDate(new Date('2023-01-01'), new Date()),
        lastActivity: this.generateRandomDate(new Date('2023-06-01'), new Date()),
        status: this.getRandomItem(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING']),
        documents: this.generateDocuments(),
        complianceNotes: this.generateComplianceNotes()
      };
      
      investors.push(investor);
    }
    
    return investors;
  }

  generateTransactions() {
    const transactions = [];
    const transactionTypes = ['TRANSFER', 'MINT', 'BURN', 'FREEZE', 'UNFREEZE'];
    
    for (let i = 0; i < this.count * 2; i++) {
      const transaction = {
        id: `TXN-${String(i + 1).padStart(6, '0')}`,
        hash: ethers.keccak256(ethers.toUtf8Bytes(`transaction-${i}-${Date.now()}`)),
        type: this.getRandomItem(transactionTypes),
        from: ethers.Wallet.createRandom().address,
        to: ethers.Wallet.createRandom().address,
        amount: this.generateRandomAmount(100, 100000),
        token: 'COIN',
        status: this.getRandomItem(['PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED']),
        blockNumber: this.generateRandomNumber(1000000, 2000000),
        timestamp: this.generateRandomDate(new Date('2023-01-01'), new Date()),
        gasUsed: this.generateRandomNumber(21000, 200000),
        gasPrice: this.generateRandomAmount(20, 100),
        complianceCheck: this.getRandomItem([true, false]),
        reasonCode: this.getRandomItem(this.reasonCodes),
        operator: ethers.Wallet.createRandom().address,
        notes: this.generateTransactionNotes()
      };
      
      transactions.push(transaction);
    }
    
    return transactions;
  }

  generateComplianceActions() {
    const actions = [];
    const actionTypes = ['FREEZE', 'UNFREEZE', 'BLOCK', 'UNBLOCK', 'KYC_UPDATE', 'ACCREDITATION_UPDATE'];
    
    for (let i = 0; i < this.count / 2; i++) {
      const action = {
        id: `COMP-${String(i + 1).padStart(4, '0')}`,
        actionType: this.getRandomItem(actionTypes),
        walletAddress: ethers.Wallet.createRandom().address,
        operatorAddress: ethers.Wallet.createRandom().address,
        reasonCode: this.getRandomItem(this.reasonCodes),
        details: {
          description: this.generateActionDescription(),
          evidence: this.generateEvidence(),
          riskLevel: this.getRandomItem(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
          jurisdiction: this.getRandomItem(this.jurisdictions)
        },
        timestamp: this.generateRandomDate(new Date('2023-01-01'), new Date()),
        status: this.getRandomItem(['PENDING', 'APPROVED', 'REJECTED', 'ESCALATED']),
        approvalRequired: this.getRandomItem([true, false]),
        approvedBy: this.getRandomItem([null, ethers.Wallet.createRandom().address]),
        notes: this.generateComplianceNotes()
      };
      
      actions.push(action);
    }
    
    return actions;
  }

  generateVestingSchedules() {
    const schedules = [];
    
    for (let i = 0; i < this.count / 3; i++) {
      const startDate = this.generateRandomDate(new Date('2023-01-01'), new Date('2024-01-01'));
      const cliffPeriod = this.generateRandomNumber(30, 365); // days
      const vestingPeriod = this.generateRandomNumber(365, 1825); // days
      
      const schedule = {
        id: `VEST-${String(i + 1).padStart(4, '0')}`,
        beneficiary: ethers.Wallet.createRandom().address,
        totalAmount: this.generateRandomAmount(10000, 1000000),
        startDate: startDate.toISOString(),
        cliffPeriod: cliffPeriod,
        vestingPeriod: vestingPeriod,
        releasedAmount: this.generateRandomAmount(0, 500000),
        status: this.getRandomItem(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']),
        createdAt: this.generateRandomDate(new Date('2023-01-01'), new Date()),
        lastRelease: this.generateRandomDate(startDate, new Date()),
        releaseHistory: this.generateReleaseHistory(),
        notes: this.generateVestingNotes()
      };
      
      schedules.push(schedule);
    }
    
    return schedules;
  }

  generatePayouts() {
    const payouts = [];
    
    for (let i = 0; i < this.count / 5; i++) {
      const payout = {
        id: `PAY-${String(i + 1).padStart(4, '0')}`,
        snapshotId: this.generateRandomNumber(1, 100),
        totalAmount: this.generateRandomAmount(100000, 10000000),
        holderCount: this.generateRandomNumber(10, 1000),
        averagePayout: this.generateRandomAmount(100, 10000),
        currency: 'USDC',
        status: this.getRandomItem(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
        createdAt: this.generateRandomDate(new Date('2023-01-01'), new Date()),
        processedAt: this.generateRandomDate(new Date('2023-01-01'), new Date()),
        distributionMethod: this.getRandomItem(['AUTOMATIC', 'MANUAL', 'BATCH']),
        complianceCheck: this.getRandomItem([true, false]),
        operator: ethers.Wallet.createRandom().address,
        recipients: this.generatePayoutRecipients(),
        notes: this.generatePayoutNotes()
      };
      
      payouts.push(payout);
    }
    
    return payouts;
  }

  generateTestScenarios() {
    return [
      {
        name: 'Normal Investor Onboarding',
        description: 'Complete investor onboarding with KYC and accreditation',
        steps: [
          'Create investor profile',
          'Submit KYC documents',
          'Verify accreditation status',
          'Approve investor',
          'Create compliance record'
        ],
        expectedOutcome: 'Investor successfully onboarded and approved'
      },
      {
        name: 'Compliance Violation Detection',
        description: 'Detect and handle compliance violations',
        steps: [
          'Monitor transaction patterns',
          'Detect suspicious activity',
          'Freeze wallet',
          'Investigate violation',
          'Resolve or escalate'
        ],
        expectedOutcome: 'Violation detected and handled appropriately'
      },
      {
        name: '12(g) Threshold Warning',
        description: 'Monitor and alert on 12(g) threshold approach',
        steps: [
          'Track holder count',
          'Calculate threshold percentage',
          'Send warning alerts',
          'Implement restrictions',
          'Prepare for 12(g) filing'
        ],
        expectedOutcome: 'Threshold monitoring working correctly'
      },
      {
        name: 'Emergency System Pause',
        description: 'Test emergency pause and recovery procedures',
        steps: [
          'Initiate system pause',
          'Verify all operations stopped',
          'Test emergency procedures',
          'Resume operations',
          'Verify system recovery'
        ],
        expectedOutcome: 'System pause and recovery working correctly'
      },
      {
        name: 'Multisig Confirmation',
        description: 'Test two-operator confirmation for critical actions',
        steps: [
          'Initiate critical action',
          'Require first operator approval',
          'Require second operator approval',
          'Execute action',
          'Log confirmation'
        ],
        expectedOutcome: 'Multisig confirmation working correctly'
      }
    ];
  }

  // Helper methods
  generateRandomName() {
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily', 'James', 'Jessica'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    
    return `${this.getRandomItem(firstNames)} ${this.getRandomItem(lastNames)}`;
  }

  generateRandomEmail() {
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.com', 'investor.com'];
    const username = Math.random().toString(36).substring(2, 8);
    return `${username}@${this.getRandomItem(domains)}`;
  }

  generateRandomPhone() {
    return `+1-${this.generateRandomNumber(200, 999)}-${this.generateRandomNumber(200, 999)}-${this.generateRandomNumber(1000, 9999)}`;
  }

  generateRandomAmount(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  generateRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  generateRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  generateDocuments() {
    const documentTypes = ['PASSPORT', 'DRIVERS_LICENSE', 'BANK_STATEMENT', 'TAX_RETURN', 'ACCREDITATION_LETTER'];
    return documentTypes.map(type => ({
      type,
      status: this.getRandomItem(['PENDING', 'APPROVED', 'REJECTED']),
      uploadedAt: this.generateRandomDate(new Date('2023-01-01'), new Date())
    }));
  }

  generateComplianceNotes() {
    const notes = [
      'Investor verified through third-party KYC provider',
      'Accreditation status confirmed via SEC database',
      'Additional documentation required',
      'Risk assessment completed',
      'Compliance review pending'
    ];
    return this.getRandomItem(notes);
  }

  generateActionDescription() {
    const descriptions = [
      'Suspicious transaction pattern detected',
      'KYC documentation expired',
      'Accreditation status changed',
      'Regulatory requirement update',
      'Risk assessment triggered action'
    ];
    return this.getRandomItem(descriptions);
  }

  generateEvidence() {
    return {
      transactionHashes: [ethers.keccak256(ethers.toUtf8Bytes(`evidence-${Date.now()}`))],
      documents: ['evidence-doc-1.pdf', 'evidence-doc-2.pdf'],
      screenshots: ['screenshot-1.png'],
      notes: 'Evidence collected during investigation'
    };
  }

  generateReleaseHistory() {
    const releases = [];
    const releaseCount = this.generateRandomNumber(0, 5);
    
    for (let i = 0; i < releaseCount; i++) {
      releases.push({
        amount: this.generateRandomAmount(1000, 50000),
        timestamp: this.generateRandomDate(new Date('2023-01-01'), new Date()),
        transactionHash: ethers.keccak256(ethers.toUtf8Bytes(`release-${i}-${Date.now()}`))
      });
    }
    
    return releases;
  }

  generateVestingNotes() {
    const notes = [
      'Vesting schedule created for employee compensation',
      'Cliff period completed, vesting in progress',
      'Vesting paused due to compliance review',
      'Vesting completed successfully',
      'Vesting cancelled due to termination'
    ];
    return this.getRandomItem(notes);
  }

  generatePayoutRecipients() {
    const recipients = [];
    const recipientCount = this.generateRandomNumber(5, 50);
    
    for (let i = 0; i < recipientCount; i++) {
      recipients.push({
        address: ethers.Wallet.createRandom().address,
        amount: this.generateRandomAmount(100, 10000),
        status: this.getRandomItem(['PENDING', 'SENT', 'FAILED'])
      });
    }
    
    return recipients;
  }

  generatePayoutNotes() {
    const notes = [
      'Quarterly dividend distribution',
      'Special dividend payment',
      'Interest payment distribution',
      'Capital gains distribution',
      'Return of capital distribution'
    ];
    return this.getRandomItem(notes);
  }

  generateTransactionNotes() {
    const notes = [
      'Regular transfer between accounts',
      'Token minting for new investor',
      'Token burning for compliance',
      'Emergency transfer',
      'Automated system transfer'
    ];
    return this.getRandomItem(notes);
  }
}

// Main execution
async function main() {
  const generator = new TestDataGenerator();
  generator.generate();
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Test data generation failed:', error);
    process.exit(1);
  });
}

export { TestDataGenerator };
