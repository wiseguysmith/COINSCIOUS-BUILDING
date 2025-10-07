# COINSCIOUS BUILDING - Operations Guide

## 🎯 Pilot Operations Overview

This guide covers day-to-day operations of the COINSCIOUS platform, including common tasks, troubleshooting, and best practices.

---

## 🚀 Getting Started

### 1. Access the Operator Console
```bash
# Start the console
cd apps/console
pnpm dev

# Open in browser
http://localhost:3000
```

### 2. Connect Your Wallet
1. Click "Connect Wallet" in the console
2. Select MetaMask or compatible wallet
3. Ensure you're on Base Sepolia testnet
4. Approve the connection

### 3. Verify System Status
- Check the Overview page for system health
- Verify all contract addresses are populated
- Confirm network connectivity

---

## 👥 Investor Management

### Adding New Investors

#### Via Console
1. Navigate to **Compliance** page
2. Click "Add Investor" button
3. Fill in required information:
   - Wallet address
   - Name and contact info
   - Accreditation status
   - Investment limits
   - Country of residence
4. Click "Register Investor"

#### Via CSV Upload
1. Prepare CSV file with columns:
   ```csv
   walletAddress,name,email,accredited,country,investmentLimit
   0x1234...,John Doe,john@example.com,true,US,100000
   ```
2. Go to **Compliance** page
3. Click "Upload CSV"
4. Select your file
5. Review and confirm the data

### Managing Investor Status

#### Freeze/Unfreeze Investor
1. Find investor in **Compliance** page
2. Click "Freeze" or "Unfreeze" button
3. Enter reason for the action
4. Confirm the operation

#### Update Compliance Status
1. Select investor from the list
2. Click "Edit Compliance"
3. Update accreditation status or limits
4. Save changes

---

## 🪙 Token Operations

### Minting Tokens

#### Basic Minting
1. Go to **Token** page
2. Select "Mint" action
3. Enter recipient address
4. Enter amount to mint
5. Select partition (REG_D or REG_S)
6. Run preflight check
7. Execute if preflight passes

#### Bulk Minting
1. Prepare CSV with minting data:
   ```csv
   recipient,amount,partition,reason
   0x1234...,1000,REG_D,Initial allocation
   0x5678...,500,REG_S,Secondary market
   ```
2. Use bulk operations feature
3. Review preflight results
4. Execute batch minting

### Token Transfers

#### Standard Transfer
1. Select "Transfer" action
2. Enter sender and recipient addresses
3. Enter transfer amount
4. Select partition
5. Run preflight check
6. Execute transfer

#### Force Transfer (Danger Zone)
1. Go to **Danger Zone** page
2. Select "Force Transfer" action
3. Enter all required parameters
4. Complete two-operator confirmation
5. Execute transfer

### Burning Tokens
1. Select "Burn" action
2. Enter wallet address
3. Enter amount to burn
4. Provide reason
5. Run preflight check
6. Execute burn

---

## 💰 Payout Management

### Creating a Snapshot

#### Manual Snapshot
1. Go to **Payouts** page
2. Click "Create Snapshot"
3. Review current holder list
4. Confirm snapshot creation
5. Note the snapshot ID

#### Automated Snapshot
```bash
# Create snapshot via API
curl -X POST http://localhost:3001/api/payouts/snapshot \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"propertyId": "prop_123", "description": "Q1 Distribution"}'
```

### Funding Payouts

#### Fund with USDC
1. Ensure sufficient USDC balance
2. Go to **Payouts** page
3. Select snapshot to fund
4. Enter funding amount
5. Select distribution mode:
   - **FULL**: Distribute to all holders
   - **PRO_RATA**: Proportional distribution
6. Confirm funding

#### Check Funding Status
- View funding status in payout details
- Monitor USDC balance
- Check for underfunded scenarios

### Executing Distributions

#### Standard Distribution
1. Select funded snapshot
2. Click "Distribute" button
3. Review distribution details
4. Confirm execution
5. Monitor transaction status

#### Emergency Distribution
1. Go to **Danger Zone** page
2. Select "Emergency Payout" action
3. Complete two-operator confirmation
4. Execute distribution

---

## 📊 Event Monitoring

### Viewing Events

#### Real-time Events
1. Go to **Events** page
2. Use filters to narrow down events:
   - Event type (Transfer, Mint, Payout, etc.)
   - Date range
   - Address search
3. Monitor live updates

#### Event Search
- Search by transaction hash
- Filter by wallet address
- Search by event type
- Date range filtering

### Exporting Data

#### CSV Export
1. Apply desired filters
2. Click "Export" button
3. Select CSV format
4. Download file

#### API Export
```bash
# Export events via API
curl -X GET "http://localhost:3001/api/events/export?format=csv&type=TRANSFER" \
  -H "Authorization: Bearer <token>" \
  -o events.csv
```

---

## 🚨 Emergency Procedures

