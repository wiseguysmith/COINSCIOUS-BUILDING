// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {SecurityTokenFactory} from "../src/SecurityTokenFactory.sol";
import {SecurityToken} from "../src/SecurityToken.sol";
import {ComplianceRegistry} from "../src/ComplianceRegistry.sol";

contract SecurityTokenFactoryTest is Test {
    SecurityTokenFactory public factory;
    SecurityToken public implementation;
    ComplianceRegistry public registry;
    
    address public owner;
    address public controller;
    address public user1;
    
    function setUp() public {
        owner = makeAddr("owner");
        controller = makeAddr("controller");
        user1 = makeAddr("user1");
        
        vm.startPrank(owner);
        
        // Deploy compliance registry
        registry = new ComplianceRegistry();
        
        // Deploy implementation
        implementation = new SecurityToken(
            "Test Implementation",
            "TEST",
            owner,
            controller,
            address(registry)
        );
        
        // Deploy factory
        factory = new SecurityTokenFactory(implementation);
        
        vm.stopPrank();
    }
    
    function test_Constructor() public {
        assertEq(address(factory.implementation()), address(implementation));
        assertEq(factory.owner(), owner);
    }
    
    function test_DeployToken_Success() public {
        vm.startPrank(owner);
        
        string memory name = "Test Token";
        string memory symbol = "TEST";
        
        vm.expectEmit(true, true, true, true);
        emit SecurityTokenFactory.CloneDeployed(
            address(implementation),
            address(0), // We don't know the clone address yet
            "SecurityToken",
            name,
            symbol
        );
        
        SecurityToken token = factory.deployToken(
            name,
            symbol,
            controller,
            address(registry)
        );
        
        // Verify the token was deployed correctly
        assertEq(token.name(), name);
        assertEq(token.symbol(), symbol);
        assertEq(token.decimals(), 18);
        assertEq(token.owner(), owner);
        assertTrue(token.hasRole(token.CONTROLLER_ROLE(), controller));
        assertEq(address(token.complianceRegistry()), address(registry));
        
        // Verify it's tracked in the factory
        (string memory storedName, string memory storedSymbol, address storedController, address storedRegistry) = 
            factory.deployedTokens(address(token));
        assertEq(storedName, name);
        assertEq(storedSymbol, symbol);
        assertEq(storedController, controller);
        assertEq(storedRegistry, address(registry));
        
        vm.stopPrank();
    }
    
    function test_DeployToken_RevertIfNotOwner() public {
        vm.startPrank(user1);
        
        vm.expectRevert("Ownable: caller is not the owner");
        factory.deployToken(
            "Test Token",
            "TEST",
            controller,
            address(registry)
        );
        
        vm.stopPrank();
    }
    
    function test_DeployToken_RevertIfInvalidParams() public {
        vm.startPrank(owner);
        
        // Test empty name
        vm.expectRevert("Factory: name cannot be empty");
        factory.deployToken(
            "",
            "TEST",
            controller,
            address(registry)
        );
        
        // Test empty symbol
        vm.expectRevert("Factory: symbol cannot be empty");
        factory.deployToken(
            "Test Token",
            "",
            controller,
            address(registry)
        );
        
        // Test zero controller
        vm.expectRevert("Factory: controller cannot be zero");
        factory.deployToken(
            "Test Token",
            "TEST",
            address(0),
            address(registry)
        );
        
        // Test zero registry
        vm.expectRevert("Factory: registry cannot be zero");
        factory.deployToken(
            "Test Token",
            "TEST",
            controller,
            address(0)
        );
        
        vm.stopPrank();
    }
    
    function test_GetDeployedTokensCount() public {
        assertEq(factory.getDeployedTokensCount(), 0);
        
        vm.startPrank(owner);
        
        factory.deployToken("Token 1", "T1", controller, address(registry));
        assertEq(factory.getDeployedTokensCount(), 1);
        
        factory.deployToken("Token 2", "T2", controller, address(registry));
        assertEq(factory.getDeployedTokensCount(), 2);
        
        vm.stopPrank();
    }
    
    function test_GetDeployedTokenAtIndex() public {
        vm.startPrank(owner);
        
        SecurityToken token1 = factory.deployToken("Token 1", "T1", controller, address(registry));
        SecurityToken token2 = factory.deployToken("Token 2", "T2", controller, address(registry));
        
        assertEq(factory.getDeployedTokenAtIndex(0), address(token1));
        assertEq(factory.getDeployedTokenAtIndex(1), address(token2));
        
        vm.stopPrank();
    }
    
    function test_GetDeployedTokenAtIndex_RevertIfInvalidIndex() public {
        vm.expectRevert("Factory: invalid index");
        factory.getDeployedTokenAtIndex(0);
    }
}
