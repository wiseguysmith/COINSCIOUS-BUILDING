// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {NAVOracle} from "../src/NAVOracle.sol";

contract NAVOracleTest is Test {
    NAVOracle public navOracle;
    
    address public admin;
    address public oracle;
    address public user;
    
    // Test constants
    uint256 public constant INITIAL_NAV = 1000000 * 10**8; // $1M in basis points
    uint256 public constant UPDATED_NAV = 1200000 * 10**8; // $1.2M in basis points
    
    function setUp() public {
        admin = makeAddr("admin");
        oracle = makeAddr("oracle");
        user = makeAddr("user");
        
        navOracle = new NAVOracle(admin, oracle);
    }
    
    function test_Constructor() public {
        assertTrue(navOracle.hasRole(navOracle.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(navOracle.hasRole(navOracle.ORACLE_ADMIN_ROLE(), admin));
        assertTrue(navOracle.hasRole(navOracle.ORACLE_ROLE(), oracle));
    }
    
    function test_SetNAV_Success() public {
        vm.startPrank(oracle);
        
        navOracle.setNAV(
            INITIAL_NAV,
            "Manual valuation",
            95
        );
        
        assertEq(navOracle.getNAV(), INITIAL_NAV);
        assertEq(navOracle.getNAVHistoryCount(), 1);
        
        vm.stopPrank();
    }
    
    function test_SetNAV_RevertIfNotOracle() public {
        vm.startPrank(user);
        
        vm.expectRevert();
        navOracle.setNAV(
            INITIAL_NAV,
            "Manual valuation",
            95
        );
        
        vm.stopPrank();
    }
    
    function test_SetNAV_RevertIfInvalidParameters() public {
        vm.startPrank(oracle);
        
        // Test zero NAV value
        vm.expectRevert(NAVOracle.InvalidNAVValue.selector);
        navOracle.setNAV(
            0,
            "Manual valuation",
            95
        );
        
        // Test empty source
        vm.expectRevert(NAVOracle.InvalidSource.selector);
        navOracle.setNAV(
            INITIAL_NAV,
            "",
            95
        );
        
        // Test confidence too low
        vm.expectRevert(NAVOracle.ConfidenceTooLow.selector);
        navOracle.setNAV(
            INITIAL_NAV,
            "Manual valuation",
            70 // Below minimum confidence
        );
        
        vm.stopPrank();
    }
    
    function test_SetNAV_RevertIfUpdateTooFrequent() public {
        vm.startPrank(oracle);
        
        // Set initial NAV
        navOracle.setNAV(
            INITIAL_NAV,
            "Initial valuation",
            95
        );
        
        // Try to update immediately (should fail)
        vm.expectRevert(NAVOracle.UpdateTooFrequent.selector);
        navOracle.setNAV(
            UPDATED_NAV,
            "Updated valuation",
            90
        );
        
        vm.stopPrank();
    }
    
    function test_SetNAV_RevertIfChangeTooLarge() public {
        vm.startPrank(oracle);
        
        // Set initial NAV
        navOracle.setNAV(
            INITIAL_NAV,
            "Initial valuation",
            95
        );
        
        // Move time forward
        vm.warp(block.timestamp + 3601); // Just over 1 hour
        
        // Try to update with very large change (should fail)
        uint256 excessiveNAV = INITIAL_NAV * 2; // 100% increase
        vm.expectRevert(NAVOracle.NAVChangeTooLarge.selector);
        navOracle.setNAV(
            excessiveNAV,
            "Excessive valuation",
            90
        );
        
        vm.stopPrank();
    }
    
    function test_SetNAV_SuccessWithValidChange() public {
        vm.startPrank(oracle);
        
        // Set initial NAV
        navOracle.setNAV(
            INITIAL_NAV,
            "Initial valuation",
            95
        );
        
        // Move time forward
        vm.warp(block.timestamp + 3601); // Just over 1 hour
        
        // Update with valid change (20% increase)
        navOracle.setNAV(
            UPDATED_NAV,
            "Updated valuation",
            90
        );
        
        assertEq(navOracle.getNAV(), UPDATED_NAV);
        assertEq(navOracle.getNAVHistoryCount(), 2);
        
        vm.stopPrank();
    }
    
    function test_AddSupportedToken() public {
        address token = makeAddr("token");
        uint256 weight = 5000; // 50%
        
        vm.startPrank(admin);
        
        navOracle.addSupportedToken(token, weight);
        
        assertTrue(navOracle.supportedTokens(token));
        assertEq(navOracle.tokenWeights(token), weight);
        
        vm.stopPrank();
    }
    
    function test_AddSupportedToken_RevertIfNotAdmin() public {
        address token = makeAddr("token");
        uint256 weight = 5000;
        
        vm.startPrank(user);
        
        vm.expectRevert();
        navOracle.addSupportedToken(token, weight);
        
        vm.stopPrank();
    }
    
    function test_AddSupportedToken_RevertIfInvalidWeight() public {
        address token = makeAddr("token");
        uint256 invalidWeight = 15000; // > 100%
        
        vm.startPrank(admin);
        
        vm.expectRevert(NAVOracle.InvalidTokenWeight.selector);
        navOracle.addSupportedToken(token, invalidWeight);
        
        vm.stopPrank();
    }
    
    function test_SetUpdateIntervals() public {
        vm.startPrank(admin);
        
        uint256 newMinInterval = 1800; // 30 minutes
        uint256 newMaxInterval = 43200; // 12 hours
        
        navOracle.setUpdateIntervals(newMinInterval, newMaxInterval);
        
        assertEq(navOracle.minUpdateInterval(), newMinInterval);
        assertEq(navOracle.maxUpdateInterval(), newMaxInterval);
        
        vm.stopPrank();
    }
    
    function test_SetValidationParameters() public {
        vm.startPrank(admin);
        
        uint256 newMaxChangePercent = 1000; // 10%
        uint256 newMinConfidence = 85;
        
        navOracle.setValidationParameters(newMaxChangePercent, newMinConfidence);
        
        assertEq(navOracle.maxNAVChangePercent(), newMaxChangePercent);
        assertEq(navOracle.minConfidenceLevel(), newMinConfidence);
        
        vm.stopPrank();
    }
    
    function test_InvalidateNAV() public {
        vm.startPrank(oracle);
        
        // Set initial NAV
        navOracle.setNAV(
            INITIAL_NAV,
            "Initial valuation",
            95
        );
        
        assertTrue(navOracle.getNAVData().isValid);
        
        vm.stopPrank();
        
        // Invalidate NAV
        vm.startPrank(admin);
        navOracle.invalidateNAV();
        assertFalse(navOracle.getNAVData().isValid);
        vm.stopPrank();
    }
    
    function test_PauseUnpause() public {
        vm.startPrank(admin);
        
        // Pause
        navOracle.pause();
        assertTrue(navOracle.paused());
        
        // Try to set NAV while paused
        vm.startPrank(oracle);
        vm.expectRevert();
        navOracle.setNAV(
            INITIAL_NAV,
            "Manual valuation",
            95
        );
        vm.stopPrank();
        
        // Unpause
        vm.startPrank(admin);
        navOracle.unpause();
        assertFalse(navOracle.paused());
        
        // Now setting NAV should work
        vm.startPrank(oracle);
        navOracle.setNAV(
            INITIAL_NAV,
            "Manual valuation",
            95
        );
        vm.stopPrank();
        
        vm.stopPrank();
    }
    
    function test_GetNAVWithAge() public {
        vm.startPrank(oracle);
        
        // Set initial NAV
        navOracle.setNAV(
            INITIAL_NAV,
            "Initial valuation",
            95
        );
        
        (uint256 nav, uint256 age, bool isValid) = navOracle.getNAVWithAge();
        
        assertEq(nav, INITIAL_NAV);
        assertEq(age, 0); // Just set
        assertTrue(isValid);
        
        // Move time forward
        vm.warp(block.timestamp + 3600); // 1 hour
        
        (nav, age, isValid) = navOracle.getNAVWithAge();
        assertEq(nav, INITIAL_NAV);
        assertEq(age, 3600);
        assertTrue(isValid);
        
        vm.stopPrank();
    }
    
    function test_GetNAVHistory() public {
        vm.startPrank(oracle);
        
        // Set multiple NAV values
        navOracle.setNAV(
            INITIAL_NAV,
            "Initial valuation",
            95
        );
        
        vm.warp(block.timestamp + 3601);
        
        navOracle.setNAV(
            UPDATED_NAV,
            "Updated valuation",
            90
        );
        
        // Check history
        assertEq(navOracle.getNAVHistoryCount(), 2);
        
        (uint256 value1, , , , ) = navOracle.getNAVHistory(0);
        (uint256 value2, , , , ) = navOracle.getNAVHistory(1);
        
        assertEq(value1, INITIAL_NAV);
        assertEq(value2, UPDATED_NAV);
        
        vm.stopPrank();
    }
    
    function test_CalculateWeightedAverage() public {
        vm.startPrank(oracle);
        
        // Set NAV
        navOracle.setNAV(
            INITIAL_NAV,
            "Initial valuation",
            95
        );
        
        // Calculate weighted average (should return current NAV for now)
        uint256 weightedAverage = navOracle.calculateWeightedAverage();
        assertEq(weightedAverage, INITIAL_NAV);
        
        vm.stopPrank();
    }
    
    function testFuzz_SetValidNAV(
        uint256 _navValue,
        string memory _source,
        uint256 _confidence
    ) public {
        vm.assume(_navValue > 0 && _navValue <= 100000000 * 10**8); // Reasonable NAV range
        vm.assume(bytes(_source).length > 0);
        vm.assume(_confidence >= 80 && _confidence <= 100);
        
        vm.startPrank(oracle);
        
        // This should not revert with valid parameters
        navOracle.setNAV(_navValue, _source, _confidence);
        
        vm.stopPrank();
    }
}
