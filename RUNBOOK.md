# COINSCIOUS Platform - Operator Runbook

## 🚨 Emergency Contacts
- **Primary**: CTO (cto@coinscious.com)
- **Secondary**: Lead Developer (dev@coinscious.com)
- **Escalation**: Security Team (security@coinscious.com)

## 📋 Pre-Flight Checklist

### System Health Check
```bash
# Check system status
curl -X GET /api/system/status

# Verify all contracts are paused/unpaused as expected
curl -X GET /api/contracts/status

# Check recent events for anomalies
curl -X GET /api/events/recent?limit=10
```

### Contract Addresses Verification
- **LogAnchor**: `0x...` (verify in console)
- **ComplianceRegistry**: `0x...` (verify in console)
- **SecurityTokenFactory**: `0x...` (verify in console)
- **PayoutDistributorFactory**: `0x...` (verify in console)

### Role Verification
- **Owner**: Gnosis Safe (verify multisig threshold)
- **Controller**: Timelock Controller (verify delay settings)
- **Oracle**: Authorized compliance operators (verify role members)

## 🔄 Routine Operations

### Daily Minting
1. **Preflight Check**: Use console to simulate mint operation
2. **Compliance Verification**: Ensure recipient is whitelisted and accredited
3. **Execute Mint**: Use console with two-operator approval
4. **Verify Event**: Check events table for successful mint

### Token Transfers
1. **Preflight Check**: Simulate transfer in console
2. **Compliance Check**: Verify both sender and recipient compliance
3. **Partition Validation**: Ensure correct partition (REG_D/REG_S)
4. **Execute Transfer**: Use console with approval workflow

### Payout Distribution
1. **Snapshot Creation**: Create holder snapshot
2. **Funding Check**: Verify USDC balance in distributor
3. **Tax Form Validation**: Ensure all recipients have tax forms
4. **Preflight Check**: Simulate distribution
5. **Execute Distribution**: Use console with two-operator approval

### Compliance Management
1. **Wallet Whitelisting**: Add new wallets to compliance registry
2. **Claims Updates**: Update accreditation status and expiration
3. **Freeze/Unfreeze**: Temporarily block problematic wallets
4. **Audit Logging**: All actions are automatically logged

## 🚨 Emergency Procedures

### Global System Pause
```bash
# Immediate pause (requires two operators)
1. Navigate to /danger in console
2. Click "Pause System"
3. Confirm with second operator
4. Verify pause status in overview
```

### Wallet Freeze
```bash
# Freeze specific wallet
1. Navigate to /compliance in console
2. Search for wallet address
3. Click "Freeze" button
4. Confirm with second operator
5. Verify freeze status
```

### Controller Rotation
```bash
# Two-step controller handover
1. Current controller proposes new controller
2. New controller accepts the role
3. Verify role change in events
4. Test new controller permissions
```

### Token Rescue
```bash
# Rescue accidentally sent tokens
1. Navigate to /danger in console
2. Click "Rescue Tokens"
3. Specify token contract and amount
4. Confirm with second operator
5. Verify tokens transferred to safe address
```

## 🔧 Troubleshooting

### Common Issues

#### "ERR_FROZEN" Error
- **Cause**: Wallet is frozen by compliance
- **Solution**: Unfreeze wallet in compliance tab
- **Prevention**: Check freeze status before operations

#### "ERR_NOT_WHITELISTED" Error
- **Cause**: Wallet not in compliance registry
- **Solution**: Add wallet to compliance registry
- **Prevention**: Pre-verify all recipient addresses

#### "ERR_UNDERFUNDED_FULL_MODE" Error
- **Cause**: Insufficient USDC in distributor
- **Solution**: Fund distributor with required USDC
- **Prevention**: Check funding before distribution

#### "ERR_ALREADY_DISTRIBUTED" Error
- **Cause**: Snapshot already distributed
- **Solution**: Use different snapshot or check distribution status
- **Prevention**: Verify snapshot status before distribution

### System Monitoring

#### Health Checks
- **Database**: Check connection and query performance
- **RPC**: Verify blockchain connection and response time
- **Indexer**: Ensure events are being processed
- **Alerts**: Check for any pending alerts

#### Performance Metrics
- **Gas Usage**: Monitor gas consumption trends
- **Transaction Success Rate**: Track failed transactions
- **Event Processing**: Verify indexer is keeping up
- **API Response Time**: Monitor console performance

## 📊 Compliance Monitoring

### 12(g) Threshold Monitoring
- **Current Limit**: 2,000 holders
- **Warning Thresholds**: 70% (1,400), 90% (1,800)
- **Actions**: Monitor alerts, prepare for reporting requirements

### Tax Form Compliance
- **Requirement**: All payout recipients must have tax forms
- **Validation**: Automatic check during distribution
- **Action**: Update tax forms before distribution

### Audit Trail
- **All Actions**: Logged with timestamps and operators
- **Event Indexing**: Real-time capture of all blockchain events
- **Retention**: 7 years for compliance records

## 🔐 Security Procedures

### Access Control
- **Console Access**: Two-operator approval required
- **API Keys**: Rotate every 90 days
- **Database**: Encrypted at rest, access logging enabled

### Incident Response
1. **Immediate**: Pause system if security threat detected
2. **Assessment**: Evaluate scope and impact
3. **Containment**: Isolate affected systems
4. **Recovery**: Restore from backups if necessary
5. **Post-Incident**: Document lessons learned

### Backup Procedures
- **Database**: Daily automated backups
- **Configuration**: Version controlled in Git
- **Private Keys**: Stored in secure hardware wallets

## 📞 Escalation Procedures

### Level 1: Standard Operations
- **Scope**: Routine minting, transfers, payouts
- **Response Time**: Immediate
- **Approval**: Single operator

### Level 2: Compliance Actions
- **Scope**: Freeze/unfreeze, claims updates
- **Response Time**: < 1 hour
- **Approval**: Two operators

### Level 3: Emergency Actions
- **Scope**: System pause, controller rotation, rescue
- **Response Time**: < 15 minutes
- **Approval**: Two operators + CTO notification

### Level 4: Security Incidents
- **Scope**: Security breaches, unauthorized access
- **Response Time**: Immediate
- **Approval**: Security team + legal team

## 📝 Maintenance Schedule

### Daily
- [ ] Check system status
- [ ] Review recent events
- [ ] Verify backup completion
- [ ] Check alert notifications

### Weekly
- [ ] Review gas usage trends
- [ ] Update compliance records
- [ ] Test emergency procedures
- [ ] Review security logs

### Monthly
- [ ] Rotate API keys
- [ ] Update documentation
- [ ] Review access permissions
- [ ] Test disaster recovery

### Quarterly
- [ ] Security audit
- [ ] Compliance review
- [ ] Performance optimization
- [ ] Training updates

---

**Last Updated**: January 2024  
**Version**: 1.0  
**Next Review**: April 2024



