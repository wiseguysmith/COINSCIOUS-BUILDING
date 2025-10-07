# COINSCIOUS BUILDING - Deployment Guide

## 🚀 Complete Deployment Workflow

This guide covers deploying the COINSCIOUS platform to Base Sepolia testnet for pilot testing.

---

## 📋 Pre-Deployment Checklist

### ✅ Prerequisites
- [ ] Environment variables configured (see [SETUP.md](./SETUP.md))
- [ ] Base Sepolia ETH in deployer wallet (≥0.1 ETH)
- [ ] RPC endpoint accessible
- [ ] All dependencies installed (`pnpm install`)

### ✅ Verification
```bash
# Check wallet balance
pnpm run check-balance

# Verify environment
pnpm run verify-env

# Test RPC connection
pnpm run test-rpc
```

---

## 🏗️ Deployment Order

The platform must be deployed in this specific order due to contract dependencies:

### Phase 1: Core Infrastructure
1. **MockUSDC** - Test token for payouts
2. **ComplianceRegistry** - KYC/AML management
3. **LogAnchor** - Audit trail system

### Phase 2: Token System
4. **SecurityToken** - Main security token
5. **LinearVesting** - Token vesting system
6. **PayoutDistributor** - USDC distribution

### Phase 3: Factories
7. **SecurityTokenFactory** - Token deployment factory
8. **PayoutDistributorFactory** - Distributor factory

---

## 🚀 Automated Deployment

### Option 1: Complete Pilot Deployment
```bash
# Deploy everything in correct order
pnpm run deploy:pilot

# Verify all contracts
pnpm run verify:all
```

### Option 2: Step-by-Step Deployment
```bash
# Step 1: Deploy MockUSDC
pnpm run deploy:mock-usdc

# Step 2: Deploy ComplianceRegistry
pnpm run deploy:compliance

# Step 3: Deploy SecurityToken
pnpm run deploy:security-token

# Step 4: Deploy LinearVesting
pnpm run deploy:vesting

# Step 5: Verify deployment
pnpm run verify:deployment
```

---

## 🔧 Manual Deployment (Advanced)

### Using Foundry Scripts
```bash
cd contracts

# Deploy all contracts
forge script script/Deploy.s.sol \
  --rpc-url base-sepolia \
  --broadcast \
  --verify

# Check deployment status
forge script script/Deploy.s.sol --rpc-url base-sepolia
```

### Using JavaScript Scripts
```bash
# Deploy MockUSDC
node scripts/deploy-mock-usdc.js

# Deploy ComplianceRegistry
node scripts/deploy-compliance-registry.js

# Deploy SecurityToken
node scripts/deploy-security-token.js

# Deploy LinearVesting
node scripts/deploy-linear-vesting.js
```

---

## 📊 Deployment Verification

### 1. Check Contract Addresses
```bash
# View deployed addresses
cat DEPLOYED_ADDRESSES.json

# Verify on Base Sepolia explorer
pnpm run verify:explorer
```

### 2. Test Contract Functions
```bash
# Test basic functionality
pnpm run test:deployment

# Test token operations
pnpm run test:tokens

# Test compliance system
pnpm run test:compliance
```

### 3. Verify on Explorer
- [MockUSDC](https://sepolia.basescan.org/address/[ADDRESS])
- [ComplianceRegistry](https://sepolia.basescan.org/address/[ADDRESS])
- [SecurityToken](https://sepolia.basescan.org/address/[ADDRESS])
- [LinearVesting](https://sepolia.basescan.org/address/[ADDRESS])

---

## 🔍 Post-Deployment Setup

### 1. Update Environment Variables
```bash
# Copy addresses to .env.local
pnpm run update-env

# Verify configuration
pnpm run verify:env
```

### 2. Initialize System
```bash
# Set up initial compliance rules
pnpm run init:compliance

# Create test investor accounts
pnpm run init:investors

# Set up vesting schedules
pnpm run init:vesting
```

### 3. Start Services
```bash
# Start operator console
cd apps/console && pnpm dev

# Start API backend
cd services/api && pnpm dev

# Start event indexer
cd apps/indexer && pnpm dev
```

---

## 🧪 Pilot Testing

### 1. Basic Functionality Test
```bash
# Run comprehensive test suite
pnpm run test:pilot

# Test specific features
pnpm run test:compliance
pnpm run test:tokens
pnpm run test:payouts
```

### 2. End-to-End Workflow
1. **Create Test Investors** - Add compliance records
2. **Mint Tokens** - Distribute to test wallets
3. **Test Transfers** - Verify compliance rules
4. **Create Vesting** - Set up vesting schedules
5. **Test Payouts** - Distribute USDC to holders

### 3. Operator Console Testing
1. **Connect Wallet** - Use MetaMask
2. **Navigate Pages** - Test all 6 console pages
3. **Run Preflight** - Test simulation system
4. **Execute Actions** - Test real transactions

---

## 🚨 Troubleshooting

### Common Deployment Issues

#### "Insufficient gas" error
- **Solution**: Increase gas limit or get more ETH
- **Check**: `pnpm run check-balance`

#### "Contract verification failed"
- **Solution**: Wait 30 seconds and retry
- **Alternative**: Verify manually on explorer

#### "RPC rate limit exceeded"
- **Solution**: Use different RPC endpoint
- **Alternative**: Wait and retry

#### "Contract already deployed"
- **Solution**: Check `DEPLOYED_ADDRESSES.json`
- **Action**: Use existing addresses or redeploy

### Recovery Procedures

#### Rollback Deployment
```bash
# Revert to previous state
git checkout [previous-commit]

# Redeploy from clean state
pnpm run deploy:clean
```

#### Fix Contract Issues
```bash
# Update contract addresses
pnpm run update-addresses

# Re-verify contracts
pnpm run verify:all
```

---

## 📈 Monitoring

### Deployment Health Check
```bash
# Check all contract status
pnpm run health:contracts

# Check API connectivity
pnpm run health:api

# Check database status
pnpm run health:database
```

### Log Monitoring
```bash
# View deployment logs
tail -f logs/deployment.log

# View contract logs
tail -f logs/contracts.log

# View API logs
tail -f logs/api.log
```

---

## 🔐 Security Considerations

### Pre-Deployment
- [ ] Verify all contract addresses
- [ ] Check gas estimates
- [ ] Review constructor parameters
- [ ] Validate ownership transfers

### Post-Deployment
- [ ] Transfer ownership to multisig
- [ ] Verify contract source code
- [ ] Test emergency functions
- [ ] Set up monitoring alerts

---

## 📚 Next Steps

1. **Test Platform**: Follow [OPERATIONS.md](./OPERATIONS.md)
2. **API Integration**: Check [API.md](./API.md)
3. **Monitor System**: Set up alerts and monitoring

---

## 🆘 Support

- **Deployment Issues**: Check logs in `/logs` folder
- **Contract Issues**: Verify on Base Sepolia explorer
- **Environment Issues**: Review [SETUP.md](./SETUP.md)

---

*Last Updated: January 2024*  
*Version: 1.0.0*
