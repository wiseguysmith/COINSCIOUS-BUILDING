// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../test/mocks/MockUSDC.sol";

/**
 * @title DeployMockUSDC
 * @notice Deployment script for Mock USDC on Base Sepolia testnet
 * @dev Deploys MockUSDC and mints initial supply to deployer
 */
contract DeployMockUSDC is Script {
    MockUSDC public mockUSDC;
    
    function run() public {
        address deployer = msg.sender;
        
        vm.startBroadcast(deployer);
        
        console.log("Starting Mock USDC deployment to Base Sepolia...");
        console.log("Deployer:", deployer);
        
        // Deploy Mock USDC
        console.log("\nDeploying Mock USDC...");
        mockUSDC = new MockUSDC();
        console.log("Mock USDC deployed at:", address(mockUSDC));
        
        // Check initial balance
        uint256 balance = mockUSDC.balanceOf(deployer);
        console.log("Initial balance:", balance / 10**6, "USDC");
        
        vm.stopBroadcast();
        
        // Output deployment summary
        _outputDeploymentSummary();
        _saveAddress();
    }
    
    function _outputDeploymentSummary() internal view {
        console.log("\nMock USDC Deployment Complete!");
        console.log("==================================");
        console.log("Contract Address:", address(mockUSDC));
        console.log("Name:", mockUSDC.name());
        console.log("Symbol:", mockUSDC.symbol());
        console.log("Decimals:", mockUSDC.decimals());
        console.log("Total Supply:", mockUSDC.totalSupply() / 10**6, "USDC");
        console.log("\nNext Steps:");
        console.log("1. Copy the contract address to your .env file");
        console.log("2. Update MOCK_USDC_ADDRESS in .env");
        console.log("3. Run main deployment script");
    }
    
    function _saveAddress() internal {
        string memory addressData = vm.toString(address(mockUSDC));
        vm.writeFile("deployments/mock-usdc-address.txt", addressData);
        console.log("\nAddress saved to: deployments/mock-usdc-address.txt");
    }
}
