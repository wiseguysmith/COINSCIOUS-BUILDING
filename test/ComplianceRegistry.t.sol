// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {ComplianceRegistry} from "../src/ComplianceRegistry.sol";
import {IComplianceRegistry} from "../src/interfaces/IComplianceRegistry.sol";

contract ComplianceRegistryTest is Test {
    ComplianceRegistry public registry;
    
    address public owner;
    address public oracle;
    address public user1;
    address public user2;
    address public user3;
    address public user4;
    
    function setUp() public {
        owner = makeAddr("owner");
        oracle = makeAddr("oracle");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");
        user4 = makeAddr("user4");
        
        vm.startPrank(owner);
        registry = new ComplianceRegistry();
        
        // Grant oracle role to oracle address
        registry.grantRole(registry.ORACLE_ROLE(), oracle);
        vm.stopPrank();
    }
    
    function test_Constructor() public {
        assertTrue(registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(registry.hasRole(registry.ORACLE_ROLE(), owner));
        assertTrue(registry.hasRole(registry.ORACLE_ROLE(), oracle));
    }
    
    function test_SetClaims_Success() public {
        vm.startPrank(oracle);
        
        IComplianceRegistry.Claims memory claims = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: uint64(block.timestamp + 30 days),
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        
        vm.expectEmit(true, false, false, true);
        emit ComplianceRegistry.ClaimsSet(user1, claims);
        
        registry.setClaims(user1, claims);
        
        IComplianceRegistry.Claims memory storedClaims = registry.getClaims(user1);
        assertEq(storedClaims.countryCode, bytes2("US"));
        assertTrue(storedClaims.accredited);
        assertEq(storedClaims.lockupUntil, block.timestamp + 30 days);
        assertFalse(storedClaims.revoked);
        assertEq(storedClaims.expiresAt, block.timestamp + 365 days);
        assertTrue(registry.isWalletWhitelisted(user1));
        
        vm.stopPrank();
    }
    
    function test_SetClaims_RevertIfNotOracle() public {
        vm.startPrank(user1);
        
        IComplianceRegistry.Claims memory claims = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        
        vm.expectRevert("OracleRole: caller is not oracle");
        registry.setClaims(user1, claims);
        
        vm.stopPrank();
    }
    
    function test_SetClaims_RevertIfZeroWallet() public {
        vm.startPrank(oracle);
        
        IComplianceRegistry.Claims memory claims = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        
        vm.expectRevert("ComplianceRegistry: wallet cannot be zero");
        registry.setClaims(address(0), claims);
        
        vm.stopPrank();
    }
    
    function test_SetClaims_RevertIfNoCountryCode() public {
        vm.startPrank(oracle);
        
        IComplianceRegistry.Claims memory claims = IComplianceRegistry.Claims({
            countryCode: bytes2(0),
            accredited: true,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        
        vm.expectRevert("ComplianceRegistry: country code required");
        registry.setClaims(user1, claims);
        
        vm.stopPrank();
    }
    
    function test_SetClaims_RevertIfLockupInPast() public {
        vm.startPrank(oracle);
        
        IComplianceRegistry.Claims memory claims = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: uint64(block.timestamp - 1 days),
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        
        vm.expectRevert("ComplianceRegistry: lockup must be in future");
        registry.setClaims(user1, claims);
        
        vm.stopPrank();
    }
    
    function test_SetClaims_RevertIfExpirationInPast() public {
        vm.startPrank(oracle);
        
        IComplianceRegistry.Claims memory claims = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp - 1 days)
        });
        
        vm.expectRevert("ComplianceRegistry: expiration must be in future");
        registry.setClaims(user1, claims);
        
        vm.stopPrank();
    }
    
    function test_Revoke_Success() public {
        // First set claims
        vm.startPrank(oracle);
        IComplianceRegistry.Claims memory claims = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        registry.setClaims(user1, claims);
        assertTrue(registry.isWalletWhitelisted(user1));
        
        // Then revoke
        vm.expectEmit(true, false, false, true);
        emit ComplianceRegistry.WalletRevoked(user1);
        
        registry.revoke(user1);
        
        assertFalse(registry.isWalletWhitelisted(user1));
        assertTrue(registry.isRevoked(user1));
        
        vm.stopPrank();
    }
    
    function test_Revoke_RevertIfNotOracle() public {
        vm.startPrank(user1);
        
        vm.expectRevert("OracleRole: caller is not oracle");
        registry.revoke(user1);
        
        vm.stopPrank();
    }
    
    function test_Whitelist_Success() public {
        // First set claims
        vm.startPrank(oracle);
        IComplianceRegistry.Claims memory claims = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        registry.setClaims(user1, claims);
        
        // Then whitelist
        vm.expectEmit(true, false, false, true);
        emit ComplianceRegistry.WalletWhitelisted(user1);
        
        registry.whitelist(user1);
        
        assertTrue(registry.isWalletWhitelisted(user1));
        assertFalse(registry.isRevoked(user1));
        
        vm.stopPrank();
    }
    
    function test_Whitelist_RevertIfNotOracle() public {
        vm.startPrank(user1);
        
        vm.expectRevert("OracleRole: caller is not oracle");
        registry.whitelist(user1);
        
        vm.stopPrank();
    }
    
    function test_Whitelist_RevertIfNoClaims() public {
        vm.startPrank(oracle);
        
        vm.expectRevert("ComplianceRegistry: claims must be set first");
        registry.whitelist(user1);
        
        vm.stopPrank();
    }
    
    function test_IsWalletWhitelisted_Success() public {
        vm.startPrank(oracle);
        
        IComplianceRegistry.Claims memory claims = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        
        registry.setClaims(user1, claims);
        assertTrue(registry.isWalletWhitelisted(user1));
        
        vm.stopPrank();
    }
    
    function test_IsWalletWhitelisted_ZeroAddress() public {
        assertFalse(registry.isWalletWhitelisted(address(0)));
    }
    
    function test_IsWalletWhitelisted_NoClaims() public {
        assertFalse(registry.isWalletWhitelisted(user1));
    }
    
    function test_IsWalletWhitelisted_Revoked() public {
        vm.startPrank(oracle);
        
        IComplianceRegistry.Claims memory claims = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        
        registry.setClaims(user1, claims);
        assertTrue(registry.isWalletWhitelisted(user1));
        
        registry.revoke(user1);
        assertFalse(registry.isWalletWhitelisted(user1));
        
        vm.stopPrank();
    }
    
    function test_IsWalletWhitelisted_Expired() public {
        vm.startPrank(oracle);
        
        IComplianceRegistry.Claims memory claims = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 1 days)
        });
        
        registry.setClaims(user1, claims);
        assertTrue(registry.isWalletWhitelisted(user1));
        
        // Fast forward time
        vm.warp(block.timestamp + 2 days);
        assertFalse(registry.isWalletWhitelisted(user1));
        
        vm.stopPrank();
    }
    
    function test_IsTransferAllowed_RegD_Accredited() public {
        vm.startPrank(oracle);
        
        IComplianceRegistry.Claims memory claims1 = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        
        IComplianceRegistry.Claims memory claims2 = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        
        registry.setClaims(user1, claims1);
        registry.setClaims(user2, claims2);
        
        (bool ok, string memory reason) = registry.isTransferAllowed(user1, user2, keccak256("REG_D"), 1000);
        assertTrue(ok);
        assertEq(reason, registry.REASON_OK());
        
        vm.stopPrank();
    }
    
    function test_IsTransferAllowed_RegD_NotAccredited() public {
        vm.startPrank(oracle);
        
        IComplianceRegistry.Claims memory claims1 = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        
        IComplianceRegistry.Claims memory claims2 = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: false,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        
        registry.setClaims(user1, claims1);
        registry.setClaims(user2, claims2);
        
        (bool ok, string memory reason) = registry.isTransferAllowed(user1, user2, keccak256("REG_D"), 1000);
        assertFalse(ok);
        assertEq(reason, registry.REASON_NOT_ACCREDITED());
        
        vm.stopPrank();
    }
    
    function test_IsTransferAllowed_RegS_USPerson() public {
        vm.startPrank(oracle);
        
        IComplianceRegistry.Claims memory claims1 = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        
        IComplianceRegistry.Claims memory claims2 = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        
        registry.setClaims(user1, claims1);
        registry.setClaims(user2, claims2);
        
        (bool ok, string memory reason) = registry.isTransferAllowed(user1, user2, keccak256("REG_S"), 1000);
        assertFalse(ok);
        assertEq(reason, registry.REASON_US_PERSON_RESTRICTED());
        
        vm.stopPrank();
    }
    
    function test_IsTransferAllowed_RegS_NonUSPerson() public {
        vm.startPrank(oracle);
        
        IComplianceRegistry.Claims memory claims1 = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        
        IComplianceRegistry.Claims memory claims2 = IComplianceRegistry.Claims({
            countryCode: bytes2("CA"),
            accredited: true,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        
        registry.setClaims(user1, claims1);
        registry.setClaims(user2, claims2);
        
        (bool ok, string memory reason) = registry.isTransferAllowed(user1, user2, keccak256("REG_S"), 1000);
        assertTrue(ok);
        assertEq(reason, registry.REASON_OK());
        
        vm.stopPrank();
    }
    
    function test_IsTransferAllowed_LockupActive() public {
        vm.startPrank(oracle);
        
        IComplianceRegistry.Claims memory claims1 = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: uint64(block.timestamp + 30 days),
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        
        IComplianceRegistry.Claims memory claims2 = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        
        registry.setClaims(user1, claims1);
        registry.setClaims(user2, claims2);
        
        (bool ok, string memory reason) = registry.isTransferAllowed(user1, user2, keccak256("REG_D"), 1000);
        assertFalse(ok);
        assertTrue(keccak256(abi.encodePacked(reason)) == keccak256(abi.encodePacked(registry.REASON_LOCKUP_ACTIVE(), "30")));
        
        vm.stopPrank();
    }
    
    function test_IsTransferAllowed_FromNotWhitelisted() public {
        vm.startPrank(oracle);
        
        IComplianceRegistry.Claims memory claims2 = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        
        registry.setClaims(user2, claims2);
        
        (bool ok, string memory reason) = registry.isTransferAllowed(user1, user2, keccak256("REG_D"), 1000);
        assertFalse(ok);
        assertEq(reason, registry.REASON_NOT_WHITELISTED());
        
        vm.stopPrank();
    }
    
    function test_IsTransferAllowed_ToNotWhitelisted() public {
        vm.startPrank(oracle);
        
        IComplianceRegistry.Claims memory claims1 = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        
        registry.setClaims(user1, claims1);
        
        (bool ok, string memory reason) = registry.isTransferAllowed(user1, user2, keccak256("REG_D"), 1000);
        assertFalse(ok);
        assertEq(reason, registry.REASON_NOT_WHITELISTED());
        
        vm.stopPrank();
    }
    
    function test_GetClaims_Success() public {
        vm.startPrank(oracle);
        
        IComplianceRegistry.Claims memory claims = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: uint64(block.timestamp + 30 days),
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        
        registry.setClaims(user1, claims);
        
        IComplianceRegistry.Claims memory storedClaims = registry.getClaims(user1);
        assertEq(storedClaims.countryCode, bytes2("US"));
        assertTrue(storedClaims.accredited);
        assertEq(storedClaims.lockupUntil, block.timestamp + 30 days);
        assertFalse(storedClaims.revoked);
        assertEq(storedClaims.expiresAt, block.timestamp + 365 days);
        
        vm.stopPrank();
    }
    
    function test_GetClaims_NoClaims() public {
        IComplianceRegistry.Claims memory claims = registry.getClaims(user1);
        assertEq(claims.countryCode, bytes2(0));
        assertFalse(claims.accredited);
        assertEq(claims.lockupUntil, 0);
        assertFalse(claims.revoked);
        assertEq(claims.expiresAt, 0);
    }
    
    function test_SetClaims_UpdateExisting() public {
        vm.startPrank(oracle);
        
        IComplianceRegistry.Claims memory claims1 = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        
        registry.setClaims(user1, claims1);
        
        IComplianceRegistry.Claims memory claims2 = IComplianceRegistry.Claims({
            countryCode: bytes2("CA"),
            accredited: false,
            lockupUntil: uint64(block.timestamp + 60 days),
            revoked: false,
            expiresAt: uint64(block.timestamp + 730 days)
        });
        
        registry.setClaims(user1, claims2);
        
        IComplianceRegistry.Claims memory storedClaims = registry.getClaims(user1);
        assertEq(storedClaims.countryCode, bytes2("CA"));
        assertFalse(storedClaims.accredited);
        assertEq(storedClaims.lockupUntil, block.timestamp + 60 days);
        assertFalse(storedClaims.revoked);
        assertEq(storedClaims.expiresAt, block.timestamp + 730 days);
        
        vm.stopPrank();
    }
    
    function test_SetClaims_RevokeThenReclaim() public {
        vm.startPrank(oracle);
        
        IComplianceRegistry.Claims memory claims = IComplianceRegistry.Claims({
            countryCode: bytes2("US"),
            accredited: true,
            lockupUntil: 0,
            revoked: false,
            expiresAt: uint64(block.timestamp + 365 days)
        });
        
        registry.setClaims(user1, claims);
        assertTrue(registry.isWalletWhitelisted(user1));
        
        registry.revoke(user1);
        assertFalse(registry.isWalletWhitelisted(user1));
        assertTrue(registry.isRevoked(user1));
        
        // Set claims again should re-whitelist
        registry.setClaims(user1, claims);
        assertTrue(registry.isWalletWhitelisted(user1));
        assertFalse(registry.isRevoked(user1));
        
        vm.stopPrank();
    }
}
