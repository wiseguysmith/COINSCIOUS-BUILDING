// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {Treasury} from "../src/Treasury.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract TreasuryTest is Test {
    Treasury public treasury;
    MockERC20 public token1;
    MockERC20 public token2;
    
    address public admin;
    address public treasuryRole;
    address public recipient;
    address public user;
    
    // Test constants
    uint256 public constant INITIAL_BALANCE = 1000000 * 10**18;
    uint256 public constant SEND_AMOUNT = 100000 * 10**18;
    
    function setUp() public {
        admin = makeAddr("admin");
        treasuryRole = makeAddr("treasuryRole");
        recipient = makeAddr("recipient");
        user = makeAddr("user");
        
        // Deploy treasury
        treasury = new Treasury(admin);
        
        // Deploy mock tokens
        token1 = new MockERC20("Token 1", "TK1");
        token2 = new MockERC20("Token 2", "TK2");
        
        // Grant treasury role
        vm.startPrank(admin);
        treasury.grantRole(treasury.TREASURY_ROLE(), treasuryRole);
        
        // Add supported tokens
        treasury.addSupportedToken(address(token1));
        treasury.addSupportedToken(address(token2));
        
        // Set spending limits
        treasury.setSpendingLimits(
            address(token1),
            500000 * 10**18, // Daily limit
            10000000 * 10**18 // Monthly limit
        );
        
        vm.stopPrank();
        
        // Mint tokens to treasury
        token1.mint(address(treasury), INITIAL_BALANCE);
        token2.mint(address(treasury), INITIAL_BALANCE);
    }
    
    function test_Constructor() public {
        assertTrue(treasury.hasRole(treasury.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(treasury.hasRole(treasury.TREASURY_ADMIN_ROLE(), admin));
        assertTrue(treasury.hasRole(treasury.TREASURY_ROLE(), admin));
    }
    
    function test_AddSupportedToken() public {
        MockERC20 newToken = new MockERC20("New Token", "NEW");
        
        vm.startPrank(admin);
        treasury.addSupportedToken(address(newToken));
        
        assertTrue(treasury.supportedTokens(address(newToken)));
        
        vm.stopPrank();
    }
    
    function test_AddSupportedToken_RevertIfNotAdmin() public {
        MockERC20 newToken = new MockERC20("New Token", "NEW");
        
        vm.startPrank(user);
        vm.expectRevert();
        treasury.addSupportedToken(address(newToken));
        vm.stopPrank();
    }
    
    function test_SendTokens_Success() public {
        vm.startPrank(treasuryRole);
        
        uint256 initialBalance = token1.balanceOf(recipient);
        uint256 treasuryBalance = token1.balanceOf(address(treasury));
        
        treasury.sendTokens(
            address(token1),
            recipient,
            SEND_AMOUNT,
            "Partnership payment"
        );
        
        uint256 finalBalance = token1.balanceOf(recipient);
        uint256 finalTreasuryBalance = token1.balanceOf(address(treasury));
        
        assertEq(finalBalance - initialBalance, SEND_AMOUNT);
        assertEq(treasuryBalance - finalTreasuryBalance, SEND_AMOUNT);
        
        // Check transaction record
        assertEq(treasury.getTransactionCount(), 1);
        (address token, address to, uint256 amount, string memory purpose, 
         uint256 timestamp, address executor, bool isIncoming) = treasury.getTransaction(0);
        
        assertEq(token, address(token1));
        assertEq(to, recipient);
        assertEq(amount, SEND_AMOUNT);
        assertEq(purpose, "Partnership payment");
        assertEq(executor, treasuryRole);
        assertFalse(isIncoming);
        
        vm.stopPrank();
    }
    
    function test_SendTokens_RevertIfNotTreasuryRole() public {
        vm.startPrank(user);
        
        vm.expectRevert();
        treasury.sendTokens(
            address(token1),
            recipient,
            SEND_AMOUNT,
            "Partnership payment"
        );
        
        vm.stopPrank();
    }
    
    function test_SendTokens_RevertIfTokenNotSupported() public {
        MockERC20 unsupportedToken = new MockERC20("Unsupported", "UNS");
        
        vm.startPrank(treasuryRole);
        
        vm.expectRevert(Treasury.TokenNotSupported.selector);
        treasury.sendTokens(
            address(unsupportedToken),
            recipient,
            SEND_AMOUNT,
            "Partnership payment"
        );
        
        vm.stopPrank();
    }
    
    function test_SendTokens_RevertIfInsufficientBalance() public {
        uint256 excessiveAmount = token1.balanceOf(address(treasury)) + 1;
        
        vm.startPrank(treasuryRole);
        
        vm.expectRevert(Treasury.InsufficientBalance.selector);
        treasury.sendTokens(
            address(token1),
            recipient,
            excessiveAmount,
            "Partnership payment"
        );
        
        vm.stopPrank();
    }
    
    function test_SendTokens_RevertIfExceedsDailyLimit() public {
        uint256 excessiveAmount = 600000 * 10**18; // Exceeds daily limit
        
        vm.startPrank(treasuryRole);
        
        vm.expectRevert(Treasury.ExceedsDailyLimit.selector);
        treasury.sendTokens(
            address(token1),
            recipient,
            excessiveAmount,
            "Partnership payment"
        );
        
        vm.stopPrank();
    }
    
    function test_BatchSendTokens_Success() public {
        address[] memory recipients = new address[](2);
        recipients[0] = recipient;
        recipients[1] = user;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = SEND_AMOUNT;
        amounts[1] = SEND_AMOUNT / 2;
        
        vm.startPrank(treasuryRole);
        
        uint256 initialRecipientBalance = token1.balanceOf(recipient);
        uint256 initialUserBalance = token1.balanceOf(user);
        
        treasury.batchSendTokens(
            address(token1),
            recipients,
            amounts,
            "Batch partnership payment"
        );
        
        uint256 finalRecipientBalance = token1.balanceOf(recipient);
        uint256 finalUserBalance = token1.balanceOf(user);
        
        assertEq(finalRecipientBalance - initialRecipientBalance, SEND_AMOUNT);
        assertEq(finalUserBalance - initialUserBalance, SEND_AMOUNT / 2);
        
        // Check transaction records
        assertEq(treasury.getTransactionCount(), 2);
        
        vm.stopPrank();
    }
    
    function test_ReceiveTokens_Success() public {
        uint256 receiveAmount = 50000 * 10**18;
        
        // Mint tokens to user first
        token1.mint(user, receiveAmount);
        
        vm.startPrank(user);
        
        uint256 initialTreasuryBalance = token1.balanceOf(address(treasury));
        
        treasury.receiveTokens(
            address(token1),
            receiveAmount,
            "Token deposit"
        );
        
        uint256 finalTreasuryBalance = token1.balanceOf(address(treasury));
        
        assertEq(finalTreasuryBalance - initialTreasuryBalance, receiveAmount);
        
        // Check transaction record
        assertEq(treasury.getTransactionCount(), 1);
        (address token, address to, uint256 amount, string memory purpose, 
         uint256 timestamp, address executor, bool isIncoming) = treasury.getTransaction(0);
        
        assertEq(token, address(token1));
        assertEq(to, address(treasury));
        assertEq(amount, receiveAmount);
        assertEq(purpose, "Token deposit");
        assertEq(executor, user);
        assertTrue(isIncoming);
        
        vm.stopPrank();
    }
    
    function test_SetSpendingLimits() public {
        vm.startPrank(admin);
        
        uint256 newDailyLimit = 800000 * 10**18;
        uint256 newMonthlyLimit = 15000000 * 10**18;
        
        treasury.setSpendingLimits(
            address(token1),
            newDailyLimit,
            newMonthlyLimit
        );
        
        (uint256 dailyLimit, uint256 monthlyLimit, , , , ) = treasury.getSpendingLimit(address(token1));
        
        assertEq(dailyLimit, newDailyLimit);
        assertEq(monthlyLimit, newMonthlyLimit);
        
        vm.stopPrank();
    }
    
    function test_UpdateTreasuryValue() public {
        vm.startPrank(admin);
        
        uint256 newValue = 5000000 * 10**8; // $5M in basis points
        
        treasury.updateTreasuryValue(newValue);
        
        assertEq(treasury.totalTreasuryValue(), newValue);
        assertEq(treasury.lastValueUpdate(), block.timestamp);
        
        vm.stopPrank();
    }
    
    function test_PauseUnpause() public {
        vm.startPrank(admin);
        
        // Pause
        treasury.pause();
        assertTrue(treasury.paused());
        
        // Try to send tokens while paused
        vm.startPrank(treasuryRole);
        vm.expectRevert();
        treasury.sendTokens(
            address(token1),
            recipient,
            SEND_AMOUNT,
            "Partnership payment"
        );
        vm.stopPrank();
        
        // Unpause
        vm.startPrank(admin);
        treasury.unpause();
        assertFalse(treasury.paused());
        
        // Now sending should work
        vm.startPrank(treasuryRole);
        treasury.sendTokens(
            address(token1),
            recipient,
            SEND_AMOUNT,
            "Partnership payment"
        );
        vm.stopPrank();
        
        vm.stopPrank();
    }
    
    function test_EmergencyWithdraw() public {
        uint256 withdrawAmount = 100000 * 10**18;
        
        vm.startPrank(admin);
        
        uint256 initialBalance = token1.balanceOf(admin);
        
        treasury.emergencyWithdraw(address(token1), withdrawAmount);
        
        uint256 finalBalance = token1.balanceOf(admin);
        assertEq(finalBalance - initialBalance, withdrawAmount);
        
        vm.stopPrank();
    }
    
    function test_GetTokenBalance() public {
        uint256 balance = treasury.getTokenBalance(address(token1));
        assertEq(balance, token1.balanceOf(address(treasury)));
    }
    
    function testFuzz_SendValidAmounts(
        address _recipient,
        uint256 _amount
    ) public {
        vm.assume(_recipient != address(0));
        vm.assume(_amount > 0 && _amount <= 100000 * 10**18); // Within limits
        
        vm.startPrank(treasuryRole);
        
        // This should not revert with valid parameters
        treasury.sendTokens(
            address(token1),
            _recipient,
            _amount,
            "Fuzz test payment"
        );
        
        vm.stopPrank();
    }
}
