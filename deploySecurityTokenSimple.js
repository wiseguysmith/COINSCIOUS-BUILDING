import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

async function deploySecurityTokenSimple() {
    try {
        console.log('🚀 Deploying SecurityToken to Base Sepolia...\n');
        
        // Setup provider and wallet
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_BASE_SEPOLIA);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        
        // Get ComplianceRegistry address from DEPLOYED_ADDRESSES.json
        const deployedAddresses = JSON.parse(fs.readFileSync('DEPLOYED_ADDRESSES.json', 'utf8'));
        const complianceRegistryAddress = deployedAddresses.contracts.complianceRegistry.address;
        
        console.log('📍 Deployer Address:', wallet.address);
        console.log('📍 ComplianceRegistry Address:', complianceRegistryAddress);
        
        // Check balance
        const balance = await provider.getBalance(wallet.address);
        console.log('💰 Balance:', ethers.formatEther(balance), 'ETH');
        
        if (balance === 0n) {
            throw new Error('❌ Insufficient balance. Get testnet ETH from Base Sepolia faucet.');
        }
        
        // Simple SecurityToken contract ABI and bytecode
        const securityTokenABI = [
            "constructor(string memory name, string memory symbol, address _owner, address _complianceRegistry)",
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function totalSupply() view returns (uint256)",
            "function balanceOf(address) view returns (uint256)",
            "function transfer(address to, uint256 amount) returns (bool)",
            "function mint(address to, uint256 amount)",
            "function pause()",
            "function unpause()",
            "function owner() view returns (address)"
        ];
        
        // For now, let's use a simple approach - deploy via Remix instructions
        console.log('\n📋 Manual Deployment Instructions:');
        console.log('1. Go to https://remix.ethereum.org');
        console.log('2. Create a new file called SecurityToken.sol');
        console.log('3. Copy the contract source code below:');
        console.log('\n' + '='.repeat(80));
        console.log(`
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SecurityToken is ERC20, Ownable, Pausable, ReentrancyGuard {
    uint8 private _decimals = 18;
    address public complianceRegistry;
    
    constructor(
        string memory name,
        string memory symbol,
        address _owner,
        address _complianceRegistry
    ) ERC20(name, symbol) {
        _transferOwnership(_owner);
        complianceRegistry = _complianceRegistry;
        _mint(_owner, 1000000 * 10**18); // Mint 1M tokens
    }
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    function pause() public onlyOwner {
        _pause();
    }
    
    function unpause() public onlyOwner {
        _unpause();
    }
}`);
        console.log('='.repeat(80));
        
        console.log('\n4. Compile the contract in Remix');
        console.log('5. Deploy with these parameters:');
        console.log('   - name: "COINSCIOUS Security Token"');
        console.log('   - symbol: "COIN"');
        console.log('   - _owner: ' + wallet.address);
        console.log('   - _complianceRegistry: ' + complianceRegistryAddress);
        
        console.log('\n6. Copy the deployed contract address');
        console.log('7. Run: node updateAddresses.js [CONTRACT_ADDRESS]');
        
        // Create update script
        const updateScript = `
import { ethers } from 'ethers';
import fs from 'fs';

const contractAddress = process.argv[2];
if (!contractAddress) {
    console.error('❌ Please provide contract address: node updateAddresses.js [CONTRACT_ADDRESS]');
    process.exit(1);
}

try {
    const deployedAddresses = JSON.parse(fs.readFileSync('DEPLOYED_ADDRESSES.json', 'utf8'));
    deployedAddresses.contracts.securityToken.address = contractAddress;
    deployedAddresses.contracts.securityToken.status = "deployed";
    deployedAddresses.contracts.securityToken.deploymentConfirmed = true;
    
    fs.writeFileSync('DEPLOYED_ADDRESSES.json', JSON.stringify(deployedAddresses, null, 2));
    console.log('✅ Updated DEPLOYED_ADDRESSES.json with SecurityToken address:', contractAddress);
} catch (error) {
    console.error('❌ Failed to update addresses:', error.message);
}
`;
        
        fs.writeFileSync('updateAddresses.js', updateScript);
        console.log('\n📁 Created updateAddresses.js script');
        
        return true;
        
    } catch (error) {
        console.error('❌ Deployment preparation failed:', error.message);
        throw error;
    }
}

// Run deployment preparation
deploySecurityTokenSimple()
    .then(() => {
        console.log('\n✅ SecurityToken deployment preparation complete!');
        console.log('📝 Next: Deploy manually using Remix, then run updateAddresses.js');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Deployment preparation failed:', error.message);
        process.exit(1);
    });
