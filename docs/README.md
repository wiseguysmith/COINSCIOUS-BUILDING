# COINSCIOUS BUILDING - Documentation

## 📚 Complete Documentation Suite

This directory contains comprehensive documentation for the COINSCIOUS security token platform.

---

## 🚀 Quick Start

### For New Users
1. **[SETUP.md](./SETUP.md)** - Get started with installation and configuration
2. **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deploy the platform to testnet
3. **[OPERATIONS.md](./OPERATIONS.md)** - Learn day-to-day operations

### For Developers
1. **[API.md](./API.md)** - Complete API reference
2. **[SETUP.md](./SETUP.md)** - Development environment setup
3. **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment procedures

### For Operators
1. **[OPERATIONS.md](./OPERATIONS.md)** - Operational procedures
2. **[API.md](./API.md)** - API integration
3. **[SETUP.md](./SETUP.md)** - System configuration

---

## 📖 Documentation Overview

### [SETUP.md](./SETUP.md)
**Complete setup guide for the COINSCIOUS platform**
- Prerequisites and software requirements
- Step-by-step installation instructions
- Environment configuration
- Development setup
- Troubleshooting common issues

### [DEPLOYMENT.md](./DEPLOYMENT.md)
**Comprehensive deployment guide for testnet and mainnet**
- Pre-deployment checklist
- Automated and manual deployment procedures
- Contract verification
- Post-deployment setup
- Monitoring and health checks

### [API.md](./API.md)
**Complete API reference and integration guide**
- Authentication and authorization
- All API endpoints with examples
- Request/response formats
- Error handling
- SDK examples for multiple languages

### [OPERATIONS.md](./OPERATIONS.md)
**Day-to-day operations and maintenance guide**
- Investor management procedures
- Token operations workflows
- Payout management
- Event monitoring
- Emergency procedures
- System maintenance

---

## 🎯 Platform Overview

The COINSCIOUS platform is a comprehensive security token management system designed for real estate tokenization. It provides:

### Core Features
- **Security Token Management** - ERC-1400-lite compliant tokens
- **Compliance System** - KYC/AML and investor management
- **Payout Distribution** - Automated USDC distribution to holders
- **Vesting System** - Configurable token vesting schedules
- **Operator Console** - Complete web-based management interface

### Technical Stack
- **Smart Contracts** - Solidity with Foundry
- **Frontend** - Next.js 14 with TypeScript
- **Backend** - Fastify API with Prisma
- **Database** - PostgreSQL
- **Blockchain** - Base Sepolia (testnet) / Base (mainnet)

---

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Operator      │    │   API Backend   │    │   Smart         │
│   Console       │◄──►│   (Fastify)     │◄──►│   Contracts     │
│   (Next.js)     │    │                 │    │   (Foundry)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Event         │    │   Database      │    │   Base          │
│   Indexer       │    │   (PostgreSQL)  │    │   Blockchain    │
│   (Node.js)     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🚀 Getting Started

### 1. Setup (5 minutes)
```bash
git clone https://github.com/wiseguysmith/COINSCIOUS-BUILDING.git
cd COINSCIOUS-BUILDING
pnpm install
cp .env.example .env.local
# Edit .env.local with your values
```

### 2. Deploy (10 minutes)
```bash
pnpm run deploy:pilot
pnpm run verify:all
```

### 3. Start Services (2 minutes)
```bash
# Terminal 1: Console
cd apps/console && pnpm dev

# Terminal 2: API
cd services/api && pnpm dev

# Terminal 3: Indexer
cd apps/indexer && pnpm dev
```

### 4. Access Platform
- **Operator Console**: http://localhost:3000
- **API Documentation**: http://localhost:3001/docs
- **Health Check**: http://localhost:3001/api/health

---

## 📊 Current Status

### Implementation Progress
- **Smart Contracts**: ✅ 100% Complete
- **Operator Console**: ✅ 100% Complete
- **API Backend**: ✅ 100% Complete
- **Event Indexer**: 🔄 80% Complete
- **CI/CD Pipeline**: 🔄 60% Complete
- **Documentation**: ✅ 100% Complete

### Pilot Readiness
- **Contract Deployment**: ✅ Ready
- **Operator Interface**: ✅ Ready
- **Compliance System**: ✅ Ready
- **Payout System**: ✅ Ready
- **Monitoring**: ✅ Ready

---

## 🔧 Development

### Project Structure
```
COINSCIOUS BUILDING/
├── apps/
│   ├── console/          # Next.js operator interface
│   └── indexer/          # Event monitoring worker
├── contracts/            # Smart contracts (Foundry)
├── services/
│   └── api/              # Fastify backend API
├── config/               # Configuration files
├── docs/                 # This documentation
└── scripts/              # Deployment and utility scripts
```

### Key Commands
```bash
# Development
pnpm dev                  # Start all services
pnpm build                # Build all packages
pnpm test                 # Run all tests

# Deployment
pnpm run deploy:pilot     # Deploy to testnet
pnpm run verify:all       # Verify contracts
pnpm run health:check     # Check system health

# Database
pnpm run db:migrate       # Run migrations
pnpm run db:seed          # Seed test data
pnpm run db:reset         # Reset database
```

---

## 🛡️ Security

### Security Features
- **Two-Operator Confirmation** - Critical operations require dual approval
- **Preflight Simulation** - All actions simulated before execution
- **Compliance Enforcement** - Automatic compliance rule enforcement
- **Audit Trail** - Complete transaction and action logging
- **Access Control** - Role-based permissions system

### Security Best Practices
- Regular security audits
- Automated vulnerability scanning
- Secure key management
- Encrypted communications
- Regular security updates

---

## 📈 Monitoring

### System Monitoring
- **Contract Health** - Real-time contract status monitoring
- **API Performance** - Response time and error rate tracking
- **Database Health** - Connection and query performance
- **Blockchain Connectivity** - RPC endpoint monitoring

### Alerting
- **Slack Integration** - Real-time notifications
- **Email Alerts** - Critical system alerts
- **Dashboard Monitoring** - Visual system status
- **Log Aggregation** - Centralized logging

---

## 🆘 Support

### Getting Help
1. **Check Documentation** - Review relevant docs first
2. **Check Logs** - Look for error messages in logs
3. **GitHub Issues** - Create an issue for bugs
4. **Community** - Join our Discord for support

### Common Issues
- **Setup Issues** - See [SETUP.md](./SETUP.md#troubleshooting)
- **Deployment Issues** - See [DEPLOYMENT.md](./DEPLOYMENT.md#troubleshooting)
- **API Issues** - See [API.md](./API.md#error-handling)
- **Operations Issues** - See [OPERATIONS.md](./OPERATIONS.md#troubleshooting)

---

## 📝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Update documentation
6. Submit a pull request

### Code Standards
- TypeScript for all new code
- Comprehensive test coverage
- Clear documentation
- Security-first approach
- Performance optimization

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenZeppelin** - Smart contract libraries
- **Base Network** - Blockchain infrastructure
- **Next.js Team** - Frontend framework
- **Fastify Team** - Backend framework
- **Prisma Team** - Database toolkit

---

*Last Updated: January 2024*  
*Version: 1.0.0*  
*Documentation Version: 1.0.0*