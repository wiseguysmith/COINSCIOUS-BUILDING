# COINSCIOUS Platform Deployment Guide

## 🎯 Deployment Checklist Status

✅ **All tests passing (100% success rate)**  
✅ **Gas report generated**  
✅ **ABI surface frozen**  
⏳ **Deploy to Base Sepolia**  
⏳ **Run smoke tests**  
⏳ **Lock operational safety rails**  
⏳ **Set up CI gates**  
⏳ **Complete API integration**  
⏳ **Create operator runbook**  

## 🚀 Quick Deployment to Base Sepolia

### Prerequisites

1. **Environment Setup**
   ```bash
   # Copy the example config
   cp deploy-config.example .env
   
   # Edit .env with your values
   RPC_URL_BASE_SEPOLIA=https://sepolia.base.org
   PRIVATE_KEY=your_private_key_here
   ETHERSCAN_API_KEY=your_etherscan_api_key_here
   ```

2. **Get Base Sepolia ETH**
   - Visit [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
   - Request testnet ETH for deployment

### Deploy Commands

#### Option 1: Test Deployment (Simplified)
```bash
# Deploy with simplified roles (deployer = all roles)
forge script contracts/script/DeployTest.s.sol:DeployTest \
  --rpc-url $RPC_URL_BASE_SEPOLIA \
  --private-key $PRIVATE_KEY \
  --broadcast --verify
```

#### Option 2: Production Deployment (Full Setup)
```bash
# Deploy with proper governance setup
forge script contracts/script/Deploy.s.sol:Deploy \
  --rpc-url $RPC_URL_BASE_SEPOLIA \
  --private-key $PRIVATE_KEY \
  --broadcast --verify
```

### Expected Outputs

After successful deployment, you'll get:
- `deployments/base-sepolia-addresses.json` - Contract addresses
- `audit/addresses.sepolia.json` - Backup addresses file
- Console output with all contract addresses

## 🧪 Smoke Test Checklist

After deployment, run these 5 critical tests:

### 1. Set Claims for Test Wallets
```bash
# Set claims for 2 test wallets (accredited/country flags)
cast send $COMPLIANCE_REGISTRY_ADDRESS "setClaims(address,tuple)" \
  $WALLET1_ADDRESS \
  '("US",true,true,0,false,1735689600)' \
  --rpc-url $RPC_URL_BASE_SEPOLIA \
  --private-key $PRIVATE_KEY
```

### 2. Mint REG_D & REG_S Tokens
```bash
# Mint REG_D tokens
cast send $SECURITY_TOKEN_ADDRESS "mintByPartition(bytes32,address,uint256,bytes)" \
  0x6a03b0013265372b884812b0d3773c026802ac22c12c90268815d185b1917b18 \
  $WALLET1_ADDRESS \
  1000000000000000000000 \
  "" \
  --rpc-url $RPC_URL_BASE_SEPOLIA \
  --private-key $PRIVATE_KEY
```

### 3. Test Transfers
```bash
# Transfer between wallets (expect pass/fails per policy)
cast send $SECURITY_TOKEN_ADDRESS "transferByPartition(bytes32,address,uint256,bytes)" \
  0x6a03b0013265372b884812b0d3773c026802ac22c12c90268815d185b1917b18 \
  $WALLET2_ADDRESS \
  100000000000000000000 \
  "" \
  --rpc-url $RPC_URL_BASE_SEPOLIA \
  --private-key $PRIVATE_KEY
```

### 4. Test Freeze/Unfreeze
```bash
# Freeze wallet
cast send $COMPLIANCE_REGISTRY_ADDRESS "freeze(address)" \
  $WALLET1_ADDRESS \
  --rpc-url $RPC_URL_BASE_SEPOLIA \
  --private-key $PRIVATE_KEY

# Unfreeze wallet
cast send $COMPLIANCE_REGISTRY_ADDRESS "unfreeze(address)" \
  $WALLET1_ADDRESS \
  --rpc-url $RPC_URL_BASE_SEPOLIA \
  --private-key $PRIVATE_KEY
```

### 5. Test Payout Distribution
```bash
# Snapshot → fund → distribute
cast send $PAYOUT_DISTRIBUTOR_ADDRESS "snapshot()" \
  --rpc-url $RPC_URL_BASE_SEPOLIA \
  --private-key $PRIVATE_KEY

# Fund the distributor (if using real USDC)
cast send $USDC_ADDRESS "approve(address,uint256)" \
  $PAYOUT_DISTRIBUTOR_ADDRESS \
  1000000000 \
  --rpc-url $RPC_URL_BASE_SEPOLIA \
  --private-key $PRIVATE_KEY

cast send $PAYOUT_DISTRIBUTOR_ADDRESS "fund(uint256)" \
  1000000000 \
  --rpc-url $RPC_URL_BASE_SEPOLIA \
  --private-key $PRIVATE_KEY

cast send $PAYOUT_DISTRIBUTOR_ADDRESS "distribute(uint256)" \
  0 \
  --rpc-url $RPC_URL_BASE_SEPOLIA \
  --private-key $PRIVATE_KEY
```

## 🔒 Operational Safety Rails

### Pausable Functions
- ✅ All contracts have `whenNotPaused` modifiers
- ✅ Global compliance pause available
- ✅ Per-account freeze functionality

### Controller Handover
```bash
# Two-step controller handover
cast send $SECURITY_TOKEN_ADDRESS "proposeController(address)" \
  $NEW_CONTROLLER_ADDRESS \
  --rpc-url $RPC_URL_BASE_SEPOLIA \
  --private-key $PRIVATE_KEY

# Accept from new controller
cast send $SECURITY_TOKEN_ADDRESS "acceptController()" \
  --rpc-url $RPC_URL_BASE_SEPOLIA \
  --private-key $NEW_CONTROLLER_PRIVATE_KEY
```

### Rescue Functions
```bash
# Rescue accidentally sent tokens
cast send $SECURITY_TOKEN_ADDRESS "rescueERC20(address,address,uint256)" \
  $TOKEN_ADDRESS \
  $RECIPIENT_ADDRESS \
  $AMOUNT \
  --rpc-url $RPC_URL_BASE_SEPOLIA \
  --private-key $PRIVATE_KEY
```

## 📊 Gas Report Summary

Key gas costs from our baseline:
- **ComplianceRegistry**: ~1.5M gas deployment
- **SecurityToken**: ~2.7M gas deployment  
- **PayoutDistributor**: ~1.3M gas deployment
- **LogAnchor**: ~460K gas deployment
- **SecurityTokenFactory**: ~920K gas deployment

## 🎯 Go/No-Go Checklist

Before calling this MVP on testnet:

- [ ] Deploy script wrote both address files and they match
- [ ] Gas report saved to `audit/gas-report-contracts.txt`
- [ ] Smoke test passed (claims → mint → transfer → freeze/unfreeze → payout)
- [ ] Controller handover proven with a second wallet
- [ ] CI is red-line enforced (tests, coverage, slither)
- [ ] Runbook exists and is up to date

## 🚨 Emergency Procedures

### Global Pause
```bash
cast send $COMPLIANCE_REGISTRY_ADDRESS "pause()" \
  --rpc-url $RPC_URL_BASE_SEPOLIA \
  --private-key $PRIVATE_KEY
```

### Freeze Specific Wallet
```bash
cast send $COMPLIANCE_REGISTRY_ADDRESS "freeze(address)" \
  $WALLET_ADDRESS \
  --rpc-url $RPC_URL_BASE_SEPOLIA \
  --private-key $PRIVATE_KEY
```

### Emergency Withdraw
```bash
cast send $PAYOUT_DISTRIBUTOR_ADDRESS "emergencyWithdraw()" \
  --rpc-url $RPC_URL_BASE_SEPOLIA \
  --private-key $PRIVATE_KEY
```

---

**Status**: Ready for Base Sepolia deployment! 🚀

