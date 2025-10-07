#!/usr/bin/env node

/**
 * COINSCIOUS Platform - Pilot Test Runner
 * 
 * This script runs the complete pilot validation suite:
 * 1. Generates test data
 * 2. Runs integration tests
 * 3. Runs end-to-end validation
 * 4. Generates comprehensive report
 * 
 * Usage: node scripts/runPilotTests.js [--network=base-sepolia] [--verbose] [--generate-data]
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class PilotTestRunner {
  constructor() {
    this.network = process.argv.find(arg => arg.startsWith('--network='))?.split('=')[1] || 'base-sepolia';
    this.verbose = process.argv.includes('--verbose');
    this.generateData = process.argv.includes('--generate-data');
    
    this.testResults = {
      startTime: new Date().toISOString(),
      network: this.network,
      phases: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      },
      endTime: null,
      duration: 0
    };
    
    console.log('🧪 COINSCIOUS Platform - Pilot Test Runner');
    console.log('==========================================');
    console.log(`📍 Network: ${this.network}`);
    console.log(`📍 Verbose: ${this.verbose ? 'Yes' : 'No'}`);
    console.log(`📍 Generate Data: ${this.generateData ? 'Yes' : 'No'}`);
    console.log('');
  }

  async run() {
    try {
      console.log('🚀 Starting Pilot Test Suite...\n');
      
      // Phase 1: Generate Test Data
      if (this.generateData) {
        await this.runPhase('Generate Test Data', () => this.generateTestData());
      } else {
        console.log('⏭️ Skipping test data generation (use --generate-data to enable)');
      }
      
      // Phase 2: Run Integration Tests
      await this.runPhase('Integration Tests', () => this.runIntegrationTests());
      
      // Phase 3: Run End-to-End Validation
      await this.runPhase('End-to-End Validation', () => this.runEndToEndValidation());
      
      // Phase 4: Generate Report
      await this.runPhase('Generate Report', () => this.generateTestReport());
      
      console.log('✅ Pilot Test Suite Completed!');
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Pilot test suite failed:', error.message);
      this.testResults.summary.failed++;
      this.generateTestReport();
      process.exit(1);
    }
  }

  async runPhase(phaseName, phaseFunction) {
    const startTime = Date.now();
    console.log(`🔍 Phase: ${phaseName}`);
    
    try {
      await phaseFunction();
      const duration = Date.now() - startTime;
      this.recordPhaseResult(phaseName, 'PASSED', duration, null);
      console.log(`  ✅ ${phaseName} completed (${duration}ms)\n`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordPhaseResult(phaseName, 'FAILED', duration, error.message);
      console.log(`  ❌ ${phaseName} failed: ${error.message} (${duration}ms)\n`);
      throw error;
    }
  }

  recordPhaseResult(phaseName, status, duration, error) {
    this.testResults.phases.push({
      name: phaseName,
      status,
      duration,
      error,
      timestamp: new Date().toISOString()
    });
    
    this.testResults.summary.total++;
    this.testResults.summary[status.toLowerCase()]++;
  }

  async generateTestData() {
    console.log('  📊 Generating test data...');
    
    try {
      execSync('node scripts/generateTestData.js --count=100 --output=test-data.json', { 
        stdio: this.verbose ? 'inherit' : 'pipe' 
      });
      
      // Verify test data was generated
      if (!fs.existsSync('test-data.json')) {
        throw new Error('Test data file not generated');
      }
      
      const testData = JSON.parse(fs.readFileSync('test-data.json', 'utf8'));
      console.log(`    ✅ Generated ${testData.investors.length} investors`);
      console.log(`    ✅ Generated ${testData.transactions.length} transactions`);
      console.log(`    ✅ Generated ${testData.complianceActions.length} compliance actions`);
      console.log(`    ✅ Generated ${testData.vestingSchedules.length} vesting schedules`);
      console.log(`    ✅ Generated ${testData.payouts.length} payouts`);
      
    } catch (error) {
      throw new Error(`Test data generation failed: ${error.message}`);
    }
  }

  async runIntegrationTests() {
    console.log('  🧪 Running integration tests...');
    
    try {
      // Run Jest integration tests
      const jestCommand = 'npx jest test/integration/pilotValidation.test.js --verbose --detectOpenHandles';
      execSync(jestCommand, { 
        stdio: this.verbose ? 'inherit' : 'pipe',
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      console.log('    ✅ Integration tests passed');
      
    } catch (error) {
      throw new Error(`Integration tests failed: ${error.message}`);
    }
  }

  async runEndToEndValidation() {
    console.log('  🔍 Running end-to-end validation...');
    
    try {
      // Run pilot validation script
      const validationCommand = `node scripts/pilotValidation.js --network=${this.network} ${this.verbose ? '--verbose' : ''}`;
      execSync(validationCommand, { 
        stdio: this.verbose ? 'inherit' : 'pipe' 
      });
      
      console.log('    ✅ End-to-end validation passed');
      
    } catch (error) {
      throw new Error(`End-to-end validation failed: ${error.message}`);
    }
  }

  async generateTestReport() {
    console.log('  📊 Generating test report...');
    
    this.testResults.endTime = new Date().toISOString();
    this.testResults.duration = new Date(this.testResults.endTime) - new Date(this.testResults.startTime);
    
    // Generate comprehensive report
    const report = {
      ...this.testResults,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        network: this.network,
        timestamp: new Date().toISOString()
      },
      recommendations: this.generateRecommendations()
    };
    
    // Save detailed report
    const reportPath = `pilot-test-report-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate markdown report
    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = `pilot-test-report-${new Date().toISOString().split('T')[0]}.md`;
    fs.writeFileSync(markdownPath, markdownReport);
    
    console.log(`    ✅ Test report saved to: ${reportPath}`);
    console.log(`    ✅ Markdown report saved to: ${markdownPath}`);
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.testResults.summary.failed > 0) {
      recommendations.push('Fix failed tests before production deployment');
    }
    
    if (this.testResults.summary.passed / this.testResults.summary.total < 0.95) {
      recommendations.push('Improve test coverage to achieve 95% pass rate');
    }
    
    recommendations.push('Run security audit before mainnet deployment');
    recommendations.push('Perform load testing with realistic data volumes');
    recommendations.push('Test disaster recovery procedures');
    recommendations.push('Validate compliance with regulatory requirements');
    
    return recommendations;
  }

  generateMarkdownReport(report) {
    return `# COINSCIOUS Platform - Pilot Test Report

## 📊 Executive Summary

- **Test Date**: ${report.startTime}
- **Network**: ${report.network}
- **Duration**: ${report.duration}ms
- **Total Tests**: ${report.summary.total}
- **Passed**: ${report.summary.passed}
- **Failed**: ${report.summary.failed}
- **Skipped**: ${report.summary.skipped}
- **Success Rate**: ${((report.summary.passed / report.summary.total) * 100).toFixed(2)}%

## 🔍 Test Phases

${report.phases.map(phase => `
### ${phase.name}
- **Status**: ${phase.status === 'PASSED' ? '✅ PASSED' : '❌ FAILED'}
- **Duration**: ${phase.duration}ms
- **Timestamp**: ${phase.timestamp}
${phase.error ? `- **Error**: ${phase.error}` : ''}
`).join('')}

## 🎯 Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## 📈 Environment Details

- **Node Version**: ${report.environment.nodeVersion}
- **Platform**: ${report.environment.platform}
- **Network**: ${report.environment.network}

## 📄 Detailed Results

For detailed test results, see the JSON report file.

---
*Report generated by COINSCIOUS Platform Pilot Test Runner*
`;
  }

  printSummary() {
    console.log('\n📊 PILOT TEST SUMMARY');
    console.log('====================');
    console.log(`📍 Network: ${this.testResults.network}`);
    console.log(`📍 Start Time: ${this.testResults.startTime}`);
    console.log(`📍 End Time: ${this.testResults.endTime}`);
    console.log(`📍 Duration: ${this.testResults.duration}ms`);
    
    console.log('\n📋 Test Results:');
    console.log(`  Total Tests: ${this.testResults.summary.total}`);
    console.log(`  ✅ Passed: ${this.testResults.summary.passed}`);
    console.log(`  ❌ Failed: ${this.testResults.summary.failed}`);
    console.log(`  ⏭️ Skipped: ${this.testResults.summary.skipped}`);
    
    const successRate = (this.testResults.summary.passed / this.testResults.summary.total * 100).toFixed(2);
    console.log(`  📊 Success Rate: ${successRate}%`);
    
    if (this.testResults.summary.failed > 0) {
      console.log('\n❌ Failed Phases:');
      this.testResults.phases
        .filter(phase => phase.status === 'FAILED')
        .forEach(phase => {
          console.log(`  • ${phase.name}: ${phase.error}`);
        });
    }
    
    // Overall result
    if (this.testResults.summary.failed === 0) {
      console.log('\n🎉 PILOT TEST SUITE SUCCESSFUL!');
      console.log('✅ All tests passed. Platform is ready for production.');
    } else {
      console.log('\n⚠️ PILOT TEST SUITE FAILED!');
      console.log('❌ Some tests failed. Please review and fix issues before production.');
    }
  }
}

// Main execution
async function main() {
  const runner = new PilotTestRunner();
  await runner.run();
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Pilot test runner failed:', error);
    process.exit(1);
  });
}

export { PilotTestRunner };
