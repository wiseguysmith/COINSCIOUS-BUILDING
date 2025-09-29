// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {MintBurnManager} from "../src/MintBurnManager.sol";
import {SecurityToken} from "../src/SecurityToken.sol";
import {ComplianceRegistry} from "../src/ComplianceRegistry.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract MintBurnManagerTest is Test {
    MintBurnManager public mintBurnManager;
    SecurityToken public securityToken;
    ComplianceRegistry public complianceRegistry;
    
    address public admin;
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
        admin = makeAddr("admin");
        minter = makeAddr("minter");
        burner = makeAddr("burner");
        user = makeAddr("user");
        recipient = makeAddr("recipient");
        
        // Deploy compliance registry
        vm.startPrank(admin);
        complianceRegistry = new ComplianceRegistry(admin);
        vm.stopPrank();
        
        // Deploy security token
        vm.startPrank(admin);
        securityToken = new SecurityToken();
        securityToken.initialize(
            "Test Security Token",
            "TST",
            admin,
            admin,
            address(complianceRegistry)
        );
        vm.stopPrank();
        
        // Deploy mint/burn manager
        vm.startPrank(admin);
        mintBurnManager = new MintBurnManager(address(securityToken), admin);
        
        // Grant roles
        mintBurnManager.grantRole(mintBurnManager.MINTER_ROLE(), minter);
        mintBurnManager.grantRole(mintBurnManager.BURNER_ROLE(), burner);
        vm.stopPrank();
    }
    
    function test_Constructor() public {
        assertEq(address(mintBurnManager.securityToken()), address(securityToken));
        assertTrue(mintBurnManager.hasRole(mintBurnManager.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(mintBurnManager.hasRole(mintBurnManager.MANAGER_ADMIN_ROLE(), admin));
        assertTrue(mintBurnManager.hasRole(mintBurnManager.MINTER_ROLE(), admin));
        assertTrue(mintBurnManager.hasRole(mintBurnManager.BURNER_ROLE(), admin));
    }
    
    function test_Mint_Success() public {
        vm.startPrank(minter);
        
        uint256 initialBalance = securityToken.balanceOfByPartition(REG_D, recipient);
        
        mintBurnManager.mint(
            recipient,
            MINT_AMOUNT,
            REG_D,
            "Property deed contribution"
        );
        
        uint256 finalBalance = securityToken.balanceOfByPartition(REG_D, recipient);
        assertEq(finalBalance - initialBalance, MINT_AMOUNT);
        
        // Check mint record
        assertEq(mintBurnManager.getMintRecordsCount(), 1);
        (address to, uint256 amount, bytes32 partition, string memory reason, 
         uint256 timestamp, address minterAddr) = mintBurnManager.getMintRecord(0);
        
        assertEq(to, recipient);
        assertEq(amount, MINT_AMOUNT);
        assertEq(partition, REG_D);
        assertEq(reason, "Property deed contribution");
        assertEq(minterAddr, minter);
        
        vm.stopPrank();
    }
    
    function test_Mint_RevertIfNotMinter() public {
        vm.startPrank(user);
        
        vm.expectRevert();
        mintBurnManager.mint(
            recipient,
            MINT_AMOUNT,
            REG_D,
            "Property deed contribution"
        );
        
        vm.stopPrank();
    }
    
    function test_Mint_RevertIfInvalidParameters() public {
        vm.startPrank(minter);
        
        // Test zero recipient
        vm.expectRevert(MintBurnManager.InvalidRecipient.selector);
        mintBurnManager.mint(
            address(0),
            MINT_AMOUNT,
            REG_D,
            "Property deed contribution"
        );
        
        // Test zero amount
        vm.expectRevert(MintBurnManager.InvalidAmount.selector);
        mintBurnManager.mint(
            recipient,
            0,
            REG_D,
            "Property deed contribution"
        );
        
        // Test invalid partition
        vm.expectRevert(MintBurnManager.InvalidPartition.selector);
        mintBurnManager.mint(
            recipient,
            MINT_AMOUNT,
            keccak256("INVALID"),
            "Property deed contribution"
        );
        
        vm.stopPrank();
    }
    
    function test_Mint_RevertIfExceedsLimit() public {
        vm.startPrank(minter);
        
        uint256 excessiveAmount = mintBurnManager.maxMintPerTransaction() + 1;
        
        vm.expectRevert(MintBurnManager.ExceedsMintLimit.selector);
        mintBurnManager.mint(
            recipient,
            excessiveAmount,
            REG_D,
            "Property deed contribution"
        );
        
        vm.stopPrank();
    }
    
    function test_Burn_Success() public {
        // First mint some tokens
        vm.startPrank(minter);
        mintBurnManager.mint(
            recipient,
            MINT_AMOUNT,
            REG_D,
            "Initial mint"
        );
        vm.stopPrank();
        
        // Now burn some tokens
        vm.startPrank(burner);
        
        uint256 initialBalance = securityToken.balanceOfByPartition(REG_D, recipient);
        
        mintBurnManager.burn(
            recipient,
            BURN_AMOUNT,
            REG_D,
            "Property redemption"
        );
        
        uint256 finalBalance = securityToken.balanceOfByPartition(REG_D, recipient);
        assertEq(initialBalance - finalBalance, BURN_AMOUNT);
        
        // Check burn record
        assertEq(mintBurnManager.getBurnRecordsCount(), 1);
        (address from, uint256 amount, bytes32 partition, string memory reason, 
         uint256 timestamp, address burnerAddr) = mintBurnManager.getBurnRecord(0);
        
        assertEq(from, recipient);
        assertEq(amount, BURN_AMOUNT);
        assertEq(partition, REG_D);
        assertEq(reason, "Property redemption");
        assertEq(burnerAddr, burner);
        
        vm.stopPrank();
    }
    
    function test_Burn_RevertIfNotBurner() public {
        vm.startPrank(user);
        
        vm.expectRevert();
        mintBurnManager.burn(
            recipient,
            BURN_AMOUNT,
            REG_D,
            "Property redemption"
        );
        
        vm.stopPrank();
    }
    
    function test_Burn_RevertIfInsufficientBalance() public {
        vm.startPrank(burner);
        
        vm.expectRevert(MintBurnManager.InsufficientBalance.selector);
        mintBurnManager.burn(
            recipient,
            BURN_AMOUNT,
            REG_D,
            "Property redemption"
        );
        
        vm.stopPrank();
    }
    
    function test_BatchMint_Success() public {
        address[] memory recipients = new address[](2);
        recipients[0] = recipient;
        recipients[1] = user;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = MINT_AMOUNT;
        amounts[1] = MINT_AMOUNT / 2;
        
        vm.startPrank(minter);
        
        mintBurnManager.batchMint(
            recipients,
            amounts,
            REG_D,
            "Batch property contribution"
        );
        
        // Check balances
        assertEq(securityToken.balanceOfByPartition(REG_D, recipient), MINT_AMOUNT);
        assertEq(securityToken.balanceOfByPartition(REG_D, user), MINT_AMOUNT / 2);
        
        // Check mint records
        assertEq(mintBurnManager.getMintRecordsCount(), 2);
        
        vm.stopPrank();
    }
    
    function test_SetLimits() public {
        vm.startPrank(admin);
        
        uint256 newMaxMint = 2000000 * 10**18;
        uint256 newMaxBurn = 1500000 * 10**18;
        uint256 newDailyMint = 20000000 * 10**18;
        uint256 newDailyBurn = 15000000 * 10**18;
        
        mintBurnManager.setLimits(
            newMaxMint,
            newMaxBurn,
            newDailyMint,
            newDailyBurn
        );
        
        assertEq(mintBurnManager.maxMintPerTransaction(), newMaxMint);
        assertEq(mintBurnManager.maxBurnPerTransaction(), newMaxBurn);
        assertEq(mintBurnManager.dailyMintLimit(), newDailyMint);
        assertEq(mintBurnManager.dailyBurnLimit(), newDailyBurn);
        
        vm.stopPrank();
    }
    
    function test_PauseUnpause() public {
        vm.startPrank(admin);
        
        // Pause
        mintBurnManager.pauseMinting();
        assertTrue(mintBurnManager.paused());
        
        // Try to mint while paused
        vm.startPrank(minter);
        vm.expectRevert();
        mintBurnManager.mint(
            recipient,
            MINT_AMOUNT,
            REG_D,
            "Property deed contribution"
        );
        vm.stopPrank();
        
        // Unpause
        vm.startPrank(admin);
        mintBurnManager.unpauseMinting();
        assertFalse(mintBurnManager.paused());
        
        // Now minting should work
        vm.startPrank(minter);
        mintBurnManager.mint(
            recipient,
            MINT_AMOUNT,
            REG_D,
            "Property deed contribution"
        );
        vm.stopPrank();
        
        vm.stopPrank();
    }
    
    function test_GetDailyAmounts() public {
        vm.startPrank(minter);
        
        mintBurnManager.mint(
            recipient,
            MINT_AMOUNT,
            REG_D,
            "Property deed contribution"
        );
        
        uint256 today = mintBurnManager._getToday();
        (uint256 minted, uint256 burned) = mintBurnManager.getDailyAmounts(today);
        
        assertEq(minted, MINT_AMOUNT);
        assertEq(burned, 0);
        
        vm.stopPrank();
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
        mintBurnManager.mint(
            _recipient,
            _amount,
            _partition,
            "Fuzz test mint"
        );
        
        vm.stopPrank();
    }
}
