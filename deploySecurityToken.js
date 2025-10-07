import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

async function deploySecurityToken() {
    try {
        console.log('🚀 Deploying SecurityToken to Base Sepolia...\n');
        
        // Setup provider and wallet
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_BASE_SEPOLIA);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        
        console.log('📍 Deployer Address:', wallet.address);
        console.log('📍 ComplianceRegistry Address:', process.env.COMPLIANCE_REGISTRY_ADDRESS);
        
        // Check balance
        const balance = await provider.getBalance(wallet.address);
        console.log('💰 Balance:', ethers.formatEther(balance), 'ETH');
        
        if (balance === 0n) {
            throw new Error('❌ Insufficient balance. Get testnet ETH from Base Sepolia faucet.');
        }
        
        // SecurityToken contract source code
        const securityTokenSource = `
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
}`;

        // Compile and deploy SecurityToken
        console.log('\n📝 Deploying SecurityToken...');
        
        const factory = new ethers.ContractFactory(
            [
                "constructor(string memory name, string memory symbol, address _owner, address _complianceRegistry)"
            ],
            securityTokenSource,
            wallet
        );
        
        const securityToken = await factory.deploy(
            "COINSCIOUS Security Token", // name
            "COIN",                     // symbol
            wallet.address,             // owner
            process.env.COMPLIANCE_REGISTRY_ADDRESS // complianceRegistry
        );
        
        await securityToken.waitForDeployment();
        const securityTokenAddress = await securityToken.getAddress();
        
        console.log('✅ SecurityToken deployed at:', securityTokenAddress);
        
        // Update DEPLOYED_ADDRESSES.json
        const deployedAddresses = JSON.parse(fs.readFileSync('DEPLOYED_ADDRESSES.json', 'utf8'));
        deployedAddresses.contracts.securityToken.address = securityTokenAddress;
        deployedAddresses.contracts.securityToken.status = "deployed";
        deployedAddresses.contracts.securityToken.deploymentConfirmed = true;
        deployedAddresses.contracts.securityToken.transactionHash = securityToken.deploymentTransaction().hash;
        deployedAddresses.contracts.securityToken.blockNumber = await provider.getBlockNumber();
        
        // Update next steps
        deployedAddresses.nextSteps = [
            "Deploy LinearVesting contract with SecurityToken address",
            "Update .env file with all addresses",
            "Begin token operations testing"
        ];
        
        fs.writeFileSync('DEPLOYED_ADDRESSES.json', JSON.stringify(deployedAddresses, null, 2));
        
        console.log('\n📁 Updated DEPLOYED_ADDRESSES.json');
        console.log('\n🎯 Next Steps:');
        console.log('1. Deploy LinearVesting contract');
        console.log('2. Update .env file with SecurityToken address');
        console.log('3. Test token operations');
        
        return {
            securityTokenAddress,
            transactionHash: securityToken.deploymentTransaction().hash
        };
        
    } catch (error) {
        console.error('❌ SecurityToken deployment failed:', error.message);
        throw error;
    }
}

// Run deployment
deploySecurityToken()
    .then((result) => {
        console.log('\n✅ SecurityToken deployment complete!');
        console.log('📍 Address:', result.securityTokenAddress);
        console.log('🔗 Transaction:', result.transactionHash);
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Deployment failed:', error.message);
        process.exit(1);
    });
