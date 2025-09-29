// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {Vesting} from "../src/Vesting.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract VestingTest is Test {
    Vesting public vesting;
    MockERC20 public token;
    address public admin;
    address public beneficiary;
    address public user;
    
    // Test constants
    uint256 public constant TOTAL_AMOUNT = 1000000 * 10**18; // 1M tokens
    uint256 public constant CLIFF_DURATION = 31536000; // 1 year in seconds
    uint256 public constant VESTING_DURATION = 126144000; // 4 years in seconds
    
    function setUp() public {
        admin = makeAddr("admin");
        beneficiary = makeAddr("beneficiary");
        user = makeAddr("user");
        
        // Deploy mock token
        token = new MockERC20("Test Token", "TEST");
        
        // Deploy vesting contract
        vm.startPrank(admin);
        vesting = new Vesting(address(token), admin);
        vm.stopPrank();
        
        // Mint tokens to vesting contract
        token.mint(address(vesting), TOTAL_AMOUNT * 2); // Extra for testing
    }
    
    function test_Constructor() public {
        assertEq(vesting.owner(), admin);
        assertTrue(vesting.hasRole(vesting.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(vesting.hasRole(vesting.VESTING_ADMIN_ROLE(), admin));
        assertEq(address(vesting.token()), address(token));
    }
    
    function test_CreateVestingSchedule_Success() public {
        vm.startPrank(admin);
        
        bytes32 scheduleId = keccak256(abi.encodePacked(beneficiary, block.timestamp, TOTAL_AMOUNT));
        
        vesting.createVestingSchedule(
            beneficiary,
            TOTAL_AMOUNT,
            0, // Start now
            CLIFF_DURATION,
            VESTING_DURATION,
            true // Revocable
        );
        
        // Check vesting schedule was created
        (bool initialized, bool revocable, uint256 startTime, uint256 cliffDuration, 
         uint256 vestingDuration, uint256 totalAmount, uint256 releasedAmount, 
         address scheduleBeneficiary) = vesting.getVestingSchedule(scheduleId);
        
        assertTrue(initialized);
        assertTrue(revocable);
        assertEq(startTime, block.timestamp);
        assertEq(cliffDuration, CLIFF_DURATION);
        assertEq(vestingDuration, VESTING_DURATION);
        assertEq(totalAmount, TOTAL_AMOUNT);
        assertEq(releasedAmount, 0);
        assertEq(scheduleBeneficiary, beneficiary);
        
        // Check beneficiary schedules
        bytes32[] memory schedules = vesting.getBeneficiarySchedules(beneficiary);
        assertEq(schedules.length, 1);
        assertEq(schedules[0], scheduleId);
        
        vm.stopPrank();
    }
    
    function test_CreateVestingSchedule_RevertIfNotAdmin() public {
        vm.startPrank(user);
        
        vm.expectRevert();
        vesting.createVestingSchedule(
            beneficiary,
            TOTAL_AMOUNT,
            0,
            CLIFF_DURATION,
            VESTING_DURATION,
            true
        );
        
        vm.stopPrank();
    }
    
    function test_CreateVestingSchedule_RevertIfInvalidParameters() public {
        vm.startPrank(admin);
        
        // Test zero beneficiary
        vm.expectRevert(Vesting.InvalidVestingParameters.selector);
        vesting.createVestingSchedule(
            address(0),
            TOTAL_AMOUNT,
            0,
            CLIFF_DURATION,
            VESTING_DURATION,
            true
        );
        
        // Test zero amount
        vm.expectRevert(Vesting.InvalidVestingParameters.selector);
        vesting.createVestingSchedule(
            beneficiary,
            0,
            0,
            CLIFF_DURATION,
            VESTING_DURATION,
            true
        );
        
        // Test cliff >= vesting duration
        vm.expectRevert(Vesting.InvalidVestingParameters.selector);
        vesting.createVestingSchedule(
            beneficiary,
            TOTAL_AMOUNT,
            0,
            VESTING_DURATION, // Cliff equals vesting duration
            VESTING_DURATION,
            true
        );
        
        vm.stopPrank();
    }
    
    function test_GetVestedAmount_BeforeCliff() public {
        vm.startPrank(admin);
        
        vesting.createVestingSchedule(
            beneficiary,
            TOTAL_AMOUNT,
            block.timestamp,
            CLIFF_DURATION,
            VESTING_DURATION,
            true
        );
        
        // Before cliff - should be 0
        bytes32 scheduleId = keccak256(abi.encodePacked(beneficiary, block.timestamp, TOTAL_AMOUNT));
        uint256 vestedAmount = vesting.getVestedAmount(scheduleId);
        assertEq(vestedAmount, 0);
        
        vm.stopPrank();
    }
    
    function test_GetVestedAmount_AfterCliffBeforeVesting() public {
        vm.startPrank(admin);
        
        uint256 startTime = block.timestamp;
        vesting.createVestingSchedule(
            beneficiary,
            TOTAL_AMOUNT,
            startTime,
            CLIFF_DURATION,
            VESTING_DURATION,
            true
        );
        
        bytes32 scheduleId = keccak256(abi.encodePacked(beneficiary, startTime, TOTAL_AMOUNT));
        
        // Move to halfway through vesting (after cliff)
        uint256 halfwayTime = startTime + CLIFF_DURATION + (VESTING_DURATION - CLIFF_DURATION) / 2;
        vm.warp(halfwayTime);
        
        uint256 vestedAmount = vesting.getVestedAmount(scheduleId);
        uint256 expectedAmount = TOTAL_AMOUNT / 2; // Should be 50% vested
        
        assertEq(vestedAmount, expectedAmount);
        
        vm.stopPrank();
    }
    
    function test_GetVestedAmount_FullyVested() public {
        vm.startPrank(admin);
        
        uint256 startTime = block.timestamp;
        vesting.createVestingSchedule(
            beneficiary,
            TOTAL_AMOUNT,
            startTime,
            CLIFF_DURATION,
            VESTING_DURATION,
            true
        );
        
        bytes32 scheduleId = keccak256(abi.encodePacked(beneficiary, startTime, TOTAL_AMOUNT));
        
        // Move to after full vesting period
        vm.warp(startTime + VESTING_DURATION + 1);
        
        uint256 vestedAmount = vesting.getVestedAmount(scheduleId);
        assertEq(vestedAmount, TOTAL_AMOUNT);
        
        vm.stopPrank();
    }
    
    function test_Release_Success() public {
        vm.startPrank(admin);
        
        uint256 startTime = block.timestamp;
        vesting.createVestingSchedule(
            beneficiary,
            TOTAL_AMOUNT,
            startTime,
            CLIFF_DURATION,
            VESTING_DURATION,
            true
        );
        
        bytes32 scheduleId = keccak256(abi.encodePacked(beneficiary, startTime, TOTAL_AMOUNT));
        
        // Move to after cliff
        vm.warp(startTime + CLIFF_DURATION + 1);
        
        uint256 initialBalance = token.balanceOf(beneficiary);
        uint256 releasableAmount = vesting.getReleasableAmount(scheduleId);
        
        assertGt(releasableAmount, 0);
        
        vesting.release(scheduleId);
        
        uint256 finalBalance = token.balanceOf(beneficiary);
        assertEq(finalBalance - initialBalance, releasableAmount);
        
        vm.stopPrank();
    }
    
    function test_Release_RevertIfNoTokensToRelease() public {
        vm.startPrank(admin);
        
        uint256 startTime = block.timestamp;
        vesting.createVestingSchedule(
            beneficiary,
            TOTAL_AMOUNT,
            startTime,
            CLIFF_DURATION,
            VESTING_DURATION,
            true
        );
        
        bytes32 scheduleId = keccak256(abi.encodePacked(beneficiary, startTime, TOTAL_AMOUNT));
        
        // Try to release before cliff
        vm.expectRevert(Vesting.NoTokensToRelease.selector);
        vesting.release(scheduleId);
        
        vm.stopPrank();
    }
    
    function test_Revoke_Success() public {
        vm.startPrank(admin);
        
        uint256 startTime = block.timestamp;
        vesting.createVestingSchedule(
            beneficiary,
            TOTAL_AMOUNT,
            startTime,
            CLIFF_DURATION,
            VESTING_DURATION,
            true // Revocable
        );
        
        bytes32 scheduleId = keccak256(abi.encodePacked(beneficiary, startTime, TOTAL_AMOUNT));
        
        vesting.revoke(scheduleId);
        
        // Check that schedule is no longer initialized
        (bool initialized, , , , , , , ) = vesting.getVestingSchedule(scheduleId);
        assertFalse(initialized);
        
        vm.stopPrank();
    }
    
    function test_Revoke_RevertIfNotRevocable() public {
        vm.startPrank(admin);
        
        uint256 startTime = block.timestamp;
        vesting.createVestingSchedule(
            beneficiary,
            TOTAL_AMOUNT,
            startTime,
            CLIFF_DURATION,
            VESTING_DURATION,
            false // Not revocable
        );
        
        bytes32 scheduleId = keccak256(abi.encodePacked(beneficiary, startTime, TOTAL_AMOUNT));
        
        vm.expectRevert(Vesting.VestingScheduleNotRevocable.selector);
        vesting.revoke(scheduleId);
        
        vm.stopPrank();
    }
    
    function test_EmergencyWithdraw() public {
        vm.startPrank(admin);
        
        uint256 withdrawAmount = 100000 * 10**18;
        uint256 initialBalance = token.balanceOf(admin);
        
        vesting.emergencyWithdraw(withdrawAmount);
        
        uint256 finalBalance = token.balanceOf(admin);
        assertEq(finalBalance - initialBalance, withdrawAmount);
        
        vm.stopPrank();
    }
    
    function testFuzz_CreateValidVestingSchedule(
        address _beneficiary,
        uint256 _amount,
        uint256 _cliffDuration,
        uint256 _vestingDuration
    ) public {
        vm.assume(_beneficiary != address(0));
        vm.assume(_amount > 0 && _amount <= 1000000 * 10**18);
        vm.assume(_cliffDuration < _vestingDuration);
        vm.assume(_vestingDuration <= 10 * 365 * 24 * 60 * 60); // Max 10 years
        
        vm.startPrank(admin);
        
        // This should not revert with valid parameters
        vesting.createVestingSchedule(
            _beneficiary,
            _amount,
            block.timestamp,
            _cliffDuration,
            _vestingDuration,
            true
        );
        
        vm.stopPrank();
    }
}
