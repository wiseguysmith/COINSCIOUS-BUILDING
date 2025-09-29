# COINSCIOUS Platform

**Partitioned Security Token Platform with ERC-1400-lite Implementation, Compliance Registry, and Comprehensive Operations Logging**

## **Overview**

COINSCIOUS is a comprehensive security token platform built on Base mainnet, featuring:

- **ERC-1400-lite Security Tokens** with REG_D/REG_S partitions and UUPS upgradeability
- **Compliance Registry** for KYC/Accreditation management
- **Automated Payout Distributor** with USDC integration
- **Admin Action Log** with daily Merkle root anchoring
- **Factory Pattern** for scalable token deployment
- **Timelock Controller** for secure governance
- **Tokenomics Modules**: Vesting, Mint/Burn Manager, Treasury, and NAV Oracle

## **Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                    COINSCIOUS PLATFORM                         │
├─────────────────────────────────────────────────────────────────┤
│  Smart Contracts (Solidity)                                   │
│  ├── SecurityTokenV2 (ERC-1400-lite + UUPS)                   │
│  ├── ComplianceRegistry (KYC/Accred)                          │
│  ├── PayoutDistributor (USDC Automation)                      │
│  ├── Factories (EIP-1167 Clones)                              │
│  ├── LogAnchor (Merkle Root Storage)                          │
│  ├── Vesting (4-year + 1-year cliff)                          │
│  ├── MintBurnManager (Role-based minting/burning)             │
│  ├── Treasury (Reserve management)                            │
│  └── NAVOracle (Net Asset Value tracking)                     │
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

### **Tokenomics & Real Estate Integration**
- **Vesting System**: 4-year vesting with 1-year cliff for founders/team
- **Mint/Burn Manager**: Controlled token creation for property deeds
- **Treasury Management**: Reserve token handling for buybacks and partnerships
- **NAV Oracle**: Net Asset Value tracking for property valuations
- **UUPS Upgradeability**: Future-proof token contract architecture

## **Tokenomics Lifecycle**

The COINSCIOUS platform follows a comprehensive lifecycle for real estate tokenization:

### **1. Property Deed Approval → Token Minting**
```
Property Deed Approved → MintBurnManager.mint() → SecurityToken.mintByPartition()
```
- Property deeds are evaluated and approved by compliance team
- Tokens are minted to approved investors via `MintBurnManager`
- Tokens are allocated to appropriate partitions (REG_D for accredited, REG_S for non-US)
- All minting operations require `MINTER_ROLE` authorization

### **2. Founder/Team Token Vesting**
```
Founder Tokens → Vesting.createVestingSchedule() → Linear Release Over 4 Years
```
- Founder and team tokens are locked in `Vesting` contract
- 4-year vesting schedule with 1-year cliff period
- Tokens release linearly after cliff period
- Vesting schedules can be revoked if marked as revocable

### **3. Treasury Reserve Management**
```
Reserve Tokens → Treasury.sendTokens() → Buybacks/Partnerships/Liquidity
```
- Treasury holds reserve tokens for strategic operations
- Multi-sig controlled spending with daily/monthly limits
- Supports buybacks, partnership payments, and liquidity provision
- All transactions are logged and auditable

### **4. NAV Tracking & Valuation**
```
Property Valuations → NAVOracle.setNAV() → Dashboard Integration
```
- Net Asset Value (NAV) is set manually via `NAVOracle`
- Future integration with Chainlink price feeds planned
- NAV updates have frequency limits and change validation
- Confidence levels and source tracking for transparency

### **5. Token Redemption/Exit**
```
Redemption Request → MintBurnManager.burn() → Treasury Payment
```
- Tokens can be burned when properties are sold or redeemed
- Burning requires `BURNER_ROLE` authorization
- Treasury handles USDC payouts to redeeming holders
- All burn operations are logged with reasons

### **Role-Based Access Control**
- **MINTER_ROLE**: Authorized to mint tokens for property deeds
- **BURNER_ROLE**: Authorized to burn tokens for redemptions
- **TREASURY_ROLE**: Authorized to manage reserve token operations
- **ORACLE_ROLE**: Authorized to update NAV values
- **CONTROLLER_ROLE**: Authorized for force transfers and compliance actions

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
