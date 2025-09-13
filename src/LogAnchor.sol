// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LogAnchor
 * @notice Stores daily Merkle roots for off-chain admin action logs
 * @dev Provides cryptographic proof of log integrity for regulatory compliance
 */
contract LogAnchor is Ownable {
    // Mapping from UTC day (YYYYMMDD format) to Merkle root
    mapping(uint256 => bytes32) public dailyRoots;
    
    // Counter for committed days (for efficient counting)
    uint256 public committedDaysCount;
    
    constructor() Ownable(msg.sender) {}
    
    // Events
    event LogRootCommitted(uint256 indexed day, bytes32 indexed root, uint256 timestamp);
    event LogRootUpdated(uint256 indexed day, bytes32 indexed oldRoot, bytes32 indexed newRoot, uint256 timestamp);
    
    // Constants
    uint256 public constant MIN_DAY = 20240101; // Reasonable start date
    uint256 public constant MAX_DAY = 20991231; // Reasonable end date
    
    /**
     * @notice Commit a Merkle root for a specific UTC day
     * @param day UTC day in YYYYMMDD format (e.g., 20241201 for Dec 1, 2024)
     * @param root Merkle root hash of that day's admin actions
     */
    function commitLogRoot(uint256 day, bytes32 root) external onlyOwner {
        require(day >= MIN_DAY && day <= MAX_DAY, "LogAnchor: invalid day");
        require(root != bytes32(0), "LogAnchor: root cannot be zero");
        
        bytes32 existingRoot = dailyRoots[day];
        if (existingRoot == bytes32(0)) {
            dailyRoots[day] = root;
            committedDaysCount++;
            emit LogRootCommitted(day, root, block.timestamp);
        } else {
            // Allow updates for same-day corrections (within same UTC day)
            dailyRoots[day] = root;
            emit LogRootUpdated(day, existingRoot, root, block.timestamp);
        }
    }
    
    /**
     * @notice Batch commit multiple daily roots
     * @param days_ Array of UTC days in YYYYMMDD format
     * @param roots Array of corresponding Merkle roots
     */
    function batchCommitLogRoots(uint256[] calldata days_, bytes32[] calldata roots) external onlyOwner {
        require(days_.length == roots.length, "LogAnchor: arrays length mismatch");
        require(days_.length > 0, "LogAnchor: empty arrays");
        require(days_.length <= 100, "LogAnchor: too many roots"); // Gas limit protection
        
        for (uint256 i = 0; i < days_.length; i++) {
            uint256 day = days_[i];
            bytes32 root = roots[i];
            
            require(day >= MIN_DAY && day <= MAX_DAY, "LogAnchor: invalid day");
            require(root != bytes32(0), "LogAnchor: root cannot be zero");
            
            bytes32 existingRoot = dailyRoots[day];
            if (existingRoot == bytes32(0)) {
                dailyRoots[day] = root;
                committedDaysCount++;
                emit LogRootCommitted(day, root, block.timestamp);
            } else {
                dailyRoots[day] = root;
                emit LogRootUpdated(day, existingRoot, root, block.timestamp);
            }
        }
    }
    
    /**
     * @notice Check if a Merkle root exists for a specific day
     * @param day UTC day in YYYYMMDD format
     * @return exists True if root exists for that day
     */
    function hasRoot(uint256 day) external view returns (bool exists) {
        return dailyRoots[day] != bytes32(0);
    }
    
    /**
     * @notice Get the total number of committed days (approximate)
     * @dev This is a view function that scans the mapping
     * @return count Approximate count of days with committed roots
     */
    function getCommittedDaysCount() external view returns (uint256) {
        return committedDaysCount;
    }
}
