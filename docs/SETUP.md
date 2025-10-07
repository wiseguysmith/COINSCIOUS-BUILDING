# COINSCIOUS BUILDING - Setup Guide

## 🚀 Quick Start

This guide will get you from zero to a fully functional COINSCIOUS security token platform on Base Sepolia testnet.

---

## 📋 Prerequisites

### Required Software
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **pnpm** ([Install](https://pnpm.io/installation))
- **Git** ([Download](https://git-scm.com/))
- **MetaMask** or compatible wallet

### Required Accounts
- **Base Sepolia ETH** - Get from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
- **Alchemy/Infura API Key** - For Base Sepolia RPC access
- **Supabase Account** - For database (optional for pilot)

---

## 🛠️ Installation

### 1. Clone Repository
```bash
git clone https://github.com/wiseguysmith/COINSCIOUS-BUILDING.git
cd COINSCIOUS-BUILDING
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Environment Setup
```bash
# Copy environment template
cp .env.example .env.local

# Edit with your values
nano .env.local
```

---

## ⚙️ Environment Configuration

### Required Variables
```bash
# Network Configuration
RPC_URL_BASE_SEPOLIA=https://sepolia.base.org
PRIVATE_KEY=your_wallet_private_key_here

# Contract Addresses (will be populated during deployment)
MOCK_USDC_ADDRESS=
COMPLIANCE_REGISTRY_ADDRESS=
SECURITY_TOKEN_ADDRESS=
LINEAR_VESTING_ADDRESS=

# Database (Optional for pilot)
DATABASE_URL=postgresql://...

# Notifications (Optional for pilot)
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Getting Testnet ETH
1. Visit [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
2. Connect your wallet
3. Request 0.1 ETH (should be enough for pilot)
4. Verify balance in MetaMask

---

## 🏗️ Project Structure

```
COINSCIOUS BUILDING/
├── apps/
│   ├── console/          # Next.js operator interface
│   └── indexer/          # Event monitoring worker
├── contracts/            # Smart contracts (Foundry)
├── services/api/         # Fastify backend API
├── config/               # Configuration files
├── docs/                 # Documentation
└── scripts/              # Deployment scripts
```

---

## 🚀 Development Setup

### 1. Start the Operator Console
```bash
cd apps/console
pnpm dev
```
Visit: http://localhost:3000

### 2. Start the API Backend
```bash
cd services/api
pnpm dev
```
API runs on: http://localhost:3001

### 3. Start the Event Indexer
```bash
cd apps/indexer
pnpm dev
```

---

## 🧪 Testing Setup

### Run Smart Contract Tests
```bash
cd contracts
forge test
```

### Run API Tests
```bash
cd services/api
pnpm test
```

### Run Console Tests
```bash
cd apps/console
pnpm test
```

---

## 🔧 Troubleshooting

### Common Issues

#### "Insufficient balance" error
- **Solution**: Get more Base Sepolia ETH from faucet
- **Check**: `pnpm run check-balance`

#### "Contract not found" error
- **Solution**: Deploy contracts first using deployment guide
- **Check**: Verify addresses in `DEPLOYED_ADDRESSES.json`

#### "RPC connection failed" error
- **Solution**: Check your RPC URL in `.env.local`
- **Alternative**: Use public RPC: `https://sepolia.base.org`

#### "Module not found" error
- **Solution**: Run `pnpm install` in project root
- **Check**: Ensure you're in the correct directory

### Getting Help

1. **Check logs**: Look for error messages in terminal
2. **Verify environment**: Ensure all required variables are set
3. **Check network**: Verify you're on Base Sepolia testnet
4. **Review documentation**: Check other docs in `/docs` folder

---

## 📚 Next Steps

1. **Deploy Contracts**: Follow [DEPLOYMENT.md](./DEPLOYMENT.md)
2. **Test Platform**: Follow [OPERATIONS.md](./OPERATIONS.md)
3. **API Integration**: Check [API.md](./API.md)

---

## 🆘 Support

- **GitHub Issues**: [Create an issue](https://github.com/wiseguysmith/COINSCIOUS-BUILDING/issues)
- **Documentation**: Check `/docs` folder
- **Smart Contract Issues**: Check `contracts/README.md`

---

*Last Updated: January 2024*  
*Version: 1.0.0*
