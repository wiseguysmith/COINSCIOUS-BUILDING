# 🚀 COINSCIOUS Platform - Complete Deployment System

## 📋 **Quick Start**

### **1. Deploy Everything (One Command)**
```bash
# Deploy complete system to Base Sepolia with verification and services
pnpm run deploy:complete
```

### **2. Check Deployment Status**
```bash
# Check current deployment status
pnpm run status:check
```

### **3. Verify Contracts**
```bash
# Verify all contracts on Etherscan
pnpm run verify:contracts
```

---

## 🔧 **Available Commands**

### **Deployment Commands**
```bash
# Complete system deployment
pnpm run deploy:complete              # Base Sepolia + verify + start services
pnpm run deploy:complete:staging      # Base Sepolia + verify only
pnpm run deploy:complete:production   # Base Mainnet + verify + start services

# Individual contract deployment
pnpm run deploy:sepolia               # Deploy contracts to Base Sepolia
pnpm run deploy:mainnet               # Deploy contracts to Base Mainnet
pnpm run deploy:test                  # Deploy test contracts locally
```

### **Verification Commands**
```bash
pnpm run verify:deployment            # Verify deployment integrity
pnpm run verify:contracts             # Verify contracts on Etherscan
pnpm run status:check                 # Check deployment status
```

### **Testing Commands**
```bash
pnpm run test:contracts               # Run smart contract tests
pnpm run test:contracts:coverage      # Run tests with coverage
pnpm run test:contracts:gas           # Run tests with gas reporting
pnpm run smoke-test                   # Run smoke tests
```

---

## 🏗️ **Deployment Architecture**

### **Smart Contracts**
- **MockUSDC**: Test token for pilot transactions
- **ComplianceRegistry**: Investor compliance and accreditation tracking
- **SecurityToken**: ERC-1400-lite compliant security token
- **LinearVesting**: Configurable vesting with cliff periods
- **PayoutDistributorFactory**: Factory for payout distribution contracts
- **SecurityTokenFactory**: Factory for security token deployment

### **Frontend Applications**
- **Operator Console**: Next.js application for platform management
- **Event Indexer**: Real-time blockchain event processing
- **API Services**: Backend services for data management

### **Infrastructure**
- **Database**: PostgreSQL for data persistence
- **Monitoring**: Comprehensive observability system
- **Alerting**: Slack and email notifications
- **Documentation**: Complete operational procedures

---

## 📊 **Deployment Status Dashboard**

### **Current Status**
- **Network**: Base Sepolia Testnet
- **Deployer**: `0x57F6251028d290730CeE7E622b2967e36Fd7D00a`
- **Deployment Date**: January 2024

### **Contract Status**
| Contract | Status | Address | Verified |
|----------|--------|---------|----------|
| MockUSDC | ✅ Deployed | `0x33df6a1516cd45e1f4afbf55dd228613cc7139fa` | ✅ Yes |
| ComplianceRegistry | ✅ Deployed | `0xCC602E09ab7961d919A1b0bb6a4452a9F860d488` | ✅ Yes |
| SecurityToken | 🚧 In Progress | `TBD` | ❌ No |
| LinearVesting | 🚧 In Progress | `TBD` | ❌ No |
| PayoutDistributorFactory | ❌ Not Deployed | `TBD` | ❌ No |
| SecurityTokenFactory | ❌ Not Deployed | `TBD` | ❌ No |

### **Service Status**
| Service | Status | Port | Health |
|---------|--------|------|--------|
| Operator Console | ❌ Not Running | 3000 | ❌ Unhealthy |
| Event Indexer | ❌ Not Running | 3001 | ❌ Unhealthy |
| API Service | ❌ Not Running | 3002 | ❌ Unhealthy |

---

## 🚀 **Deployment Process**

### **Phase 1: Smart Contract Deployment**
1. **Compile Contracts**
   ```bash
   cd contracts && forge build
   ```

