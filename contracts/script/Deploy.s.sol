// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/LogAnchor.sol";
import "../src/ComplianceRegistry.sol";
import "../src/SecurityToken.sol";
import "../src/SecurityTokenFactory.sol";
import "../src/PayoutDistributor.sol";
import "../src/PayoutDistributorFactory.sol";

/**
 * @title Deploy
 * @notice Deployment script for COINSCIOUS Security Token Platform
 * @dev Deploys contracts in the correct order for Base Sepolia testnet
 */
contract Deploy is Script {
    // Deployment addresses
    address public deployer;
    address public gnosisSafe;
    address public timelockController;
    
    // Contract instances
    LogAnchor public logAnchor;
    ComplianceRegistry public complianceRegistry;
    SecurityToken public securityTokenImpl;
    SecurityTokenFactory public securityTokenFactory;
    PayoutDistributor public payoutDistributorImpl;
    PayoutDistributorFactory public payoutDistributorFactory;
    
    // Mock USDC for testing
    address public mockUSDC;
    
    function setUp() public {
        deployer = vm.envAddress("DEPLOYER_ADDRESS");
        gnosisSafe = vm.envAddress("GNOSIS_SAFE_ADDRESS");
        timelockController = vm.envAddress("TIMELOCK_CONTROLLER_ADDRESS");
        mockUSDC = vm.envAddress("MOCK_USDC_ADDRESS");
    }
    
    function run() public {
        vm.startBroadcast(deployer);
        
        console.log("Starting deployment to Base Sepolia...");
        console.log("Deployer:", deployer);
        console.log("Gnosis Safe:", gnosisSafe);
        console.log("Timelock Controller:", timelockController);
        console.log("Mock USDC:", mockUSDC);
        
        // Step 1: Deploy LogAnchor
        console.log("\nStep 1: Deploying LogAnchor...");
        logAnchor = new LogAnchor();
        console.log("LogAnchor deployed at:", address(logAnchor));
        
        // Step 2: Deploy ComplianceRegistry
        console.log("\nStep 2: Deploying ComplianceRegistry...");
        complianceRegistry = new ComplianceRegistry();
        console.log("ComplianceRegistry deployed at:", address(complianceRegistry));
        
        // Step 3: Deploy SecurityToken implementation
        console.log("\nStep 3: Deploying SecurityToken implementation...");
        securityTokenImpl = new SecurityToken();
        securityTokenImpl.initialize(
            "COINSCIOUS Security Token", // name
            "COIN",                     // symbol
            gnosisSafe,                 // owner (Gnosis Safe)
            timelockController,         // controller (Timelock)
            address(complianceRegistry) // registry
        );
        console.log("SecurityToken implementation deployed at:", address(securityTokenImpl));
        
        // Step 4: Deploy SecurityTokenFactory
        console.log("\nStep 4: Deploying SecurityTokenFactory...");
        securityTokenFactory = new SecurityTokenFactory(securityTokenImpl);
        console.log("SecurityTokenFactory deployed at:", address(securityTokenFactory));
        
        // Step 4: Deploy PayoutDistributor implementation
        console.log("\nStep 5: Deploying PayoutDistributor implementation...");
        payoutDistributorImpl = new PayoutDistributor(mockUSDC, address(securityTokenImpl), keccak256("REG_D"));
        console.log("PayoutDistributor implementation deployed at:", address(payoutDistributorImpl));
        
        // Step 6: Deploy PayoutDistributorFactory
        console.log("\nStep 6: Deploying PayoutDistributorFactory...");
        payoutDistributorFactory = new PayoutDistributorFactory(payoutDistributorImpl);
        console.log("PayoutDistributorFactory deployed at:", address(payoutDistributorFactory));
        
        // Step 7: Transfer ownership to Gnosis Safe
        console.log("\nStep 7: Transferring ownership to Gnosis Safe...");
        logAnchor.transferOwnership(gnosisSafe);
        securityTokenFactory.transferOwnership(gnosisSafe);
        payoutDistributorFactory.transferOwnership(gnosisSafe);
        console.log("Ownership transferred to Gnosis Safe");
        
        // Step 8: Grant ORACLE_ROLE to deployer (for testing)
        console.log("\nStep 8: Setting up oracle role...");
        complianceRegistry.grantRole(complianceRegistry.ORACLE_ROLE(), deployer);
        console.log("Oracle role granted to deployer for testing");
        
        vm.stopBroadcast();
        
        // Output deployment summary
        _outputDeploymentSummary();
        _saveAddresses();
    }
    
    function _outputDeploymentSummary() internal view {
        console.log("\nDeployment Complete!");
        console.log("==================================");
        console.log("Contract Addresses:");
        console.log("LogAnchor:", address(logAnchor));
        console.log("ComplianceRegistry:", address(complianceRegistry));
        console.log("SecurityToken Implementation:", address(securityTokenImpl));
        console.log("SecurityTokenFactory:", address(securityTokenFactory));
        console.log("PayoutDistributor Implementation:", address(payoutDistributorImpl));
        console.log("PayoutDistributorFactory:", address(payoutDistributorFactory));
        console.log("\nNext Steps:");
        console.log("1. Verify contracts on Base Sepolia explorer");
        console.log("2. Test factory deployments");
        console.log("3. Configure compliance rules");
        console.log("4. Deploy to Base mainnet when ready");
    }
    
    function _saveAddresses() internal {
        string memory addressesJsonData = addressesJson();
        vm.writeFile("deployments/base-sepolia-addresses.json", addressesJsonData);
        console.log("\nAddresses saved to: deployments/base-sepolia-addresses.json");
    }
    
    function addressesJson() internal view returns (string memory) {
        return vm.toString(abi.encodePacked(
            '{\n',
            '  "network": "base-sepolia",\n',
            '  "deploymentTime": "', vm.toString(block.timestamp), '",\n',
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "gnosisSafe": "', vm.toString(gnosisSafe), '",\n',
            '  "timelockController": "', vm.toString(timelockController), '",\n',
            '  "contracts": {\n',
            '    "logAnchor": "', vm.toString(address(logAnchor)), '",\n',
            '    "complianceRegistry": "', vm.toString(address(complianceRegistry)), '",\n',
            '    "securityTokenImpl": "', vm.toString(address(securityTokenImpl)), '",\n',
            '    "securityTokenFactory": "', vm.toString(address(securityTokenFactory)), '",\n',
            '    "payoutDistributorImpl": "', vm.toString(address(payoutDistributorImpl)), '",\n',
            '    "payoutDistributorFactory": "', vm.toString(address(payoutDistributorFactory)), '"\n',
            '  },\n',
            '  "mockUSDC": "', vm.toString(mockUSDC), '"\n',
            '}'
        ));
    }
}