### System Pause/Unpause

#### Pause System
1. Go to **Danger Zone** page
2. Select "Pause System" action
3. Enter reason for pause
4. Complete two-operator confirmation
5. System pauses all operations

#### Unpause System
1. Select "Unpause System" action
2. Confirm system is ready
3. Complete two-operator confirmation
4. System resumes operations

### Wallet Freeze/Unfreeze

#### Freeze Wallet
1. Go to **Compliance** page
2. Find target wallet
3. Click "Freeze" button
4. Enter reason
5. Confirm freeze action

#### Unfreeze Wallet
1. Find frozen wallet
2. Click "Unfreeze" button
3. Enter reason for unfreeze
4. Confirm unfreeze action

### Emergency Token Recovery

#### Force Transfer
1. Go to **Danger Zone** page
2. Select "Force Transfer" action
3. Enter source and destination addresses
4. Enter amount to transfer
5. Complete two-operator confirmation
6. Execute force transfer

---

## 🔧 System Maintenance

### Daily Checks

#### Morning Checklist
- [ ] Check system status (Overview page)
- [ ] Verify contract connectivity
- [ ] Review overnight events
- [ ] Check for failed transactions
- [ ] Monitor gas prices

#### Evening Checklist
- [ ] Review daily activity
- [ ] Check system health
- [ ] Verify backup systems
- [ ] Update documentation
- [ ] Plan next day operations

### Weekly Maintenance

#### System Health
- [ ] Review system performance metrics
- [ ] Check database health
- [ ] Verify backup integrity
- [ ] Update security patches
- [ ] Review access logs

#### Compliance Review
- [ ] Audit investor compliance status
- [ ] Review transfer patterns
- [ ] Check for suspicious activity
- [ ] Update compliance rules if needed

### Monthly Tasks

#### Security Review
- [ ] Rotate API keys
- [ ] Review access permissions
- [ ] Update security policies
- [ ] Conduct security audit
- [ ] Test emergency procedures

#### Performance Optimization
- [ ] Analyze system performance
- [ ] Optimize database queries
- [ ] Update dependencies
- [ ] Review gas optimization
- [ ] Plan capacity upgrades

---

## 📈 Monitoring & Alerts

### System Monitoring

#### Health Checks
```bash
# Check contract status
pnpm run health:contracts

# Check API status
pnpm run health:api

# Check database status
pnpm run health:database
```

#### Log Monitoring
```bash
# View real-time logs
tail -f logs/system.log

# View error logs
tail -f logs/error.log

# View transaction logs
tail -f logs/transactions.log
```

### Alert Configuration

#### Slack Alerts
- System pause/unpause events
- Failed transactions
- High gas price alerts
- Security violations
- Compliance violations

#### Email Alerts
- Daily system reports
- Weekly compliance summaries
- Monthly performance reports
- Emergency notifications

---

## 🛠️ Troubleshooting

### Common Issues

#### "Transaction Failed" Error
1. Check gas price and limit
2. Verify wallet balance
3. Check contract status
4. Review error logs
5. Retry with higher gas

#### "Compliance Violation" Error
1. Check investor compliance status
2. Verify transfer rules
3. Review partition requirements
4. Update compliance if needed

#### "Insufficient Balance" Error
1. Check token balance
2. Verify USDC balance for payouts
3. Check wallet connectivity
4. Refresh balance data

#### "Contract Not Found" Error
1. Verify contract addresses
2. Check network connectivity
3. Update contract addresses
4. Redeploy if necessary

### Recovery Procedures

#### Database Recovery
```bash
# Restore from backup
pnpm run db:restore

# Reset to clean state
pnpm run db:reset

# Migrate to latest schema
pnpm run db:migrate
```

#### Contract Recovery
```bash
# Redeploy contracts
pnpm run deploy:emergency

# Update addresses
pnpm run update:addresses

# Verify deployment
pnpm run verify:all
```

---

## 📚 Best Practices

### Security
- Always use two-operator confirmation for critical operations
- Regularly rotate API keys and passwords
- Monitor access logs for suspicious activity
- Keep software dependencies updated
- Test emergency procedures regularly

### Operations
- Document all significant operations
- Maintain detailed audit trails
- Follow established procedures
- Communicate changes to team
- Keep backups current

### Compliance
- Regularly review investor compliance status
- Monitor transfer patterns for anomalies
- Maintain detailed compliance records
- Update compliance rules as needed
- Document compliance decisions

---

## 🆘 Support

### Internal Support
- **Technical Issues**: Check logs and documentation
- **Operational Questions**: Review this guide
- **Emergency Situations**: Follow emergency procedures

### External Support
- **Smart Contract Issues**: Check Base Sepolia explorer
- **Network Issues**: Contact RPC provider
- **Wallet Issues**: Check MetaMask documentation

---

*Last Updated: January 2024*  
*Version: 1.0.0*
