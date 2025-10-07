# COINSCIOUS Platform - Operator Runbook

## 🎯 **Overview**

This runbook provides comprehensive operational procedures for the COINSCIOUS platform. It covers day-to-day operations, emergency procedures, troubleshooting, and maintenance tasks.

**Target Audience**: Platform operators, DevOps engineers, and on-call personnel  
**Document Version**: 1.0  
**Last Updated**: January 2024  
**Classification**: Internal Use

---

## 📋 **Table of Contents**

1. [System Overview](#system-overview)
2. [Daily Operations](#daily-operations)
3. [Emergency Procedures](#emergency-procedures)
4. [Troubleshooting Guide](#troubleshooting-guide)
5. [Maintenance Procedures](#maintenance-procedures)
6. [Monitoring & Alerts](#monitoring--alerts)
7. [Security Procedures](#security-procedures)
8. [Compliance Operations](#compliance-operations)
9. [Deployment Procedures](#deployment-procedures)
10. [Contact Information](#contact-information)

---

## 🏗️ **System Overview**

### **Architecture Components**
- **Smart Contracts**: SecurityToken, ComplianceRegistry, LinearVesting, PayoutDistributor
- **Operator Console**: Next.js web application for platform management
- **Event Indexer**: Real-time blockchain event monitoring and processing
- **Database**: PostgreSQL for data persistence and analytics
- **Monitoring**: Comprehensive observability with Slack/email alerts

### **Key Services**
- **Frontend**: `apps/console` - Operator interface
- **Indexer**: `apps/indexer` - Blockchain event processing
- **API**: `services/api` - Backend services
- **Contracts**: `contracts/` - Smart contract code

### **Environment Tiers**
- **Development**: Local development environment
- **Staging**: Base Sepolia testnet with full testing
- **Production**: Base Mainnet with live operations

---

## 📅 **Daily Operations**

### **Morning Checklist (9:00 AM)**
1. **System Health Check**
   ```bash
   # Check system status
   curl -X GET https://api.coinscious.com/health
   
   # Verify all services are running
   kubectl get pods -n coinscious
   ```

2. **Review Overnight Alerts**
   - Check Slack #alerts channel
   - Review email alerts for critical issues
   - Verify all overnight operations completed successfully

3. **Database Health**
   ```bash
   # Check database connections
   psql -h db.coinscious.com -U operator -d coinscious -c "SELECT 1"
   
   # Check indexer status
   curl -X GET https://indexer.coinscious.com/health
   ```

4. **Blockchain Sync Status**
   - Verify indexer is up-to-date with latest blocks
   - Check for any RPC connection issues
   - Confirm event processing is working

### **Afternoon Checklist (2:00 PM)**
1. **Performance Review**
   - Check system metrics dashboard
   - Review processing rates and error counts
   - Verify memory and CPU usage are normal

2. **Compliance Check**
   - Review any compliance actions from overnight
   - Check for 12(g) threshold warnings
   - Verify all freeze/unfreeze actions are legitimate

3. **Backup Verification**
   - Confirm daily backups completed successfully
   - Test restore procedures if needed
   - Verify backup integrity

### **Evening Checklist (6:00 PM)**
1. **System Status Review**
   - Review daily metrics and performance
   - Check for any pending operations
   - Verify all scheduled tasks completed

2. **Security Review**
   - Review access logs for unusual activity
   - Check for any security alerts
   - Verify all authentication systems working

3. **Prepare for Night**
   - Ensure monitoring is active
   - Verify on-call procedures are in place
   - Confirm emergency contacts are available

---

## 🚨 **Emergency Procedures**

### **Critical System Issues**

#### **System Pause Required**
```bash
# 1. Immediate system pause (requires two operators)
# Operator 1: Initiate pause in Danger Zone
# Operator 2: Approve pause action

# 2. Verify system is paused
curl -X GET https://api.coinscious.com/system/status

# 3. Notify stakeholders
# Send alert to #incidents Slack channel
# Email: incidents@coinscious.com
```

#### **Database Connection Lost**
```bash
# 1. Check database connectivity
psql -h db.coinscious.com -U operator -d coinscious -c "SELECT 1"

# 2. If database is down, check:
# - Database server status
# - Network connectivity
# - Connection pool settings

# 3. Restart database if necessary
kubectl restart deployment postgres -n coinscious

# 4. Verify indexer reconnects
curl -X GET https://indexer.coinscious.com/health
```

#### **RPC Connection Issues**
```bash
# 1. Check RPC endpoint status
curl -X POST https://sepolia.base.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# 2. If RPC is down, switch to backup
export RPC_URL_BASE_SEPOLIA="https://backup-rpc.base.org"

# 3. Restart indexer with new RPC
kubectl restart deployment indexer -n coinscious
```

#### **Smart Contract Emergency**
```bash
# 1. Pause all token operations
# Use Danger Zone -> Pause System (requires two operators)

# 2. Verify pause is effective
# Check that no new transfers can occur

# 3. Investigate issue
# Review contract logs and recent transactions

# 4. Contact security team
# security@coinscious.com
# +1-555-SECURITY
```

### **Security Incidents**

#### **Suspected Private Key Compromise**
1. **Immediate Actions** (within 5 minutes)
   - Pause all system operations
   - Revoke all API keys and access tokens
   - Change all passwords and secrets
   - Notify security team immediately

2. **Investigation** (within 30 minutes)
   - Review access logs for unusual activity
   - Check for unauthorized transactions
   - Verify multisig approvals are legitimate
   - Document all findings

3. **Recovery** (within 2 hours)
   - Generate new private keys
   - Update all systems with new keys
   - Verify system integrity
   - Resume operations with enhanced monitoring

#### **Compliance Violation Detected**
1. **Immediate Response**
   - Freeze affected wallets immediately
   - Document the violation
   - Notify compliance team
   - Review all related transactions

2. **Investigation**
   - Determine scope of violation
   - Identify root cause
   - Review compliance logic
   - Document findings

3. **Remediation**
   - Fix compliance logic if needed
   - Update procedures
   - Train operators
   - Resume operations

---

## 🔧 **Troubleshooting Guide**

### **Common Issues**

#### **Indexer Not Processing Events**
```bash
# 1. Check indexer status
curl -X GET https://indexer.coinscious.com/health

# 2. Check logs
kubectl logs -f deployment/indexer -n coinscious

# 3. Verify RPC connection
curl -X POST https://sepolia.base.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# 4. Restart indexer if needed
kubectl restart deployment/indexer -n coinscious
```

#### **Database Performance Issues**
```bash
# 1. Check database metrics
psql -h db.coinscious.com -U operator -d coinscious -c "
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;"

# 2. Check slow queries
psql -h db.coinscious.com -U operator -d coinscious -c "
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;"

# 3. Optimize if needed
# Add indexes, update statistics, etc.
```

#### **High Memory Usage**
```bash
# 1. Check memory usage
kubectl top pods -n coinscious

# 2. Check for memory leaks
kubectl exec -it deployment/indexer -n coinscious -- node -e "
console.log(process.memoryUsage());
console.log(process.memoryUsage().heapUsed / 1024 / 1024, 'MB');"

# 3. Restart if necessary
kubectl restart deployment/indexer -n coinscious
```

#### **API Response Time Issues**
```bash
# 1. Check API health
curl -X GET https://api.coinscious.com/health

# 2. Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.coinscious.com/health

# 3. Check database connections
psql -h db.coinscious.com -U operator -d coinscious -c "
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';"
```

### **Performance Optimization**

#### **Database Optimization**
```sql
-- 1. Update table statistics
ANALYZE;

-- 2. Check for missing indexes
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.1;

-- 3. Add indexes if needed
CREATE INDEX CONCURRENTLY idx_token_transfers_timestamp 
ON token_transfers(timestamp);

-- 4. Vacuum tables
VACUUM ANALYZE token_transfers;
```

#### **Indexer Optimization**
```bash
# 1. Check processing rate
curl -X GET https://indexer.coinscious.com/metrics | jq '.indexer.eventsPerMinute'

# 2. Check block lag
curl -X GET https://indexer.coinscious.com/health | jq '.checks.indexer.details.blockLag'

# 3. Optimize batch size if needed
kubectl set env deployment/indexer -n coinscious BATCH_SIZE=100
```

---

## 🔧 **Maintenance Procedures**

### **Weekly Maintenance**

#### **Database Maintenance** (Sundays 2:00 AM)
```bash
# 1. Full database backup
pg_dump -h db.coinscious.com -U operator -d coinscious > backup_$(date +%Y%m%d).sql

# 2. Update table statistics
psql -h db.coinscious.com -U operator -d coinscious -c "ANALYZE;"

# 3. Vacuum tables
psql -h db.coinscious.com -U operator -d coinscious -c "VACUUM ANALYZE;"

# 4. Check for bloat
psql -h db.coinscious.com -U operator -d coinscious -c "
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

#### **Security Updates** (Mondays 10:00 AM)
```bash
# 1. Update dependencies
cd /app
npm audit
npm update

# 2. Update system packages
apt update && apt upgrade -y

# 3. Restart services
kubectl rollout restart deployment/console -n coinscious
kubectl rollout restart deployment/indexer -n coinscious
kubectl rollout restart deployment/api -n coinscious
```

### **Monthly Maintenance**

#### **Security Audit** (First Monday of month)
1. **Review Access Logs**
   - Check for unusual access patterns
   - Verify all access is legitimate
   - Review failed authentication attempts

2. **Update Security Policies**
   - Review and update access controls
   - Update password policies if needed
   - Review and rotate secrets

3. **Penetration Testing**
   - Run automated security scans
   - Test for common vulnerabilities
   - Review and fix any issues found

#### **Performance Review** (First Friday of month)
1. **Analyze Metrics**
   - Review monthly performance trends
   - Identify bottlenecks and optimization opportunities
   - Plan capacity upgrades if needed

2. **Database Optimization**
   - Review query performance
   - Add indexes if needed
   - Clean up old data

3. **System Updates**
   - Update to latest stable versions
   - Apply security patches
   - Test new features

---

## 📊 **Monitoring & Alerts**

### **Key Metrics to Monitor**

#### **System Health**
- **Uptime**: Target 99.9%
- **Response Time**: < 200ms for API calls
- **Error Rate**: < 0.1%
- **Memory Usage**: < 80% of available

#### **Blockchain Metrics**
- **Block Lag**: < 10 blocks behind
- **Event Processing Rate**: > 100 events/minute
- **RPC Response Time**: < 1 second
- **Failed Transactions**: < 1%

#### **Database Metrics**
- **Connection Pool**: < 80% utilization
- **Query Performance**: < 100ms average
- **Storage Usage**: < 80% of available
- **Backup Success**: 100%

### **Alert Thresholds**

#### **Critical Alerts** (Immediate Response Required)
- System down or unreachable
- Database connection lost
- RPC connection lost
- Security breach detected
- Compliance violation

#### **High Priority Alerts** (Response within 1 hour)
- High error rate (> 1%)
- High memory usage (> 90%)
- High block lag (> 50 blocks)
- Slow query performance (> 1 second)

#### **Medium Priority Alerts** (Response within 4 hours)
- Low processing rate (< 10 events/minute)
- High CPU usage (> 80%)
- Disk space low (< 20% free)
- Backup failures

### **Alert Response Procedures**

1. **Acknowledge Alert**
   - Respond to Slack alert within 5 minutes
   - Update incident tracking system
   - Assign primary responder

2. **Investigate Issue**
   - Check system logs
   - Verify alert is legitimate
   - Determine root cause
   - Document findings

3. **Resolve Issue**
   - Implement fix
   - Verify resolution
   - Update monitoring
   - Document resolution

4. **Post-Incident Review**
   - Conduct post-mortem
   - Update procedures if needed
   - Train team on lessons learned
   - Close incident

---

## 🔒 **Security Procedures**

### **Access Management**

#### **Adding New Operator**
1. **Request Access**
   - Submit access request form
   - Include business justification
   - Specify required permissions

2. **Background Check**
   - Verify identity
   - Check references
   - Review security clearance

3. **Account Setup**
   - Create user account
   - Assign appropriate roles
   - Generate access credentials
   - Provide training

4. **Monitoring Setup**
   - Enable access logging
   - Set up alerts
   - Schedule regular reviews

#### **Removing Operator Access**
1. **Immediate Actions**
   - Disable all accounts
   - Revoke all credentials
   - Remove from all systems
   - Notify security team

2. **Cleanup**
   - Review access logs
   - Check for unauthorized activity
   - Update access controls
   - Document removal

### **Incident Response**

#### **Security Incident Classification**
- **Level 1**: Critical security breach
- **Level 2**: Significant security issue
- **Level 3**: Minor security concern
- **Level 4**: Security observation

#### **Response Procedures**
1. **Detection**
   - Monitor security alerts
   - Review access logs
   - Check for anomalies
   - Verify incidents

2. **Containment**
   - Isolate affected systems
   - Preserve evidence
   - Prevent further damage
   - Notify stakeholders

3. **Investigation**
   - Analyze incident
   - Determine scope
   - Identify root cause
   - Document findings

4. **Recovery**
   - Restore systems
   - Implement fixes
   - Verify security
   - Resume operations

5. **Lessons Learned**
   - Conduct post-mortem
   - Update procedures
   - Train team
   - Improve security

---

## 📋 **Compliance Operations**

### **12(g) Threshold Monitoring**

#### **Daily Checks**
```bash
# Check current holder count
curl -X GET https://api.coinscious.com/compliance/holder-count

# Check threshold status
curl -X GET https://api.coinscious.com/compliance/threshold-status
```

#### **Threshold Alerts**
- **70%**: Warning alert sent
- **90%**: Critical alert sent
- **95%**: Emergency procedures activated
- **100%**: System pause required

#### **Response Procedures**
1. **70% Threshold**
   - Send warning to compliance team
   - Review holder growth trends
   - Prepare for potential action

2. **90% Threshold**
   - Send critical alert
   - Notify legal team
   - Prepare compliance documentation
   - Review transfer policies

3. **95% Threshold**
   - Activate emergency procedures
   - Pause new transfers
   - Notify all stakeholders
   - Prepare for 12(g) filing

### **Compliance Actions**

#### **Wallet Freeze**
1. **Initiate Freeze**
   - Use Danger Zone -> Freeze Wallet
   - Require two-operator approval
   - Specify freeze reason
   - Document decision

2. **Verify Freeze**
   - Confirm wallet is frozen
   - Test transfer attempts
   - Update compliance records
   - Notify relevant parties

#### **Wallet Unfreeze**
1. **Review Request**
   - Verify unfreeze justification
   - Check compliance status
   - Review freeze history
   - Get approval

2. **Execute Unfreeze**
   - Use Danger Zone -> Unfreeze Wallet
   - Require two-operator approval
   - Document decision
   - Notify relevant parties

### **Audit Trail Management**

#### **Log Review**
```bash
# Review compliance actions
psql -h db.coinscious.com -U operator -d coinscious -c "
SELECT 
  action_type,
  wallet_address,
  operator_address,
  reason_code,
  timestamp
FROM compliance_actions
WHERE timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;"

# Review transfer logs
psql -h db.coinscious.com -U operator -d coinscious -c "
SELECT 
  from_address,
  to_address,
  amount,
  timestamp
FROM token_transfers
WHERE timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;"
```

#### **Audit Preparation**
1. **Data Collection**
   - Export all compliance logs
   - Collect transfer records
   - Gather system logs
   - Prepare documentation

2. **Review Process**
   - Verify data completeness
   - Check for anomalies
   - Prepare explanations
   - Document findings

---

## 🚀 **Deployment Procedures**

### **Staging Deployment**

#### **Pre-Deployment Checklist**
- [ ] All tests passing
- [ ] Security scan completed
- [ ] Code review approved
- [ ] Documentation updated
- [ ] Backup completed

#### **Deployment Steps**
```bash
# 1. Deploy to staging
git checkout main
git pull origin main
kubectl apply -f k8s/staging/

# 2. Verify deployment
kubectl get pods -n coinscious-staging
kubectl logs -f deployment/console -n coinscious-staging

# 3. Run smoke tests
npm run test:smoke:staging

# 4. Update monitoring
kubectl apply -f monitoring/staging/
```

### **Production Deployment**

#### **Pre-Deployment Checklist**
- [ ] Staging deployment successful
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Rollback plan prepared
- [ ] Team notified

#### **Deployment Steps**
```bash
# 1. Create release tag
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

# 2. Deploy to production
kubectl apply -f k8s/production/

# 3. Verify deployment
kubectl get pods -n coinscious-production
kubectl logs -f deployment/console -n coinscious-production

# 4. Run production tests
npm run test:smoke:production

# 5. Monitor for issues
kubectl logs -f deployment/indexer -n coinscious-production
```

### **Rollback Procedures**

#### **Emergency Rollback**
```bash
# 1. Pause all operations
kubectl scale deployment/console --replicas=0 -n coinscious-production
kubectl scale deployment/indexer --replicas=0 -n coinscious-production

# 2. Rollback to previous version
kubectl rollout undo deployment/console -n coinscious-production
kubectl rollout undo deployment/indexer -n coinscious-production

# 3. Verify rollback
kubectl get pods -n coinscious-production
kubectl logs -f deployment/console -n coinscious-production

# 4. Resume operations
kubectl scale deployment/console --replicas=3 -n coinscious-production
kubectl scale deployment/indexer --replicas=2 -n coinscious-production
```

---

## 📞 **Contact Information**

### **Internal Team**

#### **Primary Contacts**
- **CTO**: cto@coinscious.com, +1-555-CTO-HELP
- **Security Lead**: security@coinscious.com, +1-555-SECURITY
- **DevOps Lead**: devops@coinscious.com, +1-555-DEVOPS
- **Compliance Lead**: compliance@coinscious.com, +1-555-COMPLY

#### **On-Call Schedule**
- **Week 1**: John Smith (Primary), Jane Doe (Secondary)
- **Week 2**: Jane Doe (Primary), Bob Johnson (Secondary)
- **Week 3**: Bob Johnson (Primary), Alice Brown (Secondary)
- **Week 4**: Alice Brown (Primary), John Smith (Secondary)

### **External Partners**

#### **Infrastructure**
- **Cloud Provider**: support@cloudprovider.com, +1-800-CLOUD-1
- **Database Support**: support@postgresql.com, +1-800-POSTGRES
- **CDN Support**: support@cdnprovider.com, +1-800-CDN-HELP

#### **Security & Compliance**
- **Security Auditor**: auditor@securityfirm.com, +1-800-SEC-AUDIT
- **Legal Counsel**: counsel@lawfirm.com, +1-800-LEGAL-1
- **Compliance Advisor**: advisor@compliancefirm.com, +1-800-COMPLY

### **Emergency Escalation**

#### **Level 1** (Immediate Response)
- **Security Breach**: security@coinscious.com, +1-555-SECURITY
- **System Down**: devops@coinscious.com, +1-555-DEVOPS
- **Compliance Issue**: compliance@coinscious.com, +1-555-COMPLY

#### **Level 2** (Response within 1 hour)
- **Performance Issues**: devops@coinscious.com
- **Data Issues**: data@coinscious.com
- **User Issues**: support@coinscious.com

#### **Level 3** (Response within 4 hours)
- **Feature Requests**: product@coinscious.com
- **Documentation**: docs@coinscious.com
- **Training**: training@coinscious.com

---

## 📚 **Appendices**

### **A. Command Reference**

#### **Kubernetes Commands**
```bash
# Check pod status
kubectl get pods -n coinscious

# View logs
kubectl logs -f deployment/console -n coinscious

# Restart deployment
kubectl rollout restart deployment/console -n coinscious

# Scale deployment
kubectl scale deployment/console --replicas=3 -n coinscious

# Check service status
kubectl get services -n coinscious
```

#### **Database Commands**
```bash
# Connect to database
psql -h db.coinscious.com -U operator -d coinscious

# Check connections
SELECT count(*) FROM pg_stat_activity;

# Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### **API Commands**
```bash
# Health check
curl -X GET https://api.coinscious.com/health

# System status
curl -X GET https://api.coinscious.com/system/status

# Metrics
curl -X GET https://api.coinscious.com/metrics

# Compliance status
curl -X GET https://api.coinscious.com/compliance/status
```

### **B. Troubleshooting Checklists**

#### **System Down Checklist**
- [ ] Check Kubernetes cluster status
- [ ] Verify pod health
- [ ] Check resource usage
- [ ] Review recent deployments
- [ ] Check external dependencies
- [ ] Review logs for errors
- [ ] Test connectivity
- [ ] Verify configuration

#### **Performance Issues Checklist**
- [ ] Check CPU usage
- [ ] Check memory usage
- [ ] Check disk I/O
- [ ] Check network latency
- [ ] Review database performance
- [ ] Check query performance
- [ ] Review application logs
- [ ] Check external API response times

#### **Security Issues Checklist**
- [ ] Review access logs
- [ ] Check for unauthorized access
- [ ] Verify authentication systems
- [ ] Check for suspicious activity
- [ ] Review security alerts
- [ ] Verify data integrity
- [ ] Check for data breaches
- [ ] Review compliance status

### **C. Emergency Contacts**

#### **24/7 Emergency Hotline**
- **Primary**: +1-555-EMERGENCY
- **Secondary**: +1-555-BACKUP-1
- **Escalation**: +1-555-ESCALATE

#### **Slack Channels**
- **#incidents**: Critical issues and outages
- **#alerts**: System alerts and notifications
- **#security**: Security-related issues
- **#devops**: Infrastructure and deployment issues
- **#compliance**: Compliance and regulatory issues

---

**Document Version**: 1.0  
**Last Updated**: January 2024  
**Next Review**: April 2024  
**Classification**: Internal Use  
**Approved By**: CTO  
**Distribution**: All Operators
