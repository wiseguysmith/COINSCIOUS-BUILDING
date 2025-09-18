#!/bin/bash

# COINSCIOUS Security Token Platform - Pilot Setup Script
# This script helps you set up the pilot deployment

set -e

echo "🚀 COINSCIOUS PILOT SETUP"
echo "=========================="

# Check if Foundry is installed
if ! command -v forge &> /dev/null; then
    echo "❌ Foundry not found. Installing..."
    curl -L https://foundry.paradigm.xyz | bash
    source ~/.bashrc
    foundryup
else
    echo "✅ Foundry is installed"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 20+ from https://nodejs.org"
    exit 1
else
    echo "✅ Node.js is installed: $(node --version)"
fi

# Install dependencies
echo "📦 Installing dependencies..."
forge install

# Build contracts
echo "🔨 Building contracts..."
forge build

# Run tests
echo "🧪 Running tests..."
forge test

echo ""
echo "✅ SETUP COMPLETE!"
echo ""
echo "📋 NEXT STEPS:"
echo "1. Get Base Sepolia ETH from: https://bridge.base.org/deposit"
echo "2. Create wallets and get addresses"
echo "3. Update deploy.config with your addresses"
echo "4. Update env.example with your API keys"
echo "5. Run: forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast"
echo ""
echo "🔑 REQUIRED ADDRESSES:"
echo "- DEPLOYER_ADDRESS: Your deployment wallet"
echo "- GNOSIS_SAFE_ADDRESS: Multisig wallet for ownership"
echo "- TIMELOCK_CONTROLLER_ADDRESS: Governance timelock"
echo "- MOCK_USDC_ADDRESS: USDC testnet token"
echo ""
echo "🔐 REQUIRED API KEYS:"
echo "- ETHERSCAN_API_KEY: For contract verification"
echo "- ALCHEMY_API_KEY: For RPC access (optional)"
echo ""
echo "📖 Full documentation: See README.md"
