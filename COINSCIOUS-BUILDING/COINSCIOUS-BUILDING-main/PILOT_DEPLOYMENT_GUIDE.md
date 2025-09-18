# 🚀 COINSCIOUS PILOT DEPLOYMENT GUIDE

## Quick Start Checklist

### Phase 1: Environment Setup (15 minutes)
- [ ] **Install Foundry**: `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- [ ] **Install Node.js 20+**: Download from [nodejs.org](https://nodejs.org)
- [ ] **Get Base Sepolia ETH**: Visit [Base Bridge](https://bridge.base.org/deposit)
- [ ] **Run setup script**: `./setup-pilot.sh`

### Phase 2: Wallet Setup (10 minutes)
- [ ] **Create Deployer Wallet**: Use MetaMask or hardware wallet
- [ ] **Create Gnosis Safe**: Set up multisig at [gnosis-safe.io](https://gnosis-safe.io)
- [ ] **Deploy Timelock Controller**: For governance (optional for pilot)
- [ ] **Deploy Mock USDC**: Or use existing testnet USDC

### Phase 3: Configuration (5 minutes)
- [ ] **Update `deploy.config`**: Fill in your wallet addresses
- [ ] **Create `.env`**: Copy from `env.example` and fill in API keys
- [ ] **Get Etherscan API Key**: Sign up at [etherscan.io](https://etherscan.io)

### Phase 4: Deployment (10 minutes)
- [ ] **Deploy contracts**: `forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast`
- [ ] **Verify contracts**: `forge verify-contract --chain base-sepolia`
- [ ] **Test deployment**: Run integration tests

### Phase 5: Pilot Testing (30 minutes)
- [ ] **Set up test users**: Configure compliance claims
- [ ] **Deploy sample token**: Use factory to create test token
- [ ] **Test transfers**: Verify REG_D/REG_S restrictions work
- [ ] **Test compliance**: Ensure whitelist/revoke functions work

## Detailed Instructions

### 1. Environment Setup

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc
foundryup

# Verify installation
forge --version
cast --version
```

### 2. Get Testnet ETH

1. Visit [Base Bridge](https://bridge.base.org/deposit)
2. Connect your wallet
3. Bridge some ETH from Ethereum mainnet to Base Sepolia
4. You'll need ~0.01 ETH for deployment gas

### 3. Wallet Addresses Needed

You need these addresses for the deployment:

- **DEPLOYER_ADDRESS**: Your wallet that will deploy contracts
- **GNOSIS_SAFE_ADDRESS**: Multisig wallet for contract ownership
- **TIMELOCK_CONTROLLER_ADDRESS**: Governance timelock (can be same as deployer for pilot)
- **MOCK_USDC_ADDRESS**: USDC testnet token address

### 4. API Keys Required

- **ETHERSCAN_API_KEY**: For contract verification
- **ALCHEMY_API_KEY**: Optional, for better RPC access

### 5. Configuration Files

#### deploy.config
```bash
# Copy the example and update
cp deploy.config.example deploy.config

# Edit with your addresses
nano deploy.config
```

#### .env
```bash
# Copy the example and update
cp env.example .env

# Edit with your API keys
nano .env
```

### 6. Deployment Commands

```bash
# Build contracts
forge build

# Run tests
forge test

# Deploy to Base Sepolia
forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast

# Verify contracts (after deployment)
forge verify-contract --chain base-sepolia <CONTRACT_ADDRESS> <CONTRACT_NAME>
```

### 7. Post-Deployment Setup

1. **Set up compliance data**:
   ```solidity
   // Set up test investor claims
   complianceRegistry.setClaims(investor1, Claims({
       countryCode: bytes2("US"),
       accredited: true,
       lockupUntil: 0,
       revoked: false,
       expiresAt: uint64(block.timestamp + 365 days)
   }));
   ```

2. **Deploy sample token**:
   ```solidity
   // Deploy a test security token
   securityTokenFactory.deployToken(
       "Test Property Token",
       "TPT",
       owner,
       controller,
       complianceRegistry
   );
   ```

3. **Test the system**:
   - Mint tokens to test users
   - Test transfers between partitions
   - Verify compliance restrictions work

## Troubleshooting

### Common Issues

1. **"Insufficient funds"**: Get more Base Sepolia ETH
2. **"Contract verification failed"**: Check Etherscan API key
3. **"RPC error"**: Try different RPC endpoint
4. **"Gas estimation failed"**: Increase gas limit

### Getting Help

- Check the test files for usage examples
- Review the contract documentation
- Check Base Sepolia explorer for transaction status

## Security Notes

- **Never commit private keys** to version control
- **Use environment variables** for sensitive data
- **Test thoroughly** before mainnet deployment
- **Keep backup** of all wallet seed phrases

## Next Steps After Pilot

1. **Audit contracts** with professional auditor
2. **Deploy to Base mainnet** when ready
3. **Set up monitoring** and alerting
4. **Configure production** compliance rules
5. **Launch with real** property tokenization

---

**Total Pilot Setup Time: ~1 hour**
**Ready for Production: After audit and testing**
