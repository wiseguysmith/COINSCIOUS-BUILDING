// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract LinearVesting is Ownable, ReentrancyGuard {
    IERC20 public immutable token;

    struct VestingSchedule {
        uint256 totalAmount;
        uint256 released;
        uint64 start;
        uint64 cliff;
        uint64 duration;
    }

    mapping(address => VestingSchedule) public vestings;

    event VestingCreated(address indexed beneficiary, uint256 totalAmount, uint64 start, uint64 cliff, uint64 duration);
    event TokensReleased(address indexed beneficiary, uint256 amount);

    constructor(IERC20 _token) {
        token = _token;
    }

    /// @notice Create a vesting schedule for a beneficiary
    function createVesting(
        address beneficiary,
        uint256 totalAmount,
        uint64 start,
        uint64 cliff,
        uint64 duration
    ) external onlyOwner {
        require(beneficiary != address(0), "Invalid address");
        require(duration > 0, "Duration must be > 0");
        require(cliff >= start, "Cliff < start");

        vestings[beneficiary] = VestingSchedule({
            totalAmount: totalAmount,
            released: 0,
            start: start,
            cliff: cliff,
            duration: duration
        });

        require(token.transferFrom(msg.sender, address(this), totalAmount), "Token transfer failed");

        emit VestingCreated(beneficiary, totalAmount, start, cliff, duration);
    }

    /// @notice Release vested tokens
    function release() external nonReentrant {
        VestingSchedule storage schedule = vestings[msg.sender];
        require(block.timestamp >= schedule.cliff, "Cliff not reached");

        uint256 vested = _vestedAmount(schedule);
        uint256 unreleased = vested - schedule.released;
        require(unreleased > 0, "Nothing to release");

        schedule.released = vested;
        require(token.transfer(msg.sender, unreleased), "Token transfer failed");

        emit TokensReleased(msg.sender, unreleased);
    }

    /// @notice View how much is vested for a beneficiary
    function vestedAmount(address beneficiary) external view returns (uint256) {
        return _vestedAmount(vestings[beneficiary]);
    }

    function _vestedAmount(VestingSchedule memory schedule) internal view returns (uint256) {
        if (block.timestamp < schedule.cliff) {
            return 0;
        } else if (block.timestamp >= schedule.start + schedule.duration) {
            return schedule.totalAmount;
        } else {
            return (schedule.totalAmount * (block.timestamp - schedule.start)) / schedule.duration;
        }
    }
}
