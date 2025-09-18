// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {LogAnchor} from "../src/LogAnchor.sol";

contract LogAnchorTest is Test {
    LogAnchor public logAnchor;
    address public owner;
    address public user;
    
    // Test constants
    uint256 public constant TEST_DAY = 20241201;
    uint256 public constant TEST_DAY_2 = 20241202;
    bytes32 public constant TEST_ROOT = keccak256("test_root_1");
    bytes32 public constant TEST_ROOT_2 = keccak256("test_root_2");
    bytes32 public constant TEST_ROOT_UPDATED = keccak256("test_root_updated");
    
    function setUp() public {
        owner = makeAddr("owner");
        user = makeAddr("user");
        
        vm.startPrank(owner);
        logAnchor = new LogAnchor();
        vm.stopPrank();
    }
    
    function test_Constructor() public {
        assertEq(logAnchor.owner(), owner);
        assertEq(logAnchor.MIN_DAY(), 20240101);
        assertEq(logAnchor.MAX_DAY(), 20991231);
    }
    
    function test_CommitLogRoot_Success() public {
        vm.startPrank(owner);
        
        // TODO: Add event emission test once events are properly configured
        
        logAnchor.commitLogRoot(TEST_DAY, TEST_ROOT);
        
        assertEq(logAnchor.dailyRoots(TEST_DAY), TEST_ROOT);
        assertTrue(logAnchor.hasRoot(TEST_DAY));
        
        vm.stopPrank();
    }
    
    function test_CommitLogRoot_UpdateExisting() public {
        vm.startPrank(owner);
        
        // First commit
        logAnchor.commitLogRoot(TEST_DAY, TEST_ROOT);
        
        // Update with new root
        // TODO: Add event emission test once events are properly configured
        
        logAnchor.commitLogRoot(TEST_DAY, TEST_ROOT_UPDATED);
        
        assertEq(logAnchor.dailyRoots(TEST_DAY), TEST_ROOT_UPDATED);
        
        vm.stopPrank();
    }
    
    function test_CommitLogRoot_RevertIfNotOwner() public {
        vm.startPrank(user);
        
        vm.expectRevert("Ownable: caller is not the owner");
        logAnchor.commitLogRoot(TEST_DAY, TEST_ROOT);
        
        vm.stopPrank();
    }
    
    function test_CommitLogRoot_RevertIfInvalidDay() public {
        vm.startPrank(owner);
        
        // Test day before MIN_DAY
        vm.expectRevert("LogAnchor: invalid day");
        logAnchor.commitLogRoot(20230101, TEST_ROOT);
        
        // Test day after MAX_DAY
        vm.expectRevert("LogAnchor: invalid day");
        logAnchor.commitLogRoot(21000101, TEST_ROOT);
        
        vm.stopPrank();
    }
    
    function test_CommitLogRoot_RevertIfZeroRoot() public {
        vm.startPrank(owner);
        
        vm.expectRevert("LogAnchor: root cannot be zero");
        logAnchor.commitLogRoot(TEST_DAY, bytes32(0));
        
        vm.stopPrank();
    }
    
    function test_BatchCommitLogRoots_Success() public {
        vm.startPrank(owner);
        
        uint256[] memory days_ = new uint256[](2);
        bytes32[] memory roots = new bytes32[](2);
        
        days_[0] = TEST_DAY;
        days_[1] = TEST_DAY_2;
        roots[0] = TEST_ROOT;
        roots[1] = TEST_ROOT_2;
        
        logAnchor.batchCommitLogRoots(days_, roots);
        
        assertEq(logAnchor.dailyRoots(TEST_DAY), TEST_ROOT);
        assertEq(logAnchor.dailyRoots(TEST_DAY_2), TEST_ROOT_2);
        assertTrue(logAnchor.hasRoot(TEST_DAY));
        assertTrue(logAnchor.hasRoot(TEST_DAY_2));
        
        vm.stopPrank();
    }
    
    function test_BatchCommitLogRoots_RevertIfArraysLengthMismatch() public {
        vm.startPrank(owner);
        
        uint256[] memory days_ = new uint256[](2);
        bytes32[] memory roots = new bytes32[](1);
        
        days_[0] = TEST_DAY;
        days_[1] = TEST_DAY_2;
        roots[0] = TEST_ROOT;
        
        vm.expectRevert("LogAnchor: arrays length mismatch");
        logAnchor.batchCommitLogRoots(days_, roots);
        
        vm.stopPrank();
    }
    
    function test_BatchCommitLogRoots_RevertIfEmptyArrays() public {
        vm.startPrank(owner);
        
        uint256[] memory days_ = new uint256[](0);
        bytes32[] memory roots = new bytes32[](0);
        
        vm.expectRevert("LogAnchor: empty arrays");
        logAnchor.batchCommitLogRoots(days_, roots);
        
        vm.stopPrank();
    }
    
    function test_BatchCommitLogRoots_RevertIfTooManyRoots() public {
        vm.startPrank(owner);
        
        uint256[] memory days_ = new uint256[](101);
        bytes32[] memory roots = new bytes32[](101);
        
        for (uint256 i = 0; i < 101; i++) {
            days_[i] = TEST_DAY + i;
            roots[i] = keccak256(abi.encodePacked("root", i));
        }
        
        vm.expectRevert("LogAnchor: too many roots");
        logAnchor.batchCommitLogRoots(days_, roots);
        
        vm.stopPrank();
    }
    
    function test_HasRoot() public {
        vm.startPrank(owner);
        
        // Initially no root
        assertFalse(logAnchor.hasRoot(TEST_DAY));
        
        // After commit
        logAnchor.commitLogRoot(TEST_DAY, TEST_ROOT);
        assertTrue(logAnchor.hasRoot(TEST_DAY));
        
        vm.stopPrank();
    }
    
    function test_GetCommittedDaysCount() public {
        vm.startPrank(owner);
        
        // Initially 0
        assertEq(logAnchor.getCommittedDaysCount(), 0);
        
        // After single commit
        logAnchor.commitLogRoot(TEST_DAY, TEST_ROOT);
        assertEq(logAnchor.getCommittedDaysCount(), 1);
        
        // After multiple commits
        logAnchor.commitLogRoot(TEST_DAY_2, TEST_ROOT_2);
        assertEq(logAnchor.getCommittedDaysCount(), 2);
        
        // After update (should still be 2)
        logAnchor.commitLogRoot(TEST_DAY, TEST_ROOT_UPDATED);
        assertEq(logAnchor.getCommittedDaysCount(), 2);
        
        vm.stopPrank();
    }
    
    function test_EdgeCases() public {
        vm.startPrank(owner);
        
        // Test boundary days
        logAnchor.commitLogRoot(20240101, TEST_ROOT); // MIN_DAY
        logAnchor.commitLogRoot(20991231, TEST_ROOT_2); // MAX_DAY
        
        assertTrue(logAnchor.hasRoot(20240101));
        assertTrue(logAnchor.hasRoot(20991231));
        
        vm.stopPrank();
    }
    
    function testFuzz_CommitValidDays(uint256 day) public {
        vm.assume(day >= 20240101 && day <= 20991231);
        
        vm.startPrank(owner);
        
        bytes32 root = keccak256(abi.encodePacked("fuzz_root", day));
        logAnchor.commitLogRoot(day, root);
        
        assertEq(logAnchor.dailyRoots(day), root);
        assertTrue(logAnchor.hasRoot(day));
        
        vm.stopPrank();
    }
    
    function testFuzz_RejectInvalidDays(uint256 day) public {
        vm.assume(day < 20240101 || day > 20991231);
        
        vm.startPrank(owner);
        
        vm.expectRevert("LogAnchor: invalid day");
        logAnchor.commitLogRoot(day, TEST_ROOT);
        
        vm.stopPrank();
    }
}
