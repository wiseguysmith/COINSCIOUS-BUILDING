// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {SecurityTokenV2} from "../src/SecurityTokenV2.sol";
import {ComplianceRegistry} from "../src/ComplianceRegistry.sol";

contract SecurityTokenV2Test is Test {
    SecurityTokenV2 public securityToken;
    ComplianceRegistry public complianceRegistry;
    
    address public owner;
    address public controller;
    address public minter;
    address public burner;
    address public user;
    address public recipient;
    
    // Test constants
    uint256 public constant MINT_AMOUNT = 100000 * 10**18;
    uint256 public constant BURN_AMOUNT = 50000 * 10**18;
    bytes32 public constant REG_D = keccak256("REG_D");
    bytes32 public constant REG_S = keccak256("REG_S");
    
    function setUp() public {
        owner = makeAddr("owner");
        controller = makeAddr("controller");
        minter = makeAddr("minter");
        burner = makeAddr("burner");
        user = makeAddr("user");
        recipient = makeAddr("recipient");
        
        // Deploy compliance registry
        vm.startPrank(owner);
        complianceRegistry = new ComplianceRegistry(owner);
        vm.stopPrank();
        
        // Deploy security token
        vm.startPrank(owner);
        securityToken = new SecurityTokenV2();
        securityToken.initialize(
            "Test Security Token V2",
            "TSV2",
            owner,
            controller,
            address(complianceRegistry)
        );
        
        // Grant roles
        securityToken.grantRole(securityToken.MINTER_ROLE(), minter);
        securityToken.grantRole(securityToken.BURNER_ROLE(), burner);
        vm.stopPrank();
    }
    
    function test_Constructor() public {
        assertEq(securityToken.owner(), owner);
        assertTrue(securityToken.hasRole(securityToken.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(securityToken.hasRole(securityToken.CONTROLLER_ROLE(), controller));
    }
    
    function test_Initialize() public {
        assertEq(securityToken.name(), "Test Security Token V2");
        assertEq(securityToken.symbol(), "TSV2");
        assertEq(securityToken.controller(), controller);
        assertEq(address(securityToken.complianceRegistry()), address(complianceRegistry));
    }
    
    function test_MintByPartition_Success() public {
        vm.startPrank(minter);
        
        uint256 initialBalance = securityToken.balanceOfByPartition(REG_D, recipient);
        
        securityToken.mintByPartition(
            REG_D,
            recipient,
            MINT_AMOUNT,
            ""
        );
        
        uint256 finalBalance = securityToken.balanceOfByPartition(REG_D, recipient);
        assertEq(finalBalance - initialBalance, MINT_AMOUNT);
        
        // Check total supply
        assertEq(securityToken.totalSupplyByPartition(REG_D), MINT_AMOUNT);
        
        vm.stopPrank();
    }
    
    function test_MintByPartition_RevertIfNotMinter() public {
        vm.startPrank(user);
        
        vm.expectRevert();
        securityToken.mintByPartition(
            REG_D,
            recipient,
            MINT_AMOUNT,
            ""
        );
        
        vm.stopPrank();
    }
    
    function test_MintByPartition_RevertIfPaused() public {
        vm.startPrank(owner);
        securityToken.pause();
        vm.stopPrank();
        
        vm.startPrank(minter);
        
        vm.expectRevert();
        securityToken.mintByPartition(
            REG_D,
            recipient,
            MINT_AMOUNT,
            ""
        );
        
        vm.stopPrank();
    }
    
    function test_MintByPartition_RevertIfComplianceFailed() public {
        // Freeze recipient in compliance registry
        vm.startPrank(owner);
        complianceRegistry.setClaim(recipient, "frozen", true);
        vm.stopPrank();
        
        vm.startPrank(minter);
        
        vm.expectRevert();
        securityToken.mintByPartition(
            REG_D,
            recipient,
            MINT_AMOUNT,
            ""
        );
        
        vm.stopPrank();
    }
    
    function test_BurnByPartition_Success() public {
        // First mint some tokens
        vm.startPrank(minter);
        securityToken.mintByPartition(
            REG_D,
            recipient,
            MINT_AMOUNT,
            ""
        );
        vm.stopPrank();
        
        // Now burn some tokens
        vm.startPrank(burner);
        
        uint256 initialBalance = securityToken.balanceOfByPartition(REG_D, recipient);
        
        securityToken.burnByPartition(
            REG_D,
            recipient,
            BURN_AMOUNT
        );
        
        uint256 finalBalance = securityToken.balanceOfByPartition(REG_D, recipient);
        assertEq(initialBalance - finalBalance, BURN_AMOUNT);
        
        // Check total supply
        assertEq(securityToken.totalSupplyByPartition(REG_D), MINT_AMOUNT - BURN_AMOUNT);
        
        vm.stopPrank();
    }
    
    function test_BurnByPartition_RevertIfNotBurner() public {
        vm.startPrank(user);
        
        vm.expectRevert();
        securityToken.burnByPartition(
            REG_D,
            recipient,
            BURN_AMOUNT
        );
        
        vm.stopPrank();
    }
    
    function test_BurnByPartition_RevertIfInsufficientBalance() public {
        vm.startPrank(burner);
        
        vm.expectRevert();
        securityToken.burnByPartition(
            REG_D,
            recipient,
            BURN_AMOUNT
        );
        
        vm.stopPrank();
    }
    
    function test_TransferByPartition_Success() public {
        // First mint some tokens
        vm.startPrank(minter);
        securityToken.mintByPartition(
            REG_D,
            user,
            MINT_AMOUNT,
            ""
        );
        vm.stopPrank();
        
        // Transfer tokens
        vm.startPrank(user);
        
        uint256 initialSenderBalance = securityToken.balanceOfByPartition(REG_D, user);
        uint256 initialRecipientBalance = securityToken.balanceOfByPartition(REG_D, recipient);
        
        securityToken.transferByPartition(
            REG_D,
            REG_D,
            recipient,
            BURN_AMOUNT,
            ""
        );
        
        uint256 finalSenderBalance = securityToken.balanceOfByPartition(REG_D, user);
        uint256 finalRecipientBalance = securityToken.balanceOfByPartition(REG_D, recipient);
        
        assertEq(initialSenderBalance - finalSenderBalance, BURN_AMOUNT);
        assertEq(finalRecipientBalance - initialRecipientBalance, BURN_AMOUNT);
        
        vm.stopPrank();
    }
    
    function test_TransferByPartition_RevertIfFrozen() public {
        // First mint some tokens
        vm.startPrank(minter);
        securityToken.mintByPartition(
            REG_D,
            user,
            MINT_AMOUNT,
            ""
        );
        vm.stopPrank();
        
        // Freeze user
        vm.startPrank(owner);
        complianceRegistry.setClaim(user, "frozen", true);
        vm.stopPrank();
        
        // Try to transfer
        vm.startPrank(user);
        
        vm.expectRevert();
        securityToken.transferByPartition(
            REG_D,
            REG_D,
            recipient,
            BURN_AMOUNT,
            ""
        );
        
        vm.stopPrank();
    }
    
    function test_ForceTransferByPartition_Success() public {
        // First mint some tokens
        vm.startPrank(minter);
        securityToken.mintByPartition(
            REG_D,
            user,
            MINT_AMOUNT,
            ""
        );
        vm.stopPrank();
        
        // Force transfer
        vm.startPrank(controller);
        
        uint256 initialSenderBalance = securityToken.balanceOfByPartition(REG_D, user);
        uint256 initialRecipientBalance = securityToken.balanceOfByPartition(REG_D, recipient);
        
        securityToken.forceTransferByPartition(
            REG_D,
            REG_D,
            user,
            recipient,
            BURN_AMOUNT,
            keccak256("COMPLIANCE_REQUIRED"),
            "Compliance enforcement"
        );
        
        uint256 finalSenderBalance = securityToken.balanceOfByPartition(REG_D, user);
        uint256 finalRecipientBalance = securityToken.balanceOfByPartition(REG_D, recipient);
        
        assertEq(initialSenderBalance - finalSenderBalance, BURN_AMOUNT);
        assertEq(finalRecipientBalance - initialRecipientBalance, BURN_AMOUNT);
        
        vm.stopPrank();
    }
    
    function test_ForceTransferByPartition_RevertIfNotController() public {
        vm.startPrank(user);
        
        vm.expectRevert();
        securityToken.forceTransferByPartition(
            REG_D,
            REG_D,
            user,
            recipient,
            BURN_AMOUNT,
            keccak256("COMPLIANCE_REQUIRED"),
            "Compliance enforcement"
        );
        
        vm.stopPrank();
    }
    
    function test_ProposeController() public {
        address newController = makeAddr("newController");
        
        vm.startPrank(owner);
        
        securityToken.proposeController(newController);
        
        assertEq(securityToken.pendingController(), newController);
        
        vm.stopPrank();
    }
    
    function test_AcceptControllerRole() public {
        address newController = makeAddr("newController");
        
        // Propose new controller
        vm.startPrank(owner);
        securityToken.proposeController(newController);
        vm.stopPrank();
        
        // Accept controller role
        vm.startPrank(newController);
        
        address oldController = securityToken.controller();
        securityToken.acceptControllerRole();
        
        assertEq(securityToken.controller(), newController);
        assertEq(securityToken.pendingController(), address(0));
        assertTrue(securityToken.hasRole(securityToken.CONTROLLER_ROLE(), newController));
        assertFalse(securityToken.hasRole(securityToken.CONTROLLER_ROLE(), oldController));
        
        vm.stopPrank();
    }
    
    function test_UpdateComplianceRegistry() public {
        ComplianceRegistry newRegistry = new ComplianceRegistry(owner);
        
        vm.startPrank(owner);
        
        address oldRegistry = address(securityToken.complianceRegistry());
        securityToken.updateComplianceRegistry(address(newRegistry));
        
        assertEq(address(securityToken.complianceRegistry()), address(newRegistry));
        
        vm.stopPrank();
    }
    
    function test_PauseUnpause() public {
        vm.startPrank(owner);
        
        // Pause
        securityToken.pause();
        assertTrue(securityToken.paused());
        
        // Try to mint while paused
        vm.startPrank(minter);
        vm.expectRevert();
        securityToken.mintByPartition(
            REG_D,
            recipient,
            MINT_AMOUNT,
            ""
        );
        vm.stopPrank();
        
        // Unpause
        vm.startPrank(owner);
        securityToken.unpause();
        assertFalse(securityToken.paused());
        
        // Now minting should work
        vm.startPrank(minter);
        securityToken.mintByPartition(
            REG_D,
            recipient,
            MINT_AMOUNT,
            ""
        );
        vm.stopPrank();
        
        vm.stopPrank();
    }
    
    function test_GrantRevokeRole() public {
        vm.startPrank(owner);
        
        // Grant role
        securityToken.grantRole(securityToken.MINTER_ROLE(), user);
        assertTrue(securityToken.hasRole(securityToken.MINTER_ROLE(), user));
        
        // Revoke role
        securityToken.revokeRole(securityToken.MINTER_ROLE(), user);
        assertFalse(securityToken.hasRole(securityToken.MINTER_ROLE(), user));
        
        vm.stopPrank();
    }
    
    function test_GetTotalSupply() public {
        // Mint tokens to both partitions
        vm.startPrank(minter);
        securityToken.mintByPartition(REG_D, recipient, MINT_AMOUNT, "");
        securityToken.mintByPartition(REG_S, user, MINT_AMOUNT / 2, "");
        vm.stopPrank();
        
        uint256 totalSupply = securityToken.totalSupply();
        assertEq(totalSupply, MINT_AMOUNT + MINT_AMOUNT / 2);
    }
    
    function test_GetBalanceOf() public {
        // Mint tokens to both partitions
        vm.startPrank(minter);
        securityToken.mintByPartition(REG_D, recipient, MINT_AMOUNT, "");
        securityToken.mintByPartition(REG_S, recipient, MINT_AMOUNT / 2, "");
        vm.stopPrank();
        
        uint256 totalBalance = securityToken.balanceOf(recipient);
        assertEq(totalBalance, MINT_AMOUNT + MINT_AMOUNT / 2);
    }
    
    function test_Version() public {
        assertEq(securityToken.version(), "2.0.0");
    }
    
    function testFuzz_MintValidAmounts(
        address _recipient,
        uint256 _amount,
        bytes32 _partition
    ) public {
        vm.assume(_recipient != address(0));
        vm.assume(_amount > 0 && _amount <= 1000000 * 10**18);
        vm.assume(_partition == REG_D || _partition == REG_S);
        
        vm.startPrank(minter);
        
        // This should not revert with valid parameters
        securityToken.mintByPartition(_partition, _recipient, _amount, "");
        
        vm.stopPrank();
    }
}
