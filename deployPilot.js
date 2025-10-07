import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Mock USDC ABI (simplified ERC20)
const MOCK_USDC_ABI = [
    "constructor(string memory name, string memory symbol)",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function mint(address to, uint256 amount)",
    "function transfer(address to, uint256 amount) returns (bool)"
];

// Mock USDC bytecode (we'll use a simple ERC20 implementation)
const MOCK_USDC_BYTECODE = "0x608060405234801561001057600080fd5b506004361061007d5760003560e01c806318160ddd1161005b57806318160ddd146100d6578063313ce567146100f457806340c10f191461011257806395d89b411461012e5761007d565b806306fdde0314610082578063095ea7b3146100a0578063177e802f146100cc575b600080fd5b61008a61014c565b604051610097919061015a565b60405180910390f35b6100ba60048036038101906100b5919061020a565b6101de565b6040516100c79190610265565b60405180910390f35b6100d46101fb565b005b6100de610203565b6040516100eb919061028f565b60405180910390f35b6100fc610209565b60405161010991906102c8565b60405180910390f35b61012c6004803603810190610127919061020a565b610212565b005b610136610228565b604051610143919061015a565b60405180910390f35b60606040518060400160405280600881526020017f4d6f636b20555344000000000000000000000000000000000000000000000000815250905090565b600060208083528351808285015260005b818110156101875785810183015185820160400152820161016b565b81811115610199576000604083870101525b50601f01601f1916929092016040019392505050565b600080fd5b600080fd5b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b610202826101b9565b810181811067ffffffffffffffff82111715610221576102206101ca565b5b80604052505050565b60006102346101a5565b905061024082826101f1565b919050565b6000819050919050565b61025881610245565b811461026357600080fd5b50565b6000813590506102758161024f565b92915050565b600080fd5b600080fd5b600080fd5b60008083601f84011261029e5761029d610279565b5b8235905067ffffffffffffffff8111156102bb576102ba61027e565b5b6020830191508360018202830111156102d7576102d6610283565b5b9250929050565b600080600080606085870312156102f6576102f561025e565b5b600061030487828801610266565b945050602061031587828801610266565b935050604085013567ffffffffffffffff81111561033657610335610263565b5b61034287828801610283565b925092509295919450925092565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061039557607f821691505b6020821081036103a8576103a761034e565b5b50919050565b6103b781610245565b82525050565b60006020820190506103d260008301846103ae565b9291505056fea2646970667358221220...";

async function deployMockUSDC() {
    try {
        console.log('🚀 Starting COINSCIOUS Pilot Deployment...\n');
        
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
        
        // Deploy Mock USDC
        console.log('\n📝 Step 1: Deploying Mock USDC...');
        
        const mockUSDCFactory = new ethers.ContractFactory(MOCK_USDC_ABI, MOCK_USDC_BYTECODE, wallet);
        const mockUSDC = await mockUSDCFactory.deploy("Mock USDC", "USDC");
        await mockUSDC.waitForDeployment();
        
        const mockUSDCAddress = await mockUSDC.getAddress();
        console.log('✅ Mock USDC deployed at:', mockUSDCAddress);
        
        // Get contract info
        const name = await mockUSDC.name();
        const symbol = await mockUSDC.symbol();
        const decimals = await mockUSDC.decimals();
        
        console.log('📊 Token Info:');
        console.log('   Name:', name);
        console.log('   Symbol:', symbol);
        console.log('   Decimals:', decimals);
        
        // Mint initial supply to deployer
        const initialSupply = ethers.parseUnits("1000000", decimals); // 1M USDC
        await mockUSDC.mint(wallet.address, initialSupply);
        console.log('✅ Minted 1,000,000 USDC to deployer');
        
        // Save deployment info
        const deploymentInfo = {
            network: "base-sepolia",
            deploymentTime: new Date().toISOString(),
            deployer: wallet.address,
            contracts: {
                mockUSDC: mockUSDCAddress
            }
        };
        
        // Create deployments directory if it doesn't exist
        const deploymentsDir = 'deployments';
        if (!fs.existsSync(deploymentsDir)) {
            fs.mkdirSync(deploymentsDir);
        }
        
        // Save to JSON file
        fs.writeFileSync(
            path.join(deploymentsDir, 'mock-usdc-deployment.json'),
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log('\n🎉 Mock USDC Deployment Complete!');
        console.log('📁 Deployment info saved to: deployments/mock-usdc-deployment.json');
        console.log('\n📝 Next Steps:');
        console.log('1. Update MOCK_USDC_ADDRESS in .env file with:', mockUSDCAddress);
        console.log('2. Run the main contract deployment');
        
        return mockUSDCAddress;
        
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        
        if (error.message.includes('insufficient funds')) {
            console.error('💡 Get testnet ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet');
        }
        
        throw error;
    }
}

// Run deployment
deployMockUSDC()
    .then(() => {
        console.log('\n✅ Pilot deployment step 1 complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Deployment failed:', error.message);
        process.exit(1);
    });
