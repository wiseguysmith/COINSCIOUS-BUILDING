import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

async function deployLinearVesting() {
    try {
        console.log('🚀 Deploying LinearVesting to Base Sepolia...\n');
        
        // Setup provider and wallet
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_BASE_SEPOLIA);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        
        // Get SecurityToken address from DEPLOYED_ADDRESSES.json
        const deployedAddresses = JSON.parse(fs.readFileSync('DEPLOYED_ADDRESSES.json', 'utf8'));
        const securityTokenAddress = deployedAddresses.contracts.securityToken.address;
        
        console.log('📍 Deployer Address:', wallet.address);
        console.log('📍 SecurityToken Address:', securityTokenAddress);
        
        // Check balance
        const balance = await provider.getBalance(wallet.address);
        console.log('💰 Balance:', ethers.formatEther(balance), 'ETH');
        
        if (balance === 0n) {
            throw new Error('❌ Insufficient balance. Get testnet ETH from Base Sepolia faucet.');
        }
        
        console.log('\n📋 Manual Deployment Instructions:');
        console.log('1. Go to https://remix.ethereum.org');
        console.log('2. Create a new file called LinearVesting.sol');
        console.log('3. Copy the contract source code below:');
        console.log('\n' + '='.repeat(80));
        console.log(`
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract LinearVesting is Ownable, ReentrancyGuard {
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 startTime;
        uint256 cliffPeriod;
        uint256 vestingPeriod;
        uint256 releasedAmount;
        bool active;
    }
    
    IERC20 public token;
    mapping(address => VestingSchedule) public vestingSchedules;
    
    event VestingScheduleCreated(address indexed beneficiary, uint256 amount, uint256 startTime);
    event TokensReleased(address indexed beneficiary, uint256 amount);
    
    constructor(address _token) {
        token = IERC20(_token);
    }
    
    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 cliffPeriod,
        uint256 vestingPeriod
    ) external onlyOwner {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(amount > 0, "Amount must be positive");
        
        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: amount,
            startTime: block.timestamp,
            cliffPeriod: cliffPeriod,
            vestingPeriod: vestingPeriod,
            releasedAmount: 0,
            active: true
        });
        
        emit VestingScheduleCreated(beneficiary, amount, block.timestamp);
    }
    
    function release() external nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        require(schedule.active, "No active vesting schedule");
        
        uint256 releasable = getReleasableAmount(msg.sender);
        require(releasable > 0, "No tokens to release");
        
        schedule.releasedAmount += releasable;
        token.transfer(msg.sender, releasable);
        
        emit TokensReleased(msg.sender, releasable);
    }
    
    function getReleasableAmount(address beneficiary) public view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];
        if (!schedule.active) return 0;
        
        uint256 currentTime = block.timestamp;
        uint256 elapsed = currentTime - schedule.startTime;
        
        if (elapsed < schedule.cliffPeriod) {
            return 0; // Still in cliff period
        }
        
        uint256 totalVested = (schedule.totalAmount * (elapsed - schedule.cliffPeriod)) / schedule.vestingPeriod;
        if (totalVested > schedule.totalAmount) {
            totalVested = schedule.totalAmount;
        }
        
        return totalVested - schedule.releasedAmount;
    }
}`);
        console.log('='.repeat(80));
        
        console.log('\n4. Compile the contract in Remix');
        console.log('5. Deploy with this parameter:');
        console.log('   - _token: ' + securityTokenAddress);
        
        console.log('\n6. Copy the deployed contract address');
        console.log('7. Run: node updateLinearVestingAddress.js [CONTRACT_ADDRESS]');
        
        // Create update script for LinearVesting
        const updateScript = `
import { ethers } from 'ethers';
import fs from 'fs';

const contractAddress = process.argv[2];
if (!contractAddress) {
    console.error('❌ Please provide contract address: node updateLinearVestingAddress.js [CONTRACT_ADDRESS]');
    process.exit(1);
}

try {
    const deployedAddresses = JSON.parse(fs.readFileSync('DEPLOYED_ADDRESSES.json', 'utf8'));
    deployedAddresses.contracts.linearVesting.address = contractAddress;
    deployedAddresses.contracts.linearVesting.status = "deployed";
    deployedAddresses.contracts.linearVesting.deploymentConfirmed = true;
    
    // Update deployment order
    deployedAddresses.deploymentOrder[3] = "4. LinearVesting - ✅ COMPLETED";
    
    // Update next steps
    deployedAddresses.nextSteps = [
        "Update .env file with all addresses",
        "Begin token operations testing",
        "Set up Next.js operator console"
    ];
    
    fs.writeFileSync('DEPLOYED_ADDRESSES.json', JSON.stringify(deployedAddresses, null, 2));
    console.log('✅ Updated DEPLOYED_ADDRESSES.json with LinearVesting address:', contractAddress);
    console.log('🎯 All core contracts deployed! Ready for next phase.');
} catch (error) {
    console.error('❌ Failed to update addresses:', error.message);
}
`;
        
        fs.writeFileSync('updateLinearVestingAddress.js', updateScript);
        console.log('\n📁 Created updateLinearVestingAddress.js script');
        
        return true;
        
    } catch (error) {
        console.error('❌ Deployment preparation failed:', error.message);
        throw error;
    }
}

// Run deployment preparation
deployLinearVesting()
    .then(() => {
        console.log('\n✅ LinearVesting deployment preparation complete!');
        console.log('📝 Next: Deploy manually using Remix, then run updateLinearVestingAddress.js');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Deployment preparation failed:', error.message);
        process.exit(1);
    });
