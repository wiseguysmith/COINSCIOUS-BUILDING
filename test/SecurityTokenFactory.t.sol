// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {SecurityTokenFactory} from "../src/SecurityTokenFactory.sol";
import {SecurityToken} from "../src/SecurityToken.sol";
import {ComplianceRegistry} from "../src/ComplianceRegistry.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

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
        implementation = new SecurityToken();
        implementation.initialize(
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
        
        // vm.expectEmit(true, true, true, true);
        // emit SecurityTokenFactory.TokenDeployed(
        //     address(0), // We don't know the clone address yet
        //     name,
        //     symbol,
        //     owner,
        //     controller,
        //     address(registry)
        // );
        
        SecurityToken token = factory.deployToken(
            name,
            symbol,
            owner,
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
        assertTrue(factory.isDeployedToken(address(token)));
        assertEq(factory.getDeploymentCount(), 1);
        
        vm.stopPrank();
    }
    
    function test_DeployToken_RevertIfNotOwner() public {
        vm.startPrank(user1);
        
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user1));
        factory.deployToken(
            "Test Token",
            "TEST",
            owner,
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
            owner,
            controller,
            address(registry)
        );
        
        // Test empty symbol
        vm.expectRevert("Factory: symbol cannot be empty");
        factory.deployToken(
            "Test Token",
            "",
            owner,
            controller,
            address(registry)
        );
        
        // Test zero controller
        vm.expectRevert("Factory: controller cannot be zero");
        factory.deployToken(
            "Test Token",
            "TEST",
            owner,
            address(0),
            address(registry)
        );
        
        // Test zero registry
        vm.expectRevert("Factory: registry cannot be zero");
        factory.deployToken(
            "Test Token",
            "TEST",
            owner,
            controller,
            address(0)
        );
        
        vm.stopPrank();
    }
    
    function test_GetDeployedTokensCount() public {
        assertEq(factory.getDeploymentCount(), 0);
        
        vm.startPrank(owner);
        
        factory.deployToken("Token 1", "T1", owner, controller, address(registry));
        assertEq(factory.getDeploymentCount(), 1);
        
        factory.deployToken("Token 2", "T2", owner, controller, address(registry));
        assertEq(factory.getDeploymentCount(), 2);
        
        vm.stopPrank();
    }
    
    function test_GetDeployedTokenAtIndex() public {
        vm.startPrank(owner);
        
        SecurityToken token1 = factory.deployToken("Token 1", "T1", owner, controller, address(registry));
        SecurityToken token2 = factory.deployToken("Token 2", "T2", owner, controller, address(registry));
        
        (SecurityToken retrievedToken1, ) = factory.getTokenByIndex(0);
        (SecurityToken retrievedToken2, ) = factory.getTokenByIndex(1);
        assertEq(address(retrievedToken1), address(token1));
        assertEq(address(retrievedToken2), address(token2));
        
        vm.stopPrank();
    }
    
    function test_GetDeployedTokenAtIndex_RevertIfInvalidIndex() public {
        vm.expectRevert("Factory: index out of bounds");
        factory.getTokenByIndex(0);
    }
}
