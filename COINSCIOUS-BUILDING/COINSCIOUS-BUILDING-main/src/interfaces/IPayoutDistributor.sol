// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPayoutDistributor
 * @dev Interface for automated USDC distributions based on token holder snapshots
 */
interface IPayoutDistributor {
    /**
     * @dev Distribution modes for handling underfunded scenarios
     */
    enum DistributionMode {
        FULL,       // Revert if insufficient funds
        PRO_RATA    // Distribute available funds proportionally
    }

    /**
     * @dev Snapshot structure for token holder balances
     */
    struct Snapshot {
        uint256 totalSupply;
        uint64 blockNumber;
        uint64 timestamp;
    }

    /**
     * @dev Emitted when a snapshot is taken
     */
    event SnapshotTaken(uint256 indexed snapshotId, uint256 totalSupply, uint256 blockNumber);

    /**
     * @dev Emitted when funds are added to the distribution
     */
    event Funded(uint256 amount, uint256 totalFunded);

    /**
     * @dev Emitted when distribution mode is set
     */
    event ModeSet(uint8 mode);

    /**
     * @dev Emitted when distribution is completed
     */
    event Distributed(uint256 indexed snapshotId, uint256 totalPaid, uint256 residual);

    /**
     * @dev Emitted when underfunded scenario occurs
     */
    event Underfunded(uint256 required, uint256 funded);

    /**
     * @dev Emitted when residual amount is recorded
     */
    event ResidualRecorded(uint256 residual);

    /**
     * @dev Emitted when a snapshot hash is set
     */
    event SnapshotHashSet(uint256 indexed snapshotId, bytes32 capTableHash);

    /**
     * @dev Emitted when a payout is sent to a recipient
     */
    event PayoutSent(uint256 indexed snapshotId, address indexed recipient, uint256 amount);

    /**
     * @dev Emitted when a batch distribution is completed
     */
    event BatchDistributed(uint256 indexed snapshotId, uint256 totalPaid, uint256 residual, uint256 recipientCount);

    /**
     * @dev Takes a snapshot of current token balances
     * @return snapshotId Unique identifier for the snapshot
     */
    function snapshot() external returns (uint256 snapshotId);

    /**
     * @dev Funds the distribution with USDC
     * @param amount Amount of USDC to fund
     */
    function fund(uint256 amount) external;

    /**
     * @dev Sets the distribution mode for underfunded scenarios
     * @param mode Distribution mode
     */
    function setMode(uint8 mode) external;

    /**
     * @dev Distributes USDC to token holders based on snapshot
     * @param snapshotId ID of the snapshot to use for distribution
     */
    function distribute(uint256 snapshotId) external;

    /**
     * @dev Gets the required amount for a snapshot
     * @param snapshotId ID of the snapshot
     * @return Required USDC amount for full distribution
     */
    function requiredAmount(uint256 snapshotId) external view returns (uint256);

    /**
     * @dev Gets the current funded amount
     * @return Total USDC funded for current cycle
     */
    function fundedAmount() external view returns (uint256);

    /**
     * @dev Gets the current distribution mode
     * @return Current distribution mode
     */
    function distributionMode() external view returns (uint8);
}
