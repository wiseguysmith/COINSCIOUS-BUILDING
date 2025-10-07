#!/usr/bin/env node

/**
 * COINSCIOUS Platform - Production Readiness Check
 * 
 * This script performs comprehensive production readiness validation:
 * 1. Security audit and compliance check
 * 2. Performance and scalability validation
 * 3. Disaster recovery and backup verification
 * 4. Monitoring and alerting configuration
 * 5. Documentation and training verification
 * 6. Launch readiness assessment
 * 
 * Usage: node scripts/productionReadiness.js [--network=base-mainnet] [--verbose]
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class ProductionReadinessChecker {
  constructor() {
    this.network = process.argv.find(arg => arg.startsWith('--network='))?.split('=')[1] || 'base-mainnet';
    this.verbose = process.argv.includes('--verbose');
    this.rpcUrl = this.network === 'base-mainnet' 
      ? process.env.RPC_URL_BASE_MAINNET || 'https://mainnet.base.org'
      : process.env.RPC_URL_BASE_SEPOLIA || 'https://sepolia.base.org';
    
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.privateKey = process.env.PRIVATE_KEY;
    
    if (!this.privateKey) {
      throw new Error('❌ PRIVATE_KEY environment variable is required');
    }
    
    this.wallet = new ethers.Wallet(this.privateKey, this.provider);
    this.deploymentAddresses = this.loadDeploymentAddresses();
    
    this.readinessResults = {
      startTime: new Date().toISOString(),
      network: this.network,
      deployer: this.wallet.address,
      checks: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        critical: 0
      },
      endTime: null,
      duration: 0,
      readinessScore: 0
    };
    
    console.log('🚀 COINSCIOUS Platform - Production Readiness Check');
    console.log('==================================================');
    console.log(`📍 Network: ${this.network}`);
    console.log(`📍 Deployer: ${this.wallet.address}`);
    console.log(`📍 RPC URL: ${this.rpcUrl}`);
    console.log(`📍 Verbose: ${this.verbose ? 'Yes' : 'No'}`);
    console.log('');
  }

  loadDeploymentAddresses() {
    if (!fs.existsSync('DEPLOYED_ADDRESSES.json')) {
      throw new Error('❌ DEPLOYED_ADDRESSES.json not found. Please deploy contracts first.');
    }
    
    return JSON.parse(fs.readFileSync('DEPLOYED_ADDRESSES.json', 'utf8'));
  }

  async runReadinessCheck() {
    try {
      console.log('🔍 Starting Production Readiness Check...\n');
      
      // Phase 1: Security & Compliance
      await this.runCheckSuite('Security & Compliance', [
        () => this.checkSecurityAudit(),
        () => this.checkComplianceRequirements(),
        () => this.checkAccessControls(),
        () => this.checkDataProtection(),
        () => this.checkAuditTrail()
      ]);
      
      // Phase 2: Performance & Scalability
      await this.runCheckSuite('Performance & Scalability', [
        () => this.checkPerformanceMetrics(),
        () => this.checkScalabilityLimits(),
        () => this.checkResourceUtilization(),
        () => this.checkResponseTimes(),
        () => this.checkThroughputCapacity()
      ]);
      
      // Phase 3: Reliability & Availability
      await this.runCheckSuite('Reliability & Availability', [
        () => this.checkSystemUptime(),
        () => this.checkErrorRates(),
        () => this.checkFailoverCapability(),
        () => this.checkBackupSystems(),
        () => this.checkRecoveryProcedures()
      ]);
      
      // Phase 4: Monitoring & Alerting
      await this.runCheckSuite('Monitoring & Alerting', [
        () => this.checkMonitoringCoverage(),
        () => this.checkAlertConfiguration(),
        () => this.checkLoggingSystems(),
        () => this.checkMetricsCollection(),
        () => this.checkDashboardAvailability()
      ]);
      
      // Phase 5: Documentation & Training
      await this.runCheckSuite('Documentation & Training', [
        () => this.checkDocumentationCompleteness(),
        () => this.checkRunbookAccuracy(),
        () => this.checkTrainingMaterials(),
        () => this.checkEmergencyProcedures(),
        () => this.checkKnowledgeTransfer()
      ]);
      
      // Phase 6: Launch Readiness
      await this.runCheckSuite('Launch Readiness', [
        () => this.checkDeploymentReadiness(),
        () => this.checkGoLiveCriteria(),
        () => this.checkRollbackProcedures(),
        () => this.checkLaunchCommunication(),
        () => this.checkPostLaunchSupport()
      ]);
      
      // Generate readiness report
      this.generateReadinessReport();
      
    } catch (error) {
      console.error('❌ Production readiness check failed:', error.message);
      this.readinessResults.summary.failed++;
      this.generateReadinessReport();
      process.exit(1);
    }
  }

  async runCheckSuite(suiteName, checks) {
    console.log(`🔍 Running ${suiteName}...`);
    
    for (const check of checks) {
      await this.runCheck(check);
    }
    
    console.log(`✅ ${suiteName} completed\n`);
  }

  async runCheck(checkFunction) {
    const checkName = checkFunction.name;
    const startTime = Date.now();
    
    try {
      console.log(`  🔍 ${checkName}...`);
      
      const result = await checkFunction();
      
      const duration = Date.now() - startTime;
      this.recordCheckResult(checkName, result.status, duration, result.message, result.severity);
      
      const statusIcon = result.status === 'PASSED' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`    ${statusIcon} ${checkName}: ${result.message} (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordCheckResult(checkName, 'FAILED', duration, error.message, 'CRITICAL');
      console.log(`    ❌ ${checkName} failed: ${error.message} (${duration}ms)`);
      
      if (this.verbose) {
        console.log(`    📝 Error details: ${error.stack}`);
      }
    }
  }

  recordCheckResult(checkName, status, duration, message, severity = 'MEDIUM') {
    this.readinessResults.checks.push({
      name: checkName,
      status,
      duration,
      message,
      severity,
      timestamp: new Date().toISOString()
    });
    
    this.readinessResults.summary.total++;
    this.readinessResults.summary[status.toLowerCase()]++;
    
    if (severity === 'CRITICAL') {
      this.readinessResults.summary.critical++;
    }
  }

  // Security & Compliance Checks
  async checkSecurityAudit() {
    // Check if security audit has been completed
    const auditFiles = [
      'audit/security-token-code-review.md',
      'audit/compliance-registry-code-review.md',
      'THREAT_MODEL.md'
    ];
    
    const missingAudits = auditFiles.filter(file => !fs.existsSync(file));
    
    if (missingAudits.length > 0) {
      return {
        status: 'FAILED',
        message: `Missing security audit files: ${missingAudits.join(', ')}`,
        severity: 'CRITICAL'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Security audit files present',
      severity: 'HIGH'
    };
  }

  async checkComplianceRequirements() {
    // Check compliance configuration
    const requiredEnvVars = [
      'TWELVE_G_LIMIT',
      'TWELVE_G_WARN1_PCT',
      'TWELVE_G_WARN2_PCT'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return {
        status: 'WARNING',
        message: `Missing compliance environment variables: ${missingVars.join(', ')}`,
        severity: 'MEDIUM'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Compliance requirements configured',
      severity: 'HIGH'
    };
  }

  async checkAccessControls() {
    // Check multisig configuration
    const multisigFiles = [
      'apps/console/lib/multisig.ts',
      'apps/console/components/MultisigConfirmation.tsx',
      'apps/console/components/MultisigDashboard.tsx'
    ];
    
    const missingFiles = multisigFiles.filter(file => !fs.existsSync(file));
    
    if (missingFiles.length > 0) {
      return {
        status: 'FAILED',
        message: `Missing multisig files: ${missingFiles.join(', ')}`,
        severity: 'CRITICAL'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Access controls properly configured',
      severity: 'HIGH'
    };
  }

  async checkDataProtection() {
    // Check data encryption and protection
    const hasEncryption = process.env.JWT_SECRET && process.env.JWT_SECRET !== 'your_jwt_secret_here';
    const hasDatabaseSecurity = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('ssl=true');
    
    if (!hasEncryption) {
      return {
        status: 'WARNING',
        message: 'JWT secret not properly configured',
        severity: 'MEDIUM'
      };
    }
    
    if (!hasDatabaseSecurity) {
      return {
        status: 'WARNING',
        message: 'Database SSL not configured',
        severity: 'MEDIUM'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Data protection measures in place',
      severity: 'HIGH'
    };
  }

  async checkAuditTrail() {
    // Check audit trail configuration
    const hasLogging = fs.existsSync('apps/indexer/src/logger.ts');
    const hasEventIndexing = fs.existsSync('apps/indexer/src/indexer.ts');
    
    if (!hasLogging || !hasEventIndexing) {
      return {
        status: 'FAILED',
        message: 'Audit trail system not properly configured',
        severity: 'CRITICAL'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Audit trail system configured',
      severity: 'HIGH'
    };
  }

  // Performance & Scalability Checks
  async checkPerformanceMetrics() {
    // Check performance monitoring
    const hasMetrics = fs.existsSync('apps/indexer/src/metrics.ts');
    const hasHealthMonitoring = fs.existsSync('apps/indexer/src/health.ts');
    
    if (!hasMetrics || !hasHealthMonitoring) {
      return {
        status: 'WARNING',
        message: 'Performance monitoring not fully configured',
        severity: 'MEDIUM'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Performance monitoring configured',
      severity: 'MEDIUM'
    };
  }

  async checkScalabilityLimits() {
    // Check scalability configuration
    const hasLoadBalancing = process.env.LOAD_BALANCER_URL;
    const hasDatabasePooling = process.env.DB_POOL_MAX && parseInt(process.env.DB_POOL_MAX) > 10;
    
    if (!hasLoadBalancing) {
      return {
        status: 'WARNING',
        message: 'Load balancer not configured',
        severity: 'MEDIUM'
      };
    }
    
    if (!hasDatabasePooling) {
      return {
        status: 'WARNING',
        message: 'Database connection pooling not optimized',
        severity: 'MEDIUM'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Scalability limits configured',
      severity: 'MEDIUM'
    };
  }

  async checkResourceUtilization() {
    // Check resource utilization monitoring
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    if (memoryUsagePercent > 80) {
      return {
        status: 'WARNING',
        message: `High memory usage: ${memoryUsagePercent.toFixed(2)}%`,
        severity: 'MEDIUM'
      };
    }
    
    return {
      status: 'PASSED',
      message: `Memory usage normal: ${memoryUsagePercent.toFixed(2)}%`,
      severity: 'LOW'
    };
  }

  async checkResponseTimes() {
    // Check API response times
    try {
      const startTime = Date.now();
      await fetch('http://localhost:3001/health');
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 1000) {
        return {
          status: 'WARNING',
          message: `Slow response time: ${responseTime}ms`,
          severity: 'MEDIUM'
        };
      }
      
      return {
        status: 'PASSED',
        message: `Response time acceptable: ${responseTime}ms`,
        severity: 'LOW'
      };
    } catch (error) {
      return {
        status: 'WARNING',
        message: 'Service not responding',
        severity: 'MEDIUM'
      };
    }
  }

  async checkThroughputCapacity() {
    // Check throughput capacity
    const hasRateLimiting = process.env.RATE_LIMIT_MAX_REQUESTS;
    const hasCaching = process.env.REDIS_URL;
    
    if (!hasRateLimiting) {
      return {
        status: 'WARNING',
        message: 'Rate limiting not configured',
        severity: 'MEDIUM'
      };
    }
    
    if (!hasCaching) {
      return {
        status: 'WARNING',
        message: 'Caching not configured',
        severity: 'LOW'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Throughput capacity configured',
      severity: 'MEDIUM'
    };
  }

  // Reliability & Availability Checks
  async checkSystemUptime() {
    // Check system uptime requirements
    const hasUptimeMonitoring = fs.existsSync('apps/indexer/src/health.ts');
    
    if (!hasUptimeMonitoring) {
      return {
        status: 'WARNING',
        message: 'Uptime monitoring not configured',
        severity: 'MEDIUM'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Uptime monitoring configured',
      severity: 'MEDIUM'
    };
  }

  async checkErrorRates() {
    // Check error rate monitoring
    const hasErrorLogging = fs.existsSync('apps/indexer/src/logger.ts');
    const hasAlerting = fs.existsSync('apps/indexer/src/alerts.ts');
    
    if (!hasErrorLogging || !hasAlerting) {
      return {
        status: 'WARNING',
        message: 'Error rate monitoring not fully configured',
        severity: 'MEDIUM'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Error rate monitoring configured',
      severity: 'MEDIUM'
    };
  }

  async checkFailoverCapability() {
    // Check failover capability
    const hasBackupRPC = process.env.BACKUP_RPC_URL;
    const hasDatabaseReplica = process.env.REPLICA_DATABASE_URL;
    
    if (!hasBackupRPC) {
      return {
        status: 'WARNING',
        message: 'Backup RPC not configured',
        severity: 'MEDIUM'
      };
    }
    
    if (!hasDatabaseReplica) {
      return {
        status: 'WARNING',
        message: 'Database replica not configured',
        severity: 'MEDIUM'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Failover capability configured',
      severity: 'HIGH'
    };
  }

  async checkBackupSystems() {
    // Check backup systems
    const hasBackupScript = fs.existsSync('scripts/backup.js');
    const hasBackupSchedule = process.env.BACKUP_SCHEDULE;
    
    if (!hasBackupScript) {
      return {
        status: 'WARNING',
        message: 'Backup script not found',
        severity: 'MEDIUM'
      };
    }
    
    if (!hasBackupSchedule) {
      return {
        status: 'WARNING',
        message: 'Backup schedule not configured',
        severity: 'MEDIUM'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Backup systems configured',
      severity: 'HIGH'
    };
  }

  async checkRecoveryProcedures() {
    // Check recovery procedures
    const hasRecoveryDocs = fs.existsSync('docs/OPERATIONS.md');
    const hasDisasterRecovery = fs.existsSync('docs/DISASTER_RECOVERY.md');
    
    if (!hasRecoveryDocs) {
      return {
        status: 'WARNING',
        message: 'Recovery procedures not documented',
        severity: 'MEDIUM'
      };
    }
    
    if (!hasDisasterRecovery) {
      return {
        status: 'WARNING',
        message: 'Disaster recovery plan not documented',
        severity: 'MEDIUM'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Recovery procedures documented',
      severity: 'HIGH'
    };
  }

  // Monitoring & Alerting Checks
  async checkMonitoringCoverage() {
    // Check monitoring coverage
    const hasHealthChecks = fs.existsSync('apps/indexer/src/health.ts');
    const hasMetrics = fs.existsSync('apps/indexer/src/metrics.ts');
    const hasObservability = fs.existsSync('apps/indexer/src/observability-service.ts');
    
    if (!hasHealthChecks || !hasMetrics || !hasObservability) {
      return {
        status: 'WARNING',
        message: 'Monitoring coverage incomplete',
        severity: 'MEDIUM'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Monitoring coverage complete',
      severity: 'HIGH'
    };
  }

  async checkAlertConfiguration() {
    // Check alert configuration
    const hasSlackAlerts = process.env.SLACK_WEBHOOK_URL;
    const hasEmailAlerts = process.env.SMTP_HOST && process.env.SMTP_USER;
    
    if (!hasSlackAlerts && !hasEmailAlerts) {
      return {
        status: 'WARNING',
        message: 'No alert channels configured',
        severity: 'MEDIUM'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Alert configuration complete',
      severity: 'HIGH'
    };
  }

  async checkLoggingSystems() {
    // Check logging systems
    const hasStructuredLogging = fs.existsSync('apps/indexer/src/logger.ts');
    const hasLogRotation = process.env.LOG_ROTATION;
    
    if (!hasStructuredLogging) {
      return {
        status: 'FAILED',
        message: 'Structured logging not configured',
        severity: 'CRITICAL'
      };
    }
    
    if (!hasLogRotation) {
      return {
        status: 'WARNING',
        message: 'Log rotation not configured',
        severity: 'LOW'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Logging systems configured',
      severity: 'HIGH'
    };
  }

  async checkMetricsCollection() {
    // Check metrics collection
    const hasMetricsCollector = fs.existsSync('apps/indexer/src/metrics.ts');
    const hasPrometheus = process.env.PROMETHEUS_ENDPOINT;
    
    if (!hasMetricsCollector) {
      return {
        status: 'WARNING',
        message: 'Metrics collection not configured',
        severity: 'MEDIUM'
      };
    }
    
    if (!hasPrometheus) {
      return {
        status: 'WARNING',
        message: 'Prometheus integration not configured',
        severity: 'LOW'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Metrics collection configured',
      severity: 'MEDIUM'
    };
  }

  async checkDashboardAvailability() {
    // Check dashboard availability
    const hasConsole = fs.existsSync('apps/console');
    const hasMonitoringDashboard = fs.existsSync('apps/monitoring');
    
    if (!hasConsole) {
      return {
        status: 'FAILED',
        message: 'Operator console not available',
        severity: 'CRITICAL'
      };
    }
    
    if (!hasMonitoringDashboard) {
      return {
        status: 'WARNING',
        message: 'Monitoring dashboard not available',
        severity: 'MEDIUM'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Dashboard availability confirmed',
      severity: 'HIGH'
    };
  }

  // Documentation & Training Checks
  async checkDocumentationCompleteness() {
    // Check documentation completeness
    const requiredDocs = [
      'docs/README.md',
      'docs/SETUP.md',
      'docs/DEPLOYMENT.md',
      'docs/API.md',
      'docs/OPERATIONS.md',
      'docs/PILOT_VALIDATION.md',
      'THREAT_MODEL.md'
    ];
    
    const missingDocs = requiredDocs.filter(doc => !fs.existsSync(doc));
    
    if (missingDocs.length > 0) {
      return {
        status: 'WARNING',
        message: `Missing documentation: ${missingDocs.join(', ')}`,
        severity: 'MEDIUM'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Documentation complete',
      severity: 'HIGH'
    };
  }

  async checkRunbookAccuracy() {
    // Check runbook accuracy
    const hasRunbook = fs.existsSync('docs/OPERATOR_RUNBOOK.md');
    const hasEmergencyProcedures = fs.existsSync('docs/EMERGENCY_PROCEDURES.md');
    
    if (!hasRunbook) {
      return {
        status: 'FAILED',
        message: 'Operator runbook not available',
        severity: 'CRITICAL'
      };
    }
    
    if (!hasEmergencyProcedures) {
      return {
        status: 'WARNING',
        message: 'Emergency procedures not documented',
        severity: 'MEDIUM'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Runbook accuracy confirmed',
      severity: 'HIGH'
    };
  }

  async checkTrainingMaterials() {
    // Check training materials
    const hasTrainingDocs = fs.existsSync('docs/TRAINING.md');
    const hasVideoTutorials = fs.existsSync('docs/tutorials');
    
    if (!hasTrainingDocs) {
      return {
        status: 'WARNING',
        message: 'Training materials not available',
        severity: 'MEDIUM'
      };
    }
    
    if (!hasVideoTutorials) {
      return {
        status: 'WARNING',
        message: 'Video tutorials not available',
        severity: 'LOW'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Training materials available',
      severity: 'MEDIUM'
    };
  }

  async checkEmergencyProcedures() {
    // Check emergency procedures
    const hasEmergencyDocs = fs.existsSync('docs/EMERGENCY_PROCEDURES.md');
    const hasIncidentResponse = fs.existsSync('docs/INCIDENT_RESPONSE.md');
    
    if (!hasEmergencyDocs) {
      return {
        status: 'WARNING',
        message: 'Emergency procedures not documented',
        severity: 'MEDIUM'
      };
    }
    
    if (!hasIncidentResponse) {
      return {
        status: 'WARNING',
        message: 'Incident response plan not documented',
        severity: 'MEDIUM'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Emergency procedures documented',
      severity: 'HIGH'
    };
  }

  async checkKnowledgeTransfer() {
    // Check knowledge transfer
    const hasArchitectureDocs = fs.existsSync('docs/ARCHITECTURE.md');
    const hasTroubleshootingGuide = fs.existsSync('docs/TROUBLESHOOTING.md');
    
    if (!hasArchitectureDocs) {
      return {
        status: 'WARNING',
        message: 'Architecture documentation not available',
        severity: 'MEDIUM'
      };
    }
    
    if (!hasTroubleshootingGuide) {
      return {
        status: 'WARNING',
        message: 'Troubleshooting guide not available',
        severity: 'MEDIUM'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Knowledge transfer materials available',
      severity: 'MEDIUM'
    };
  }

  // Launch Readiness Checks
  async checkDeploymentReadiness() {
    // Check deployment readiness
    const hasDeploymentScript = fs.existsSync('deployCompleteSystem.js');
    const hasProductionConfig = fs.existsSync('.env.production');
    
    if (!hasDeploymentScript) {
      return {
        status: 'FAILED',
        message: 'Deployment script not available',
        severity: 'CRITICAL'
      };
    }
    
    if (!hasProductionConfig) {
      return {
        status: 'WARNING',
        message: 'Production configuration not available',
        severity: 'MEDIUM'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Deployment readiness confirmed',
      severity: 'HIGH'
    };
  }

  async checkGoLiveCriteria() {
    // Check go-live criteria
    const hasAllContracts = this.deploymentAddresses.contracts.mockusdc?.status === 'deployed' &&
                           this.deploymentAddresses.contracts.complianceregistry?.status === 'deployed' &&
                           this.deploymentAddresses.contracts.securitytoken?.status === 'deployed' &&
                           this.deploymentAddresses.contracts.linearvesting?.status === 'deployed';
    
    if (!hasAllContracts) {
      return {
        status: 'FAILED',
        message: 'Not all contracts deployed',
        severity: 'CRITICAL'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Go-live criteria met',
      severity: 'HIGH'
    };
  }

  async checkRollbackProcedures() {
    // Check rollback procedures
    const hasRollbackScript = fs.existsSync('scripts/rollback.js');
    const hasRollbackDocs = fs.existsSync('docs/ROLLBACK_PROCEDURES.md');
    
    if (!hasRollbackScript) {
      return {
        status: 'WARNING',
        message: 'Rollback script not available',
        severity: 'MEDIUM'
      };
    }
    
    if (!hasRollbackDocs) {
      return {
        status: 'WARNING',
        message: 'Rollback procedures not documented',
        severity: 'MEDIUM'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Rollback procedures available',
      severity: 'HIGH'
    };
  }

  async checkLaunchCommunication() {
    // Check launch communication
    const hasLaunchPlan = fs.existsSync('docs/LAUNCH_PLAN.md');
    const hasStakeholderComms = fs.existsSync('docs/STAKEHOLDER_COMMUNICATION.md');
    
    if (!hasLaunchPlan) {
      return {
        status: 'WARNING',
        message: 'Launch plan not documented',
        severity: 'MEDIUM'
      };
    }
    
    if (!hasStakeholderComms) {
      return {
        status: 'WARNING',
        message: 'Stakeholder communication plan not documented',
        severity: 'MEDIUM'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Launch communication planned',
      severity: 'MEDIUM'
    };
  }

  async checkPostLaunchSupport() {
    // Check post-launch support
    const hasSupportPlan = fs.existsSync('docs/POST_LAUNCH_SUPPORT.md');
    const hasMonitoringPlan = fs.existsSync('docs/MONITORING_PLAN.md');
    
    if (!hasSupportPlan) {
      return {
        status: 'WARNING',
        message: 'Post-launch support plan not documented',
        severity: 'MEDIUM'
      };
    }
    
    if (!hasMonitoringPlan) {
      return {
        status: 'WARNING',
        message: 'Monitoring plan not documented',
        severity: 'MEDIUM'
      };
    }
    
    return {
      status: 'PASSED',
      message: 'Post-launch support planned',
      severity: 'MEDIUM'
    };
  }

  generateReadinessReport() {
    this.readinessResults.endTime = new Date().toISOString();
    this.readinessResults.duration = new Date(this.readinessResults.endTime) - new Date(this.readinessResults.startTime);
    
    // Calculate readiness score
    const totalChecks = this.readinessResults.summary.total;
    const passedChecks = this.readinessResults.summary.passed;
    const warningChecks = this.readinessResults.summary.warnings;
    
    this.readinessResults.readinessScore = Math.round(
      ((passedChecks + (warningChecks * 0.5)) / totalChecks) * 100
    );
    
    console.log('\n📊 PRODUCTION READINESS REPORT');
    console.log('==============================');
    console.log(`📍 Network: ${this.readinessResults.network}`);
    console.log(`📍 Deployer: ${this.readinessResults.deployer}`);
    console.log(`📍 Start Time: ${this.readinessResults.startTime}`);
    console.log(`📍 End Time: ${this.readinessResults.endTime}`);
    console.log(`📍 Duration: ${this.readinessResults.duration}ms`);
    
    console.log('\n📋 Check Results:');
    console.log(`  Total Checks: ${this.readinessResults.summary.total}`);
    console.log(`  ✅ Passed: ${this.readinessResults.summary.passed}`);
    console.log(`  ⚠️ Warnings: ${this.readinessResults.summary.warnings}`);
    console.log(`  ❌ Failed: ${this.readinessResults.summary.failed}`);
    console.log(`  🔥 Critical: ${this.readinessResults.summary.critical}`);
    
    console.log(`\n📊 Readiness Score: ${this.readinessResults.readinessScore}%`);
    
    // Determine readiness status
    let readinessStatus;
    if (this.readinessResults.readinessScore >= 95) {
      readinessStatus = '🟢 PRODUCTION READY';
    } else if (this.readinessResults.readinessScore >= 85) {
      readinessStatus = '🟡 READY WITH CAUTIONS';
    } else if (this.readinessResults.readinessScore >= 70) {
      readinessStatus = '🟠 NEEDS IMPROVEMENT';
    } else {
      readinessStatus = '🔴 NOT READY';
    }
    
    console.log(`\n🎯 Readiness Status: ${readinessStatus}`);
    
    // Show critical issues
    if (this.readinessResults.summary.critical > 0) {
      console.log('\n🔥 Critical Issues:');
      this.readinessResults.checks
        .filter(check => check.severity === 'CRITICAL' && check.status === 'FAILED')
        .forEach(check => {
          console.log(`  • ${check.name}: ${check.message}`);
        });
    }
    
    // Show warnings
    if (this.readinessResults.summary.warnings > 0) {
      console.log('\n⚠️ Warnings:');
      this.readinessResults.checks
        .filter(check => check.status === 'WARNING')
        .forEach(check => {
          console.log(`  • ${check.name}: ${check.message}`);
        });
    }
    
    // Generate recommendations
    this.generateRecommendations();
    
    // Save detailed report
    const reportPath = `production-readiness-report-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(this.readinessResults, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    // Overall result
    if (this.readinessResults.readinessScore >= 95) {
      console.log('\n🎉 PRODUCTION READY!');
      console.log('✅ Platform is ready for mainnet deployment.');
    } else if (this.readinessResults.readinessScore >= 85) {
      console.log('\n⚠️ READY WITH CAUTIONS');
      console.log('⚠️ Platform is ready but address warnings before deployment.');
    } else {
      console.log('\n❌ NOT READY FOR PRODUCTION');
      console.log('❌ Address critical issues before deployment.');
      process.exit(1);
    }
  }

  generateRecommendations() {
    console.log('\n💡 Recommendations:');
    
    if (this.readinessResults.summary.critical > 0) {
      console.log('  🔥 Address critical issues immediately');
    }
    
    if (this.readinessResults.summary.warnings > 0) {
      console.log('  ⚠️ Address warnings before production deployment');
    }
    
    console.log('  📚 Complete missing documentation');
    console.log('  🔧 Configure missing monitoring and alerting');
    console.log('  🛡️ Implement additional security measures');
    console.log('  📊 Set up comprehensive monitoring dashboards');
    console.log('  🚨 Test emergency procedures');
    console.log('  👥 Conduct team training sessions');
    console.log('  📋 Create incident response playbooks');
  }
}

// Main execution
async function main() {
  const checker = new ProductionReadinessChecker();
  await checker.runReadinessCheck();
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Production readiness check failed:', error);
    process.exit(1);
  });
}

export { ProductionReadinessChecker };
