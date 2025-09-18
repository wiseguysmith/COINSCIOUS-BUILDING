# How to Reproduce Audit Results

**Document:** Audit Reproduction Guide  
**Created:** August 26, 2025  
**Status:** Requires Foundry Installation  

## Prerequisites

### 1. Install Foundry
```bash
# Install Rust first (required for Foundry)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. Verify Installation
```bash
forge --version
cast --version
anvil --version
```

## Reproducing Smart Contract Tests

### 1. Navigate to Contracts Directory
```bash
cd contracts
```

### 2. Install Dependencies
```bash
forge install
```

### 3. Run All Tests
```bash
forge test -vvv
```

### 4. Generate Gas Report
```bash
forge test -vvv --gas-report > ../audit/gas-report-contracts.txt
```

### 5. Run Specific Test Categories

#### SecurityToken Tests
```bash
forge test --match-contract SecurityTokenTest -vvv
```

#### ComplianceRegistry Tests
```bash
forge test --match-contract ComplianceRegistryTest -vvv
```

#### PayoutDistributor Tests
```bash
forge test --match-contract PayoutDistributorTest -vvv
```

## Reproducing API Tests

### 1. Navigate to API Directory
```bash
cd ../services/api
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Tests
```bash
npm test
```

### 4. Run E2E Tests
```bash
npm run test:e2e
```

## Reproducing Gas Analysis

### 1. Generate Detailed Gas Report
```bash
cd ../../contracts
forge test -vvv --gas-report --gas-limit 10000000
```

### 2. Test Specific Functions
```bash
# Test mintByPartition gas usage
forge test --match-test test_MintByPartition_Success -vvv --gas-report

# Test transferByPartition gas usage
forge test --match-test test_TransferByPartition_Success -vvv --gas-report

# Test distribute gas usage with different holder counts
forge test --match-test test_Distribute_WithManyHolders -vvv --gas-report
```

## Reproducing Edge Case Tests

### 1. Lockup Boundary Tests
```bash
forge test --match-test test_LockupBoundary -vvv
```

### 2. Reg S Restriction Tests
```bash
forge test --match-test test_RegSRestriction -vvv
```

### 3. Claims Expiry Tests
```bash
forge test --match-test test_ClaimsExpiry -vvv
```

### 4. Underfunded Math Tests
```bash
forge test --match-test test_UnderfundedMath -vvv
```

## Reproducing Invariant Tests

### 1. Total Supply Invariant
```bash
forge test --match-test testInvariant_TotalSupplyConsistency -vvv
```

### 2. Payout Math Invariant
```bash
forge test --match-test testInvariant_PayoutMath -vvv
```

## Reproducing Fuzz Tests

### 1. Run All Fuzz Tests
```bash
forge test --fuzz-runs 1000 -vvv
```

### 2. Run Specific Fuzz Tests
```bash
forge test --match-test testFuzz_MintAndTransfer -vvv --fuzz-runs 1000
```

## Expected Results

### Gas Usage Targets
- **mintByPartition**: ≤ 100,000 gas
- **transferByPartition**: ≤ 120,000 gas
- **snapshot()**: ≤ 1,000 gas (for ≤ 1k holders)
- **distribute()**: ≤ 250,000 gas (for 250 holders)

### Test Coverage
- **SecurityToken**: 100% function coverage
- **ComplianceRegistry**: 100% function coverage
- **PayoutDistributor**: 100% function coverage

### Invariant Verification
- Total supply consistency across all operations
- Payout math accuracy (± $0.01 tolerance)
- Access control enforcement

## Troubleshooting

### Common Issues

#### 1. Foundry Not Found
```bash
# Add to PATH
export PATH="$HOME/.foundry/bin:$PATH"
```

#### 2. Dependencies Missing
```bash
# Install OpenZeppelin contracts
forge install OpenZeppelin/openzeppelin-contracts
```

#### 3. Test Failures
```bash
# Run with verbose output
forge test -vvvv

# Check specific test
forge test --match-test testName -vvv
```

#### 4. Gas Report Issues
```bash
# Ensure sufficient gas limit
forge test --gas-limit 10000000 --gas-report
```

## Alternative Testing Methods

### 1. Online Remix IDE
- Upload contracts to https://remix.ethereum.org/
- Use JavaScript VM for testing
- Limited gas analysis capabilities

### 2. Hardhat (Alternative to Foundry)
```bash
npm install --save-dev hardhat
npx hardhat test
```

### 3. Manual Code Review
- Review contract logic manually
- Verify event emissions
- Check access control patterns

## Next Steps After Installation

1. **Run all tests** to verify functionality
2. **Generate gas reports** for production planning
3. **Verify invariants** for mathematical consistency
4. **Test edge cases** for robustness
5. **Update audit report** with test results

---

*This guide will be updated once Foundry is successfully installed and tests can be run.*
