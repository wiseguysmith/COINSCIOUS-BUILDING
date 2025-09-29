// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Vesting
 * @notice Manages token vesting schedules for founders and team members
 * @dev Uses OpenZeppelin's AccessControl for role-based management
 */
contract Vesting is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Roles
    bytes32 public constant VESTING_ADMIN_ROLE = keccak256("VESTING_ADMIN_ROLE");

    // Vesting schedule structure
    struct VestingSchedule {
        bool initialized;
        bool revocable;
        uint256 startTime;
        uint256 cliffDuration;
        uint256 vestingDuration;
        uint256 totalAmount;
        uint256 releasedAmount;
        address beneficiary;
    }

    // Token being vested
    IERC20 public immutable token;

    // Vesting schedules mapping
    mapping(bytes32 => VestingSchedule) public vestingSchedules;
    mapping(address => bytes32[]) public beneficiarySchedules;

    // Total vesting amount tracking
    uint256 public totalVestingAmount;
    uint256 public totalReleasedAmount;

    // Events
    event VestingScheduleCreated(
        bytes32 indexed scheduleId,
        address indexed beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration
    );
    
    event TokensReleased(
        bytes32 indexed scheduleId,
        address indexed beneficiary,
        uint256 amount
    );
    
    event VestingScheduleRevoked(
        bytes32 indexed scheduleId,
        address indexed beneficiary,
        uint256 unreleasedAmount
    );

    // Errors
    error VestingScheduleAlreadyExists();
    error VestingScheduleNotFound();
    error VestingScheduleNotRevocable();
    error InsufficientTokenBalance();
    error InvalidVestingParameters();
    error NoTokensToRelease();

    /**
     * @notice Constructor
     * @param _token Address of the token to be vested
     * @param _admin Address to be granted admin role
     */
    constructor(address _token, address _admin) {
        if (_token == address(0) || _admin == address(0)) {
            revert InvalidVestingParameters();
        }
        
        token = IERC20(_token);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(VESTING_ADMIN_ROLE, _admin);
    }

    /**
     * @notice Create a new vesting schedule
     * @param _beneficiary Address of the beneficiary
     * @param _totalAmount Total amount of tokens to vest
     * @param _startTime Start time of vesting (0 for current block timestamp)
     * @param _cliffDuration Cliff duration in seconds (1 year = 31536000)
     * @param _vestingDuration Total vesting duration in seconds (4 years = 126144000)
     * @param _revocable Whether the schedule can be revoked
     */
    function createVestingSchedule(
        address _beneficiary,
        uint256 _totalAmount,
        uint256 _startTime,
        uint256 _cliffDuration,
        uint256 _vestingDuration,
        bool _revocable
    ) external onlyRole(VESTING_ADMIN_ROLE) {
        if (_beneficiary == address(0) || _totalAmount == 0) {
            revert InvalidVestingParameters();
        }
        
        if (_cliffDuration >= _vestingDuration) {
            revert InvalidVestingParameters();
        }

        bytes32 scheduleId = keccak256(
            abi.encodePacked(_beneficiary, _startTime, _totalAmount)
        );

        if (vestingSchedules[scheduleId].initialized) {
            revert VestingScheduleAlreadyExists();
        }

        uint256 startTime = _startTime == 0 ? block.timestamp : _startTime;

        vestingSchedules[scheduleId] = VestingSchedule({
            initialized: true,
            revocable: _revocable,
            startTime: startTime,
            cliffDuration: _cliffDuration,
            vestingDuration: _vestingDuration,
            totalAmount: _totalAmount,
            releasedAmount: 0,
            beneficiary: _beneficiary
        });

        beneficiarySchedules[_beneficiary].push(scheduleId);
        totalVestingAmount += _totalAmount;

        emit VestingScheduleCreated(
            scheduleId,
            _beneficiary,
            _totalAmount,
            startTime,
            _cliffDuration,
            _vestingDuration
        );
    }

    /**
     * @notice Release vested tokens for a specific schedule
     * @param _scheduleId ID of the vesting schedule
     */
    function release(bytes32 _scheduleId) external nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[_scheduleId];
        
        if (!schedule.initialized) {
            revert VestingScheduleNotFound();
        }

        uint256 releasableAmount = getReleasableAmount(_scheduleId);
        
        if (releasableAmount == 0) {
            revert NoTokensToRelease();
        }

        schedule.releasedAmount += releasableAmount;
        totalReleasedAmount += releasableAmount;

        token.safeTransfer(schedule.beneficiary, releasableAmount);

        emit TokensReleased(_scheduleId, schedule.beneficiary, releasableAmount);
    }

    /**
     * @notice Release all available tokens for a beneficiary
     * @param _beneficiary Address of the beneficiary
     */
    function releaseAll(address _beneficiary) external nonReentrant {
        bytes32[] memory schedules = beneficiarySchedules[_beneficiary];
        uint256 totalReleasable = 0;
        uint256[] memory amounts = new uint256[](schedules.length);

        // Calculate total releasable amount
        for (uint256 i = 0; i < schedules.length; i++) {
            uint256 releasable = getReleasableAmount(schedules[i]);
            amounts[i] = releasable;
            totalReleasable += releasable;
        }

        if (totalReleasable == 0) {
            revert NoTokensToRelease();
        }

        // Update schedules and transfer tokens
        for (uint256 i = 0; i < schedules.length; i++) {
            if (amounts[i] > 0) {
                VestingSchedule storage schedule = vestingSchedules[schedules[i]];
                schedule.releasedAmount += amounts[i];
                totalReleasedAmount += amounts[i];

                emit TokensReleased(schedules[i], _beneficiary, amounts[i]);
            }
        }

        token.safeTransfer(_beneficiary, totalReleasable);
    }

    /**
     * @notice Revoke a vesting schedule (only if revocable)
     * @param _scheduleId ID of the vesting schedule to revoke
     */
    function revoke(bytes32 _scheduleId) external onlyRole(VESTING_ADMIN_ROLE) {
        VestingSchedule storage schedule = vestingSchedules[_scheduleId];
        
        if (!schedule.initialized) {
            revert VestingScheduleNotFound();
        }
        
        if (!schedule.revocable) {
            revert VestingScheduleNotRevocable();
        }

        uint256 unreleasedAmount = schedule.totalAmount - schedule.releasedAmount;
        
        if (unreleasedAmount > 0) {
            schedule.totalAmount = schedule.releasedAmount; // Effectively set to 0 unreleased
            totalVestingAmount -= unreleasedAmount;
        }

        schedule.initialized = false;

        emit VestingScheduleRevoked(_scheduleId, schedule.beneficiary, unreleasedAmount);
    }

    /**
     * @notice Get the releasable amount for a vesting schedule
     * @param _scheduleId ID of the vesting schedule
     * @return Amount of tokens that can be released
     */
    function getReleasableAmount(bytes32 _scheduleId) public view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[_scheduleId];
        
        if (!schedule.initialized) {
            return 0;
        }

        uint256 vestedAmount = getVestedAmount(_scheduleId);
        return vestedAmount - schedule.releasedAmount;
    }

    /**
     * @notice Get the vested amount for a vesting schedule
     * @param _scheduleId ID of the vesting schedule
     * @return Amount of tokens that have vested
     */
    function getVestedAmount(bytes32 _scheduleId) public view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[_scheduleId];
        
        if (!schedule.initialized) {
            return 0;
        }

        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            return 0; // Still in cliff period
        }

        if (block.timestamp >= schedule.startTime + schedule.vestingDuration) {
            return schedule.totalAmount; // Fully vested
        }

        // Linear vesting after cliff
        uint256 timeSinceStart = block.timestamp - schedule.startTime;
        uint256 timeSinceCliff = timeSinceStart - schedule.cliffDuration;
        uint256 vestingPeriodAfterCliff = schedule.vestingDuration - schedule.cliffDuration;
        
        return (schedule.totalAmount * timeSinceCliff) / vestingPeriodAfterCliff;
    }

    /**
     * @notice Get vesting schedules for a beneficiary
     * @param _beneficiary Address of the beneficiary
     * @return Array of schedule IDs
     */
    function getBeneficiarySchedules(address _beneficiary) external view returns (bytes32[] memory) {
        return beneficiarySchedules[_beneficiary];
    }

    /**
     * @notice Get vesting schedule details
     * @param _scheduleId ID of the vesting schedule
     * @return Vesting schedule struct
     */
    function getVestingSchedule(bytes32 _scheduleId) external view returns (VestingSchedule memory) {
        return vestingSchedules[_scheduleId];
    }

    /**
     * @notice Emergency function to withdraw tokens (admin only)
     * @param _amount Amount of tokens to withdraw
     */
    function emergencyWithdraw(uint256 _amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_amount > token.balanceOf(address(this))) {
            revert InsufficientTokenBalance();
        }
        
        token.safeTransfer(msg.sender, _amount);
    }
}
