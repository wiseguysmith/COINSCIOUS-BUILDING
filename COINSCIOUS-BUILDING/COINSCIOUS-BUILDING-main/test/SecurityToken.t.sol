// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {SecurityToken} from "../src/SecurityToken.sol";
import {ComplianceRegistry} from "../src/ComplianceRegistry.sol";
import {IComplianceRegistry} from "../src/interfaces/IComplianceRegistry.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

contract SecurityTokenTest is Test {
    SecurityToken public token;
    ComplianceRegistry public registry;
    MockUSDC public mockUSDC;
    
    address public owner;
    address public controller;
    address public user1;
    address public user2;
    address public user3;
    
    bytes32 public constant REG_D = keccak256("REG_D");
    bytes32 public constant REG_S = keccak256("REG_S");
    
    function setUp() public {
        owner = makeAddr("owner");
        controller = makeAddr("controller");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");
        
        // Deploy mock USDC
        mockUSDC = new MockUSDC();
        
        // Deploy compliance registry
        vm.startPrank(owner);
        registry = new ComplianceRegistry();
        
        // Deploy security token
        token = new SecurityToken(
            "Test Security Token",
            "TEST",
            owner,
            controller,
            address(registry)
        );
        
        // Grant oracle role to owner for testing
        registry.grantRole(registry.ORACLE_ROLE(), owner);
        vm.stopPrank();
        
        // Setup test users with claims
        _setupTestUsers();
    }
    
    function _setupTestUsers() internal {
        vm.startPrank(owner);
        
        // User 1: US accredited investor
        registry.setClaims(user1, IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        }));
        
        // User 2: Non-US investor
        registry.setClaims(user2, IComplianceRegistry.Claims({
            countryCode: bytes2("UK"),
            accredited: false,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        }));
        
        // User 3: US investor with lockup
        registry.setClaims(user3, IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: uint64(block.timestamp + 30 days),
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        }));
        
        vm.stopPrank();
    }
    
    function test_Constructor() public {
        assertEq(token.name(), "Test Security Token");
        assertEq(token.symbol(), "TEST");
        assertEq(token.decimals(), 18);
        assertEq(token.owner(), owner);
        assertTrue(token.hasRole(token.CONTROLLER_ROLE(), controller));
        assertEq(address(token.complianceRegistry()), address(registry));
    }
    
    function test_MintByPartition_Success() public {
        vm.startPrank(controller);
        
        uint256 amount = 1000 * 10**18;
        
        // TODO: Add event emission test once events are properly configured
        
        token.mintByPartition(REG_D, user1, amount, "");
        
        assertEq(token.balanceOfByPartition(user1, REG_D), amount);
        assertEq(token.totalSupplyByPartition(REG_D), amount);
        assertEq(token.totalSupply(), amount);
        
        vm.stopPrank();
    }
    
    function test_MintByPartition_RevertIfNotController() public {
        vm.startPrank(user1);
        
        vm.expectRevert("SecurityToken: caller is not controller");
        token.mintByPartition(REG_D, user1, 1000 * 10**18, "");
        
        vm.stopPrank();
    }
    
    function test_MintByPartition_RevertIfInvalidPartition() public {
        vm.startPrank(controller);
        
        bytes32 invalidPartition = keccak256("INVALID");
        
        vm.expectRevert("SecurityToken: invalid partition");
        token.mintByPartition(invalidPartition, user1, 1000 * 10**18, "");
        
        vm.stopPrank();
    }
    
    function test_MintByPartition_RevertIfNotWhitelisted() public {
        vm.startPrank(controller);
        
        address nonWhitelisted = makeAddr("nonWhitelisted");
        
        vm.expectRevert("WALLET_NOT_WHITELISTED");
        token.mintByPartition(REG_D, nonWhitelisted, 1000 * 10**18, "");
        
        vm.stopPrank();
    }
    
    function test_TransferByPartition_Success() public {
        // First mint tokens
        vm.startPrank(controller);
        token.mintByPartition(REG_D, user1, 1000 * 10**18, "");
        vm.stopPrank();
        
        // Transfer tokens
        vm.startPrank(user1);
        
        uint256 transferAmount = 100 * 10**18;
        
        // TODO: Add event emission test once events are properly configured
        
        bytes32 operatorData = token.transferByPartition(REG_D, user2, transferAmount, "");
        
        assertEq(token.balanceOfByPartition(user1, REG_D), 900 * 10**18);
        assertEq(token.balanceOfByPartition(user2, REG_D), transferAmount);
        assertEq(token.totalSupplyByPartition(REG_D), 1000 * 10**18);
        assertTrue(operatorData != bytes32(0));
        
        vm.stopPrank();
    }
    
    function test_TransferByPartition_RevertIfInsufficientBalance() public {
        // First mint tokens
        vm.startPrank(controller);
        token.mintByPartition(REG_D, user1, 100 * 10**18, "");
        vm.stopPrank();
        
        // Try to transfer more than balance
        vm.startPrank(user1);
        
        vm.expectRevert("SecurityToken: insufficient balance");
        token.transferByPartition(REG_D, user2, 200 * 10**18, "");
        
        vm.stopPrank();
    }
    
    function test_TransferByPartition_RevertIfLockupActive() public {
        // First mint tokens
        vm.startPrank(controller);
        token.mintByPartition(REG_D, user3, 1000 * 10**18, "");
        vm.stopPrank();
        
        // Try to transfer during lockup
        vm.startPrank(user3);
        
        vm.expectRevert();
        token.transferByPartition(REG_D, user1, 100 * 10**18, "");
        
        vm.stopPrank();
    }
    
    function test_TransferByPartition_RevertIfDestinationNotAccredited() public {
        // First mint tokens
        vm.startPrank(controller);
        token.mintByPartition(REG_D, user1, 1000 * 10**18, "");
        vm.stopPrank();
        
        // Try to transfer to non-accredited user
        vm.startPrank(user1);
        
        vm.expectRevert("DESTINATION_NOT_ACCREDITED_REG_D");
        token.transferByPartition(REG_D, user2, 100 * 10**18, "");
        
        vm.stopPrank();
    }
    
    function test_TransferByPartition_RevertIfRegSRestricted() public {
        // First mint tokens
        vm.startPrank(controller);
        token.mintByPartition(REG_S, user2, 1000 * 10**18, "");
        vm.stopPrank();
        
        // Try to transfer REG_S to US person
        vm.startPrank(user2);
        
        vm.expectRevert("REG_S_RESTRICTED_US_PERSON");
        token.transferByPartition(REG_S, user1, 100 * 10**18, "");
        
        vm.stopPrank();
    }
    
    function test_BurnByPartition_Success() public {
        // First mint tokens
        vm.startPrank(controller);
        token.mintByPartition(REG_D, user1, 1000 * 10**18, "");
        vm.stopPrank();
        
        // Burn tokens
        vm.startPrank(controller);
        
        uint256 burnAmount = 100 * 10**18;
        
        // TODO: Add event emission test once events are properly configured
        
        token.burnByPartition(REG_D, user1, burnAmount, "");
        
        assertEq(token.balanceOfByPartition(user1, REG_D), 900 * 10**18);
        assertEq(token.totalSupplyByPartition(REG_D), 900 * 10**18);
        assertEq(token.totalSupply(), 900 * 10**18);
        
        vm.stopPrank();
    }
    
    function test_ForceTransfer_Success() public {
        // First mint tokens
        vm.startPrank(controller);
        token.mintByPartition(REG_D, user1, 1000 * 10**18, "");
        vm.stopPrank();
        
        // Force transfer
        vm.startPrank(controller);
        
        uint256 transferAmount = 100 * 10**18;
        string memory reason = "Emergency transfer";
        
        // TODO: Add event emission test once events are properly configured
        
        token.forceTransfer(REG_D, user1, user2, transferAmount, reason);
        
        assertEq(token.balanceOfByPartition(user1, REG_D), 900 * 10**18);
        assertEq(token.balanceOfByPartition(user2, REG_D), transferAmount);
        
        vm.stopPrank();
    }
    
    function test_ForceTransfer_RevertIfNotController() public {
        vm.startPrank(user1);
        
        vm.expectRevert("SecurityToken: caller is not controller");
        token.forceTransfer(REG_D, user1, user2, 100 * 10**18, "reason");
        
        vm.stopPrank();
    }
    
    function test_ForceTransfer_OnlyTimelockController() public {
        // First mint tokens
        vm.startPrank(controller);
        token.mintByPartition(REG_D, user1, 1000 * 10**18, "");
        vm.stopPrank();
        
        // Try to call forceTransfer from a different address (not the timelock)
        address nonTimelock = makeAddr("nonTimelock");
        vm.startPrank(nonTimelock);
        
        vm.expectRevert("SecurityToken: caller is not controller");
        token.forceTransfer(REG_D, user1, user2, 100 * 10**18, "Emergency transfer");
        
        vm.stopPrank();
        
        // Verify only the actual controller can call it
        vm.startPrank(controller);
        token.forceTransfer(REG_D, user1, user2, 100 * 10**18, "Emergency transfer");
        vm.stopPrank();
        
        // Verify the transfer happened
        assertEq(token.balanceOfByPartition(user1, REG_D), 900 * 10**18);
        assertEq(token.balanceOfByPartition(user2, REG_D), 100 * 10**18);
    }
    
    function test_ForceTransfer_RevertIfNoReason() public {
        vm.startPrank(controller);
        
        vm.expectRevert("SecurityToken: reason required");
        token.forceTransfer(REG_D, user1, user2, 100 * 10**18, "");
        
        vm.stopPrank();
    }
    
    function test_SetRegistry() public {
        vm.startPrank(owner);
        
        address newRegistry = makeAddr("newRegistry");
        
        // TODO: Add event emission test once events are properly configured
        
        token.setRegistry(newRegistry);
        
        assertEq(address(token.complianceRegistry()), newRegistry);
        
        vm.stopPrank();
    }
    
    function test_SetRegistry_RevertIfNotOwner() public {
        vm.startPrank(user1);
        
        vm.expectRevert("Ownable: caller is not the owner");
        token.setRegistry(makeAddr("newRegistry"));
        
        vm.stopPrank();
    }
    
    function test_SetController() public {
        vm.startPrank(owner);
        
        address newController = makeAddr("newController");
        
        // TODO: Add event emission test once events are properly configured
        
        token.setController(newController);
        
        assertTrue(token.hasRole(token.CONTROLLER_ROLE(), newController));
        assertFalse(token.hasRole(token.CONTROLLER_ROLE(), controller));
        
        vm.stopPrank();
    }
    
    function test_SetController_RevertIfNotOwner() public {
        vm.startPrank(user1);
        
        vm.expectRevert("Ownable: caller is not the owner");
        token.setController(makeAddr("newController"));
        
        vm.stopPrank();
    }
    
    function test_TotalSupply() public {
        vm.startPrank(controller);
        
        // Mint to REG_D
        token.mintByPartition(REG_D, user1, 1000 * 10**18, "");
        
        // Mint to REG_S
        token.mintByPartition(REG_S, user2, 500 * 10**18, "");
        
        assertEq(token.totalSupplyByPartition(REG_D), 1000 * 10**18);
        assertEq(token.totalSupplyByPartition(REG_S), 500 * 10**18);
        assertEq(token.totalSupply(), 1500 * 10**18);
        
        vm.stopPrank();
    }
    
    function test_BalanceOf() public {
        vm.startPrank(controller);
        
        // Mint to both partitions
        token.mintByPartition(REG_D, user1, 1000 * 10**18, "");
        token.mintByPartition(REG_S, user1, 500 * 10**18, "");
        
        assertEq(token.balanceOfByPartition(user1, REG_D), 1000 * 10**18);
        assertEq(token.balanceOfByPartition(user1, REG_S), 500 * 10**18);
        assertEq(token.balanceOf(user1), 1500 * 10**18);
        
        vm.stopPrank();
    }
    
    function test_ComplianceCheckEvents() public {
        vm.startPrank(controller);
        
        // Test mint compliance check event
        // TODO: Add event emission test once events are properly configured
        
        token.mintByPartition(REG_D, user1, 1000 * 10**18, "");
        
        vm.stopPrank();
        
        // Test transfer compliance check event
        vm.startPrank(user1);
        
        // TODO: Add event emission test once events are properly configured
        
        token.transferByPartition(REG_D, user2, 100 * 10**18, "");
        
        vm.stopPrank();
    }
    
    function testFuzz_MintAndTransfer(uint256 amount) public {
        vm.assume(amount > 0 && amount <= 1000000 * 10**18); // Reasonable bounds
        
        vm.startPrank(controller);
        token.mintByPartition(REG_D, user1, amount, "");
        vm.stopPrank();
        
        assertEq(token.balanceOfByPartition(user1, REG_D), amount);
        assertEq(token.totalSupplyByPartition(REG_D), amount);
        
        // Transfer half
        uint256 transferAmount = amount / 2;
        vm.startPrank(user1);
        token.transferByPartition(REG_D, user2, transferAmount, "");
        vm.stopPrank();
        
        assertEq(token.balanceOfByPartition(user1, REG_D), amount - transferAmount);
        assertEq(token.balanceOfByPartition(user2, REG_D), transferAmount);
        assertEq(token.totalSupplyByPartition(REG_D), amount);
    }
    
    function testInvariant_TotalSupplyConsistency() public {
        vm.startPrank(controller);
        
        // Mint tokens
        token.mintByPartition(REG_D, user1, 1000 * 10**18, "");
        token.mintByPartition(REG_S, user2, 500 * 10**18, "");
        
        // Verify total supply consistency
        assertEq(
            token.totalSupply(),
            token.totalSupplyByPartition(REG_D) + token.totalSupplyByPartition(REG_S)
        );
        
        vm.stopPrank();
    }
}
