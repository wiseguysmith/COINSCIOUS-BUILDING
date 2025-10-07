import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

async function deployMainContracts() {
    try {
        console.log('🚀 Starting Main Contracts Deployment...\n');
        
        // Setup provider and wallet
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_BASE_SEPOLIA);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        
        console.log('📍 Deployer Address:', wallet.address);
        console.log('📍 Mock USDC Address:', process.env.MOCK_USDC_ADDRESS);
        
        // Check balance
        const balance = await provider.getBalance(wallet.address);
        console.log('💰 Balance:', ethers.formatEther(balance), 'ETH');
        
        if (balance === 0n) {
            throw new Error('❌ Insufficient balance. Get testnet ETH from Base Sepolia faucet.');
        }
        
        console.log('\n📝 Step 2: Deploying Main Contracts...');
        console.log('💡 This will deploy: SecurityToken, Vesting, and related contracts');
        
        // Contract source codes for manual deployment
        const contracts = {
            SecurityToken: `
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
}`,
            
            Vesting: `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Vesting is Ownable, ReentrancyGuard {
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
}`,
            
            ComplianceRegistry: `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ComplianceRegistry is Ownable {
    struct InvestorInfo {
        bool accredited;
        string country;
        bool kycCompleted;
        uint256 investmentLimit;
    }
    
    mapping(address => InvestorInfo) public investors;
    
    event InvestorRegistered(address indexed investor, bool accredited, string country);
    event ComplianceUpdated(address indexed investor, bool accredited, uint256 limit);
    
    function registerInvestor(
        address investor,
        bool accredited,
        string memory country,
        uint256 investmentLimit
    ) external onlyOwner {
        investors[investor] = InvestorInfo({
            accredited: accredited,
            country: country,
            kycCompleted: true,
            investmentLimit: investmentLimit
        });
        
        emit InvestorRegistered(investor, accredited, country);
    }
    
    function isAccredited(address investor) external view returns (bool) {
        return investors[investor].accredited;
    }
    
    function getInvestmentLimit(address investor) external view returns (uint256) {
        return investors[investor].investmentLimit;
    }
    
    function updateCompliance(address investor, bool accredited, uint256 limit) external onlyOwner {
        investors[investor].accredited = accredited;
        investors[investor].investmentLimit = limit;
        
        emit ComplianceUpdated(investor, accredited, limit);
    }
}`
        };
        
        // Save contract sources and deployment instructions
        const deploymentInfo = {
            network: "base-sepolia",
            deploymentTime: new Date().toISOString(),
            deployer: wallet.address,
            mockUSDC: process.env.MOCK_USDC_ADDRESS,
            contracts: contracts,
            deploymentOrder: [
                "1. Deploy ComplianceRegistry first",
                "2. Deploy SecurityToken with ComplianceRegistry address",
                "3. Deploy Vesting with SecurityToken address",
                "4. Update .env file with all deployed addresses"
            ],
            constructorParameters: {
                ComplianceRegistry: "No parameters",
                SecurityToken: [
                    "name: 'COINSCIOUS Security Token'",
                    "symbol: 'COIN'", 
                    "owner: deployer address",
                    "complianceRegistry: ComplianceRegistry address"
                ],
                Vesting: [
                    "token: SecurityToken address"
                ]
            }
        };
        
        // Create deployments directory if it doesn't exist
        const deploymentsDir = 'deployments';
        if (!fs.existsSync(deploymentsDir)) {
            fs.mkdirSync(deploymentsDir);
        }
        
        // Save deployment info
        fs.writeFileSync(
            path.join(deploymentsDir, 'main-contracts-deployment.json'),
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log('\n📁 Deployment info saved to: deployments/main-contracts-deployment.json');
        console.log('\n📋 Manual Deployment Instructions:');
        console.log('1. Go to https://remix.ethereum.org');
        console.log('2. Deploy contracts in this order:');
        console.log('   a) ComplianceRegistry');
        console.log('   b) SecurityToken (with ComplianceRegistry address)');
        console.log('   c) Vesting (with SecurityToken address)');
        console.log('3. Copy all deployed addresses');
        console.log('4. Update .env file with the addresses');
        
        console.log('\n🎯 Deployment Order:');
        console.log('1. ComplianceRegistry → No parameters needed');
        console.log('2. SecurityToken → Name: "COINSCIOUS Security Token", Symbol: "COIN", Owner: your address, ComplianceRegistry: [from step 1]');
        console.log('3. Vesting → Token: [SecurityToken address from step 2]');
        
        return deploymentInfo;
        
    } catch (error) {
        console.error('❌ Deployment preparation failed:', error.message);
        throw error;
    }
}

// Run deployment preparation
deployMainContracts()
    .then(() => {
        console.log('\n✅ Main contracts deployment preparation complete!');
        console.log('📝 Next: Deploy the contracts manually using Remix');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Deployment preparation failed:', error.message);
        process.exit(1);
    });
