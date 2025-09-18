# COINSCIOUS Platform

**Partitioned Security Token Platform with ERC-1400-lite Implementation, Compliance Registry, and Comprehensive Operations Logging**

## **Overview**

COINSCIOUS is a comprehensive security token platform built on Base mainnet, featuring:

- **ERC-1400-lite Security Tokens** with REG_D/REG_S partitions
- **Compliance Registry** for KYC/Accreditation management
- **Automated Payout Distributor** with USDC integration
- **Admin Action Log** with daily Merkle root anchoring
- **Factory Pattern** for scalable token deployment
- **Timelock Controller** for secure governance

## **Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                    COINSCIOUS PLATFORM                         │
├─────────────────────────────────────────────────────────────────┤
│  Smart Contracts (Solidity)                                   │
│  ├── SecurityToken (ERC-1400-lite)                            │
│  ├── ComplianceRegistry (KYC/Accred)                          │
│  ├── PayoutDistributor (USDC Automation)                      │
│  ├── Factories (EIP-1167 Clones)                              │
│  └── LogAnchor (Merkle Root Storage)                          │
├─────────────────────────────────────────────────────────────────┤
│  API Layer (Fastify + Prisma)                                 │
│  ├── RESTful Endpoints                                        │
│  ├── HMAC-Signed Webhooks                                     │
│  ├── JWT Authentication                                       │
│  └── Idempotency Protection                                   │
├─────────────────────────────────────────────────────────────────┤
│  Operations Logging                                           │
│  ├── Append-Only Admin Actions                                │
│  ├── Daily Merkle Root Anchoring                              │
│  └── Immutable Audit Trail                                    │
└─────────────────────────────────────────────────────────────────┘
```

## **Features**

### **Security & Compliance**
- **Reg D Support**: Accredited investor verification
- **Reg S Support**: Non-US person compliance
- **KYC Integration**: Alloy/Parallel integration ready
- **Lockup Enforcement**: Time-based transfer restrictions
- **Whitelist Management**: Oracle-controlled compliance

### **Scalability**
- **Factory Pattern**: EIP-1167 minimal proxy clones
- **Batched Payouts**: Support for 250+ holders
- **Pro-rata Distribution**: Underfunded scenario handling
- **Gas Optimization**: Efficient batch processing

### **Governance**
- **Timelock Controller**: Delayed execution for critical operations
- **Multi-sig Support**: Gnosis Safe integration ready
- **Role-based Access**: OpenZeppelin AccessControl
- **Emergency Procedures**: Force transfer capabilities

## **Quick Start**

### **Prerequisites**
- [Foundry](https://getfoundry.sh/) (latest version)
- [Node.js](https://nodejs.org/) (v18+)
- [PostgreSQL](https://www.postgresql.org/) (v13+)

### **Installation**
```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/COINSCIOUS-PLATFORM.git
cd COINSCIOUS-PLATFORM

# Install Foundry dependencies
forge install

# Install Node.js dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration
```

### **Development**
```bash
# Start local blockchain
anvil

# In another terminal, run tests
forge test

# Run with gas reporting
forge test --gas-report

# Deploy to local network
forge script script/Deploy.s.sol:Deploy --rpc-url http://localhost:8545 --broadcast
```

### **Testing**
```bash
# Run all tests
forge test

# Run specific test file
forge test --match-path test/SecurityToken.t.sol

# Run with verbose output
forge test --verbosity 2

# Generate coverage report
forge coverage
```

## **Contract Addresses**

### **Base Sepolia (Testnet)**
See [`/audit/addresses.sepolia.json`](./audit/addresses.sepolia.json) for deployed contract addresses.

### **Base Mainnet**
*Coming soon after audit completion*

## **Audit & Security**

### **Audit Status**
- **Current Phase**: Pilot Readiness Audit
- **Audit Scope**: Smart Contracts + API + Operations Logging
- **Target**: External audit completion

### **Security Features**
- **Reentrancy Protection**: OpenZeppelin ReentrancyGuard
- **Access Control**: Role-based permissions
- **Timelock Governance**: Delayed execution for critical operations
- **Emergency Pause**: Circuit breaker functionality
- **Compliance Enforcement**: On-chain regulatory compliance

### **Audit Artifacts**
All audit materials are available in the [`/audit`](./audit/) directory:
- [Audit Checklist](./audit/audit-checklist.md)
- [Code Reviews](./audit/)
- [Runbooks](./audit/runbooks/)
- [Test Results](./audit/)

## **Documentation**

### **Technical Documentation**
- [Smart Contract Architecture](./docs/architecture.md)
- [API Reference](./docs/api.md)
- [Deployment Guide](./audit/runbooks/)
- [Security Model](./audit/roles-and-ownership.md)

### **Operational Documentation**
- [Deployment Runbooks](./audit/runbooks/)
- [Incident Response](./audit/runbooks/)
- [Compliance Procedures](./docs/compliance.md)

## **Contributing**

### **Development Workflow**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Code Standards**
- **Solidity**: Follow [Solidity Style Guide](https://docs.soliditylang.org/en/v0.8.20/style-guide.html)
- **Testing**: 100% test coverage required for new features
- **Documentation**: Update relevant docs for all changes
- **Security**: All changes must pass security review

## **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## **Support**

### **Community**
- **Discord**: [COINSCIOUS Community](https://discord.gg/coinscious)
- **Twitter**: [@COINSCIOUS_DAO](https://twitter.com/COINSCIOUS_DAO)
- **Documentation**: [docs.coinscious.com](https://docs.coinscious.com)

### **Security**
- **Security Email**: security@coinscious.com
- **Bug Bounty**: [Immunefi Program](https://immunefi.com/bounty/coinscious)
- **Disclosure Policy**: [SECURITY.md](SECURITY.md)

## **Roadmap**

### **Phase 1: Foundation (Q4 2025)**
- [x] Core smart contracts
- [x] API layer
- [x] Operations logging
- [x] Audit completion

### **Phase 2: Launch (Q1 2026)**
- [ ] Mainnet deployment
- [ ] KYC provider integration
- [ ] First token launch
- [ ] Community governance

### **Phase 3: Scale (Q2 2026)**
- [ ] Multi-chain support
- [ ] Advanced compliance features
- [ ] Institutional integrations
- [ ] Ecosystem expansion

---

**Built with ❤️ by the COINSCIOUS Team**
