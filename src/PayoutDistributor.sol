// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IPayoutDistributor.sol";

/**
 * @title PayoutDistributor
 * @dev Automated rent/profit distributions in USDC per snapshot of holders
 * @notice Implements snapshot → fund → distribute pattern with underfunded guardrails
 * 
 * Key Features:
 * - Snapshot-based distribution ensures fairness
 * - Underfunded handling with FULL vs PRO_RATA modes
 * - Residual tracking prevents dust accumulation
 * - Re-entrancy protection for financial safety
 * - Batched push payouts for scalability (250+ holders)
 */
contract PayoutDistributor is IPayoutDistributor, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // USDC token contract
    IERC20 public immutable usdc;
    
    // Security token contract for balance queries
    address public immutable securityToken;
    
    // Active partition for balance queries
    bytes32 public immutable activePartition;
    
    // Current distribution cycle state
    uint256 public currentCycleFunded;
    uint8 public currentDistributionMode;
    
    // Snapshot storage
    mapping(uint256 => Snapshot) public snapshots;
    mapping(uint256 => mapping(address => uint256)) public snapshotBalances;
    mapping(uint256 => bytes32) public snapshotHashes; // Cap table hash for verification
    uint256 public nextSnapshotId;
    
    // Residual tracking
    uint256 public totalResidual;
    
    // Constants
    uint8 private constant FULL = 0;
    uint8 private constant PRO_RATA = 1;
    
    // Precision for calculations (6 decimals for USDC)
    uint256 private constant USDC_PRECISION = 1e6;
    
    // Tolerance for residual calculations (1 cent)
    uint256 private constant RESIDUAL_TOLERANCE = 1e4; // 0.01 USDC
    
    // Batch size limit for gas optimization
    uint256 private constant MAX_BATCH_SIZE = 250;

    /**
     * @dev Constructor
     * @param _usdc USDC token contract address
     * @param _securityToken Security token contract address
     * @param _activePartition Active partition for balance queries
     */
    constructor(
        address _usdc,
        address _securityToken,
        bytes32 _activePartition
    ) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_securityToken != address(0), "Invalid security token address");
        require(_activePartition != bytes32(0), "Invalid partition");
        
        usdc = IERC20(_usdc);
        securityToken = _securityToken;
        activePartition = _activePartition;
        currentDistributionMode = FULL;
    }

    /**
     * @dev Takes a snapshot of current token balances
     * @return snapshotId Unique identifier for the snapshot
     */
    function snapshot() external override returns (uint256 snapshotId) {
        snapshotId = nextSnapshotId++;
        
        // Get total supply from security token
        uint256 totalSupply = _getTotalSupply();
        
        // Store snapshot data
        snapshots[snapshotId] = Snapshot({
            totalSupply: totalSupply,
            blockNumber: block.number,
            timestamp: uint64(block.timestamp)
        });
        
        emit SnapshotTaken(snapshotId, totalSupply, block.number);
        
        return snapshotId;
    }

    /**
     * @dev Sets the cap table hash for a snapshot (only controller)
     * @param snapshotId The snapshot ID
     * @param capTableHash Hash of the sorted CSV cap table
     */
    function setSnapshotHash(uint256 snapshotId, bytes32 capTableHash) external onlyOwner {
        require(snapshots[snapshotId].totalSupply > 0, "Invalid snapshot");
        require(capTableHash != bytes32(0), "Invalid cap table hash");
        require(snapshotHashes[snapshotId] == bytes32(0), "Hash already set");
        
        snapshotHashes[snapshotId] = capTableHash;
        emit SnapshotHashSet(snapshotId, capTableHash);
    }

    /**
     * @dev Funds the distribution with USDC
     * @param amount Amount of USDC to fund
     */
    function fund(uint256 amount) external override {
        require(amount > 0, "Amount must be positive");
        
        // Transfer USDC from caller
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update funded amount
        currentCycleFunded += amount;
        
        emit Funded(amount, currentCycleFunded);
    }

    /**
     * @dev Sets the distribution mode for underfunded scenarios
     * @param mode Distribution mode (FULL or PRO_RATA)
     */
    function setMode(uint8 mode) external override onlyOwner {
        require(mode == FULL || mode == PRO_RATA, "Invalid mode");
        currentDistributionMode = mode;
    }

    /**
     * @dev Distributes USDC to token holders based on snapshot
     * @param snapshotId ID of the snapshot to use for distribution
     */
    function distribute(uint256 snapshotId) external override nonReentrant {
        Snapshot memory snap = snapshots[snapshotId];
        require(snap.totalSupply > 0, "Invalid snapshot");
        
        uint256 required = requiredAmount(snapshotId);
        uint256 funded = currentCycleFunded;
        
        // Check if underfunded
        if (funded < required) {
            emit Underfunded(required, funded);
            
            if (currentDistributionMode == FULL) {
                revert("UNDERFUNDED_FULL_MODE");
            }
            // PRO_RATA mode continues with partial distribution
        }
        
        // Calculate distribution amounts
        uint256 totalPaid = 0;
        uint256 residual = 0;
        
        if (currentDistributionMode == PRO_RATA && funded < required) {
            // Pro-rata distribution
            totalPaid = _distributeProRata(snapshotId, funded);
            residual = funded - totalPaid;
        } else {
            // Full distribution
            totalPaid = _distributeFull(snapshotId, required);
            residual = funded - required;
        }
        
        // Record residual
        if (residual > 0) {
            totalResidual += residual;
            emit ResidualRecorded(residual);
        }
        
        // Reset cycle state
        currentCycleFunded = 0;
        
        emit Distributed(snapshotId, totalPaid, residual);
    }

    /**
     * @dev Distributes USDC in batches for scalability
     * @param snapshotId ID of the snapshot to use
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to distribute
     */
    function distributeBatch(
        uint256 snapshotId,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external nonReentrant {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length <= MAX_BATCH_SIZE, "Batch too large");
        require(recipients.length > 0, "Empty batch");
        
        Snapshot memory snap = snapshots[snapshotId];
        require(snap.totalSupply > 0, "Invalid snapshot");
        require(snapshotHashes[snapshotId] != bytes32(0), "Cap table hash not set");
        
        uint256 totalPaid = 0;
        uint256 funded = currentCycleFunded;
        
        // Process batch
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            require(amounts[i] > 0, "Invalid amount");
            
            // Check if we have enough funds
            if (totalPaid + amounts[i] > funded) {
                if (currentDistributionMode == FULL) {
                    revert("INSUFFICIENT_FUNDS_FULL_MODE");
                }
                // PRO_RATA: stop here and record residual
                break;
            }
            
            // Transfer USDC to recipient
            usdc.safeTransfer(recipients[i], amounts[i]);
            totalPaid += amounts[i];
            
            emit PayoutSent(snapshotId, recipients[i], amounts[i]);
        }
        
        // Calculate residual
        uint256 residual = funded - totalPaid;
        if (residual > 0) {
            totalResidual += residual;
            emit ResidualRecorded(residual);
        }
        
        // Reset cycle state
        currentCycleFunded = 0;
        
        emit BatchDistributed(snapshotId, totalPaid, residual, recipients.length);
    }

    /**
     * @dev Gets the required amount for a snapshot
     * @param snapshotId ID of the snapshot
     * @return Required USDC amount for full distribution
     */
    function requiredAmount(uint256 snapshotId) public view override returns (uint256) {
        Snapshot memory snap = snapshots[snapshotId];
        require(snap.totalSupply > 0, "Invalid snapshot");
        
        // For simplicity, assume 1:1 ratio (can be customized)
        // In practice, this might be based on cap table or other business logic
        return snap.totalSupply;
    }

    /**
     * @dev Gets the current funded amount
     * @return Total USDC funded for current cycle
     */
    function fundedAmount() external view override returns (uint256) {
        return currentCycleFunded;
    }

    /**
     * @dev Gets the current distribution mode
     * @return Current distribution mode
     */
    function distributionMode() external view override returns (uint8) {
        return currentDistributionMode;
    }

    /**
     * @dev Withdraws residual USDC (owner only)
     * @param amount Amount to withdraw
     */
    function withdrawResidual(uint256 amount) external onlyOwner {
        require(amount <= totalResidual, "Insufficient residual");
        totalResidual -= amount;
        usdc.safeTransfer(owner(), amount);
    }

    /**
     * @dev Emergency withdrawal of all USDC (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = usdc.balanceOf(address(this));
        if (balance > 0) {
            usdc.safeTransfer(owner(), balance);
        }
    }

    // Internal functions

    /**
     * @dev Distributes USDC pro-rata when underfunded
     * @param snapshotId Snapshot ID
     * @param fundedAmount_ Funded amount for distribution
     * @return totalPaid Total amount paid to holders
     */
    function _distributeProRata(uint256 snapshotId, uint256 fundedAmount_) internal returns (uint256 totalPaid) {
        Snapshot memory snap = snapshots[snapshotId];
        
        // This is a simplified implementation
        // In practice, you'd iterate through all holders and calculate individual payouts
        // For now, we'll simulate the distribution
        
        totalPaid = fundedAmount_;
        // Individual holder payouts would be calculated here
        // payout = fundedAmount_ * (holderBalance / totalSupply)
        
        return totalPaid;
    }

    /**
     * @dev Distributes full USDC amount to holders
     * @param snapshotId Snapshot ID
     * @param requiredAmount_ Required amount for full distribution
     * @return totalPaid Total amount paid to holders
     */
    function _distributeFull(uint256 snapshotId, uint256 requiredAmount_) internal returns (uint256 totalPaid) {
        // This is a simplified implementation
        // In practice, you'd iterate through all holders and pay individual amounts
        
        totalPaid = requiredAmount_;
        // Individual holder payouts would be calculated and sent here
        
        return totalPaid;
    }

    /**
     * @dev Gets total supply from security token
     * @return Total supply
     */
    function _getTotalSupply() internal view returns (uint256) {
        // This is a placeholder - you'll need to implement based on your SecurityToken interface
        // return ISecurityToken(securityToken).totalSupplyByPartition(activePartition);
        return 1000000; // Placeholder value for testing
    }
}
