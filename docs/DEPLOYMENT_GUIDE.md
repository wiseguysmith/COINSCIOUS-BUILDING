# COINSCIOUS Platform - Complete Deployment Guide

## 🎯 **Overview**

This guide provides step-by-step instructions for deploying the complete COINSCIOUS platform to Base Sepolia testnet. The deployment includes all smart contracts, frontend applications, backend services, and monitoring systems.

**Target Audience**: DevOps engineers, platform operators, and deployment personnel  
**Document Version**: 1.0  
**Last Updated**: January 2024  
**Classification**: Internal Use

---

## 📋 **Prerequisites**

### **System Requirements**
- Node.js 18+ and npm/pnpm
- Git
- Foundry (for smart contract compilation)
- PostgreSQL 13+
- Docker (optional, for containerized deployment)

### **Blockchain Requirements**
- Base Sepolia testnet ETH (get from [Base Sepolia Faucet](https://bridge.base.org/deposit))
- Etherscan API key (for contract verification)
- Private key with sufficient ETH for gas fees

### **External Services**
- Slack workspace (for alerts)
- Email service (SMTP configuration)
- Database hosting (PostgreSQL)

---

## 🚀 **Quick Start Deployment**

### **1. Environment Setup**

```bash
# Clone the repository
git clone https://github.com/your-org/COINSCIOUS-BUILDING.git
cd COINSCIOUS-BUILDING

# Install dependencies
pnpm install

# Install Foundry (if not already installed)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Copy environment template
cp deployment/.env.example .env
```

### **2. Configure Environment Variables**

Edit `.env` file with your configuration:

```bash
# Blockchain Configuration
RPC_URL_BASE_SEPOLIA=https://sepolia.base.org
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/coinscious

# Monitoring & Alerting
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### **3. Deploy Complete System**

```bash
# Deploy everything with verification and service startup
node deployCompleteSystem.js --network=base-sepolia --verify --start-services
```

This single command will:
- ✅ Compile all smart contracts
- ✅ Deploy contracts in proper order
- ✅ Verify contracts on Etherscan
- ✅ Update deployment addresses
- ✅ Configure environment
- ✅ Start all services

---

## 🔧 **Detailed Deployment Steps**

### **Step 1: Smart Contract Deployment**

#### **1.1 Compile Contracts**
```bash
cd contracts
forge build
```

#### **1.2 Deploy Contracts (Manual)**
```bash
# Deploy MockUSDC
forge script script/DeployMockUSDC.s.sol:DeployMockUSDC --rpc-url $RPC_URL_BASE_SEPOLIA --private-key $PRIVATE_KEY --broadcast

# Deploy ComplianceRegistry
forge script script/Deploy.s.sol:DeployComplianceRegistry --rpc-url $RPC_URL_BASE_SEPOLIA --private-key $PRIVATE_KEY --broadcast

# Deploy SecurityToken (requires ComplianceRegistry address)
forge script script/Deploy.s.sol:DeploySecurityToken --rpc-url $RPC_URL_BASE_SEPOLIA --private-key $PRIVATE_KEY --broadcast

# Deploy LinearVesting (requires SecurityToken address)
forge script script/Deploy.s.sol:DeployLinearVesting --rpc-url $RPC_URL_BASE_SEPOLIA --private-key $PRIVATE_KEY --broadcast
```

#### **1.3 Verify Contracts**
```bash
# Verify all contracts on Etherscan
forge verify-contract <CONTRACT_ADDRESS> <CONTRACT_NAME> --chain-id 84532 --etherscan-api-key $ETHERSCAN_API_KEY
```

### **Step 2: Database Setup**

#### **2.1 Create Database**
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE coinscious;

-- Create user
CREATE USER coinscious_user WITH PASSWORD 'secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE coinscious TO coinscious_user;
```

#### **2.2 Run Migrations**
```bash
cd apps/indexer
npm run db:migrate
```

### **Step 3: Backend Services Deployment**

#### **3.1 Event Indexer**
```bash
cd apps/indexer
npm install
npm run build
npm start
```

#### **3.2 API Services**
```bash
cd services/api
npm install
npm run build
npm start
```

### **Step 4: Frontend Deployment**

#### **4.1 Operator Console**
```bash
cd apps/console
npm install
npm run build
npm start
```

---

## 🐳 **Docker Deployment**

### **Docker Compose Setup**

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: coinscious
      POSTGRES_USER: coinscious_user
      POSTGRES_PASSWORD: secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  indexer:
    build: ./apps/indexer
    environment:
      - DATABASE_URL=postgresql://coinscious_user:secure_password@postgres:5432/coinscious
      - RPC_URL_BASE_SEPOLIA=https://sepolia.base.org
    depends_on:
      - postgres
    restart: unless-stopped

  console:
    build: ./apps/console
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
    restart: unless-stopped

volumes:
  postgres_data:
```

### **Deploy with Docker**
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## 🔍 **Deployment Verification**

### **1. Contract Verification**

```bash
# Check contract deployment
node scripts/verifyDeployment.js

# Verify on Etherscan
forge verify-contract <ADDRESS> <CONTRACT> --chain-id 84532 --etherscan-api-key $ETHERSCAN_API_KEY
```

### **2. Service Health Checks**

```bash
# Check indexer health
curl -X GET http://localhost:3001/health

# Check API health
curl -X GET http://localhost:3002/health

# Check console
curl -X GET http://localhost:3000
```

### **3. Database Verification**

```sql
-- Check tables exist
\dt

-- Check data
SELECT COUNT(*) FROM token_transfers;
SELECT COUNT(*) FROM compliance_actions;
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Contract Deployment Fails**
```bash
# Check gas prices
cast gas-price --rpc-url $RPC_URL_BASE_SEPOLIA

# Increase gas limit
forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL_BASE_SEPOLIA --private-key $PRIVATE_KEY --broadcast --gas-limit 10000000
```

#### **Database Connection Issues**
```bash
# Check database status
pg_isready -h localhost -p 5432

# Check connection string
psql $DATABASE_URL -c "SELECT 1"
```

#### **Indexer Not Processing Events**
```bash
# Check indexer logs
tail -f logs/indexer.log

# Restart indexer
pm2 restart indexer
```

### **Performance Issues**

#### **High Gas Costs**
- Use gas optimization techniques
- Deploy during low network activity
- Use gas price oracles

#### **Slow Database Queries**
- Add proper indexes
- Optimize query patterns
- Consider read replicas

---

## 📊 **Monitoring Setup**

### **1. Health Monitoring**

```bash
# Set up health checks
curl -X GET http://localhost:3001/health | jq

# Monitor logs
tail -f logs/application.log | grep ERROR
```

### **2. Alert Configuration**

```bash
# Test Slack webhook
curl -X POST $SLACK_WEBHOOK_URL -d '{"text":"Test alert from COINSCIOUS"}'

# Test email alerts
node scripts/testEmailAlerts.js
```

### **3. Metrics Collection**

```bash
# View system metrics
curl -X GET http://localhost:3001/metrics

# Check database metrics
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"
```

---

## 🔄 **Update Procedures**

### **Smart Contract Updates**

```bash
# 1. Deploy new contracts
forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL_BASE_SEPOLIA --private-key $PRIVATE_KEY --broadcast

# 2. Update addresses
node scripts/updateAddresses.js

# 3. Verify contracts
forge verify-contract <NEW_ADDRESS> <CONTRACT> --chain-id 84532 --etherscan-api-key $ETHERSCAN_API_KEY
```

### **Application Updates**

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install dependencies
pnpm install

# 3. Build applications
pnpm run build

# 4. Restart services
pm2 restart all
```

---

## 🛡️ **Security Considerations**

### **Pre-Deployment Security**

- [ ] Private keys stored securely
- [ ] Environment variables properly configured
- [ ] Database credentials secured
- [ ] API keys rotated
- [ ] Security audit completed

### **Post-Deployment Security**

- [ ] Monitor for unusual activity
- [ ] Regular security updates
- [ ] Access log review
- [ ] Backup verification
- [ ] Incident response plan

---

## 📞 **Support & Escalation**

### **Deployment Issues**
- **Primary**: DevOps Team (devops@coinscious.com)
- **Secondary**: CTO (cto@coinscious.com)
- **Emergency**: +1-555-DEPLOY-1

### **Contract Issues**
- **Primary**: Smart Contract Team (contracts@coinscious.com)
- **Secondary**: Security Team (security@coinscious.com)
- **Emergency**: +1-555-CONTRACT-1

### **Infrastructure Issues**
- **Primary**: Infrastructure Team (infra@coinscious.com)
- **Secondary**: DevOps Team (devops@coinscious.com)
- **Emergency**: +1-555-INFRA-1

---

## 📚 **Additional Resources**

### **Documentation**
- [Smart Contract Documentation](./contracts/README.md)
- [API Documentation](./docs/API.md)
- [Operator Runbook](./docs/OPERATOR_RUNBOOK.md)
- [Threat Model](./THREAT_MODEL.md)

### **External Links**
- [Base Sepolia Explorer](https://sepolia.basescan.org/)
- [Base Documentation](https://docs.base.org/)
- [Foundry Documentation](https://book.getfoundry.sh/)
- [Etherscan Verification](https://sepolia.basescan.org/verifyContract)

---

**Document Version**: 1.0  
**Last Updated**: January 2024  
**Next Review**: April 2024  
**Classification**: Internal Use  
**Approved By**: CTO  
**Distribution**: DevOps Team, Platform Operators