2. **Deploy in Order**
   - MockUSDC (independent)
   - ComplianceRegistry (independent)
   - SecurityToken (requires ComplianceRegistry)
   - LinearVesting (requires SecurityToken)
   - PayoutDistributorFactory (independent)
   - SecurityTokenFactory (independent)

3. **Verify Contracts**
   ```bash
   forge verify-contract <ADDRESS> <CONTRACT> --chain-id 84532 --etherscan-api-key $ETHERSCAN_API_KEY
   ```

### **Phase 2: Environment Configuration**
1. **Update Environment Variables**
   ```bash
   cp deployment/.env.example .env
   # Edit .env with your configuration
   ```

2. **Configure Contract Addresses**
   - Update all contract addresses in environment
   - Verify RPC URLs and API keys
   - Configure database connection

### **Phase 3: Service Deployment**
1. **Start Event Indexer**
   ```bash
   cd apps/indexer && npm start
   ```

2. **Start API Services**
   ```bash
   cd services/api && npm start
   ```

3. **Start Operator Console**
   ```bash
   cd apps/console && npm run dev
   ```

---

## 🔍 **Verification & Testing**

### **Contract Verification**
```bash
# Verify all contracts
pnpm run verify:contracts

# Check deployment status
pnpm run status:check

# Run contract tests
pnpm run test:contracts
```

### **Service Health Checks**
```bash
# Check indexer health
curl -X GET http://localhost:3001/health

# Check API health
curl -X GET http://localhost:3002/health

# Check console
curl -X GET http://localhost:3000
```

### **End-to-End Testing**
```bash
# Run smoke tests
pnpm run smoke-test

# Run integration tests
pnpm run test:integration
```

---

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **Contract Deployment Fails**
```bash
# Check gas prices
cast gas-price --rpc-url $RPC_URL_BASE_SEPOLIA

# Increase gas limit
forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL_BASE_SEPOLIA --private-key $PRIVATE_KEY --broadcast --gas-limit 10000000
```

#### **Service Won't Start**
```bash
# Check logs
tail -f logs/application.log

# Check environment variables
pnpm run status:check

# Restart services
pm2 restart all
```

#### **Database Connection Issues**
```bash
# Check database status
pg_isready -h localhost -p 5432

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

---

## 📚 **Documentation**

### **Deployment Guides**
- [Complete Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)
- [Setup Instructions](./docs/SETUP.md)
- [API Documentation](./docs/API.md)
- [Operations Manual](./docs/OPERATIONS.md)

### **Smart Contract Documentation**
- [Contract Architecture](./contracts/README.md)
- [Security Audit](./audit/security-token-code-review.md)
- [Threat Model](./THREAT_MODEL.md)

---

## 🚨 **Emergency Procedures**

### **System Pause**
```bash
# Use Danger Zone in Operator Console
# Requires two-operator confirmation
```

### **Rollback Procedures**
```bash
# Rollback to previous version
git checkout <previous-commit>
pnpm run deploy:complete:staging
```

### **Emergency Contacts**
- **DevOps**: devops@coinscious.com
- **Security**: security@coinscious.com
- **CTO**: cto@coinscious.com

---

## 📊 **Monitoring & Alerts**

### **Health Endpoints**
- **Indexer**: http://localhost:3001/health
- **API**: http://localhost:3002/health
- **Console**: http://localhost:3000

### **Alert Channels**
- **Slack**: #alerts channel
- **Email**: alerts@coinscious.com
- **Dashboard**: Real-time monitoring

---

## 🎯 **Next Steps**

### **Immediate Actions**
1. ✅ Deploy complete system to Base Sepolia
2. ✅ Verify all contracts on Etherscan
3. ✅ Configure monitoring and alerting
4. ✅ Run end-to-end tests

### **Production Readiness**
1. 🔄 Complete security audit
2. 🔄 Performance optimization
3. 🔄 Load testing
4. 🔄 Disaster recovery testing

---

**Document Version**: 1.0  
**Last Updated**: January 2024  
**Next Review**: April 2024  
**Classification**: Internal Use  
**Approved By**: CTO  
**Distribution**: DevOps Team, Platform Operators
