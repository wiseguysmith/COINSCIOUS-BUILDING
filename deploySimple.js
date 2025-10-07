import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

async function deploySimpleMockUSDC() {
    try {
        console.log('🚀 Starting Simple Mock USDC Deployment...\n');
        
        // Setup provider and wallet
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_BASE_SEPOLIA);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        
        console.log('📍 Deployer Address:', wallet.address);
        console.log('📍 Network:', process.env.RPC_URL_BASE_SEPOLIA);
        
        // Check balance
        const balance = await provider.getBalance(wallet.address);
        console.log('💰 Balance:', ethers.formatEther(balance), 'ETH');
        
        if (balance === 0n) {
            throw new Error('❌ Insufficient balance. Get testnet ETH from Base Sepolia faucet.');
        }
        
        // Simple ERC20 contract source code
        const contractSource = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.20;
        
        import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
        
        contract MockUSDC is ERC20 {
            uint8 private _decimals = 6;
            
            constructor() ERC20("Mock USDC", "USDC") {
                _mint(msg.sender, 1000000 * 10**6); // Mint 1M USDC
            }
            
            function decimals() public view virtual override returns (uint8) {
                return _decimals;
            }
            
            function mint(address to, uint256 amount) external {
                _mint(to, amount);
            }
        }
        `;
        
        console.log('\n📝 Step 1: Deploying Mock USDC...');
        console.log('💡 Note: This will deploy a simple ERC20 token with 1M USDC minted to deployer');
        
        // For now, let's create a deployment record and ask user to deploy via Remix or other tools
        const deploymentInfo = {
            network: "base-sepolia",
            deploymentTime: new Date().toISOString(),
            deployer: wallet.address,
            contractSource: contractSource,
            instructions: [
                "1. Copy the contract source code above",
                "2. Go to https://remix.ethereum.org",
                "3. Create a new file called MockUSDC.sol",
                "4. Paste the contract source code",
                "5. Compile the contract",
                "6. Deploy to Base Sepolia network",
                "7. Copy the deployed contract address",
                "8. Update MOCK_USDC_ADDRESS in .env file"
            ]
        };
        
        // Create deployments directory if it doesn't exist
        const deploymentsDir = 'deployments';
        if (!fs.existsSync(deploymentsDir)) {
            fs.mkdirSync(deploymentsDir);
        }
        
        // Save deployment info
        fs.writeFileSync(
            path.join(deploymentsDir, 'mock-usdc-deployment-info.json'),
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log('\n📁 Deployment info saved to: deployments/mock-usdc-deployment-info.json');
        console.log('\n📋 Manual Deployment Instructions:');
        console.log('1. Copy the contract source code from the JSON file');
        console.log('2. Go to https://remix.ethereum.org');
        console.log('3. Create MockUSDC.sol and paste the code');
        console.log('4. Compile and deploy to Base Sepolia');
        console.log('5. Copy the deployed address and update .env');
        
        // Alternative: Try to deploy using a pre-deployed contract address
        console.log('\n🎯 Alternative: Use a pre-deployed test token');
        console.log('You can also use an existing test token address like:');
        console.log('0x036CbD53842c5426634e7929541eC2318f3dCF7e (Base Sepolia test token)');
        
        return null; // Manual deployment required
        
    } catch (error) {
        console.error('❌ Deployment preparation failed:', error.message);
        throw error;
    }
}

// Run deployment
deploySimpleMockUSDC()
    .then(() => {
        console.log('\n✅ Deployment preparation complete!');
        console.log('📝 Next: Follow the manual deployment instructions above');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Deployment preparation failed:', error.message);
        process.exit(1);
    });
