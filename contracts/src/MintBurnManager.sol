// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ISecurityToken} from "../src/interfaces/ISecurityToken.sol";

/**
 * @title MintBurnManager
 * @notice Manages minting and burning of security tokens with role-based access control
 * @dev Designed for real estate tokenization where tokens represent property deeds
 */
contract MintBurnManager is AccessControl, ReentrancyGuard, Pausable {
    // Roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant MANAGER_ADMIN_ROLE = keccak256("MANAGER_ADMIN_ROLE");

    // Security token contract
    ISecurityToken public immutable securityToken;

    // Mint/Burn tracking
    struct MintRecord {
        address to;
        uint256 amount;
        bytes32 partition;
        string reason;
        uint256 timestamp;
        address minter;
    }

    struct BurnRecord {
        address from;
        uint256 amount;
        bytes32 partition;
        string reason;
        uint256 timestamp;
        address burner;
    }

    // Records arrays
    MintRecord[] public mintRecords;
    BurnRecord[] public burnRecords;

    // Total minted/burned tracking
    uint256 public totalMinted;
    uint256 public totalBurned;

    // Mint/Burn limits (can be set by admin)
    uint256 public maxMintPerTransaction = 1000000 * 10**18; // 1M tokens max per mint
    uint256 public maxBurnPerTransaction = 1000000 * 10**18; // 1M tokens max per burn
    uint256 public dailyMintLimit = 10000000 * 10**18; // 10M tokens per day
    uint256 public dailyBurnLimit = 10000000 * 10**18; // 10M tokens per day

    // Daily tracking
    mapping(uint256 => uint256) public dailyMinted; // date => amount
    mapping(uint256 => uint256) public dailyBurned; // date => amount

    // Events
    event TokensMinted(
        address indexed to,
        uint256 amount,
        bytes32 indexed partition,
        string reason,
        address indexed minter
    );
    
    event TokensBurned(
        address indexed from,
        uint256 amount,
        bytes32 indexed partition,
        string reason,
        address indexed burner
    );
    
    event LimitsUpdated(
        uint256 maxMintPerTransaction,
        uint256 maxBurnPerTransaction,
        uint256 dailyMintLimit,
        uint256 dailyBurnLimit
    );

    // Errors
    error InvalidAmount();
    error ExceedsMintLimit();
    error ExceedsBurnLimit();
    error ExceedsDailyMintLimit();
    error ExceedsDailyBurnLimit();
    error InsufficientBalance();
    error InvalidPartition();
    error InvalidRecipient();
    error MintingPaused();
    error BurningPaused();

    /**
     * @notice Constructor
     * @param _securityToken Address of the security token contract
     * @param _admin Address to be granted admin role
     */
    constructor(address _securityToken, address _admin) {
        if (_securityToken == address(0) || _admin == address(0)) {
            revert InvalidRecipient();
        }
        
        securityToken = ISecurityToken(_securityToken);
        
        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MANAGER_ADMIN_ROLE, _admin);
        _grantRole(MINTER_ROLE, _admin);
        _grantRole(BURNER_ROLE, _admin);
    }

    /**
     * @notice Mint tokens to a recipient (only MINTER_ROLE)
     * @param _to Recipient address
     * @param _amount Amount to mint
     * @param _partition Partition to mint to (REG_D or REG_S)
     * @param _reason Reason for minting (e.g., "Property deed contribution")
     */
    function mint(
        address _to,
        uint256 _amount,
        bytes32 _partition,
        string calldata _reason
    ) external onlyRole(MINTER_ROLE) nonReentrant whenNotPaused {
        if (_to == address(0)) {
            revert InvalidRecipient();
        }
        
        if (_amount == 0) {
            revert InvalidAmount();
        }
        
        if (_amount > maxMintPerTransaction) {
            revert ExceedsMintLimit();
        }

        // Check daily limit
        uint256 today = _getToday();
        if (dailyMinted[today] + _amount > dailyMintLimit) {
            revert ExceedsDailyMintLimit();
        }

        // Validate partition
        if (_partition != bytes32("REG_D") && _partition != bytes32("REG_S")) {
            revert InvalidPartition();
        }

        // Update tracking
        totalMinted += _amount;
        dailyMinted[today] += _amount;

        // Record the mint
        mintRecords.push(MintRecord({
            to: _to,
            amount: _amount,
            partition: _partition,
            reason: _reason,
            timestamp: block.timestamp,
            minter: msg.sender
        }));

        // Perform the mint via security token
        securityToken.mintByPartition(_partition, _to, _amount, "");

        emit TokensMinted(_to, _amount, _partition, _reason, msg.sender);
    }

    /**
     * @notice Burn tokens from a holder (only BURNER_ROLE)
     * @param _from Address to burn from
     * @param _amount Amount to burn
     * @param _partition Partition to burn from
     * @param _reason Reason for burning (e.g., "Property redemption")
     */
    function burn(
        address _from,
        uint256 _amount,
        bytes32 _partition,
        string calldata _reason
    ) external onlyRole(BURNER_ROLE) nonReentrant whenNotPaused {
        if (_from == address(0)) {
            revert InvalidRecipient();
        }
        
        if (_amount == 0) {
            revert InvalidAmount();
        }
        
        if (_amount > maxBurnPerTransaction) {
            revert ExceedsBurnLimit();
        }

        // Check daily limit
        uint256 today = _getToday();
        if (dailyBurned[today] + _amount > dailyBurnLimit) {
            revert ExceedsDailyBurnLimit();
        }

        // Validate partition
        if (_partition != bytes32("REG_D") && _partition != bytes32("REG_S")) {
            revert InvalidPartition();
        }

        // Check balance
        if (securityToken.balanceOfByPartition(_partition, _from) < _amount) {
            revert InsufficientBalance();
        }

        // Update tracking
        totalBurned += _amount;
        dailyBurned[today] += _amount;

        // Record the burn
        burnRecords.push(BurnRecord({
            from: _from,
            amount: _amount,
            partition: _partition,
            reason: _reason,
            timestamp: block.timestamp,
            burner: msg.sender
        }));

        // Perform the burn via security token
        securityToken.burnByPartition(_partition, _from, _amount);

        emit TokensBurned(_from, _amount, _partition, _reason, msg.sender);
    }

    /**
     * @notice Batch mint tokens to multiple recipients
     * @param _recipients Array of recipient addresses
     * @param _amounts Array of amounts to mint
     * @param _partition Partition to mint to
     * @param _reason Reason for minting
     */
    function batchMint(
        address[] calldata _recipients,
        uint256[] calldata _amounts,
        bytes32 _partition,
        string calldata _reason
    ) external onlyRole(MINTER_ROLE) nonReentrant whenNotPaused {
        if (_recipients.length != _amounts.length) {
            revert InvalidAmount();
        }

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            totalAmount += _amounts[i];
        }

        // Check daily limit
        uint256 today = _getToday();
        if (dailyMinted[today] + totalAmount > dailyMintLimit) {
            revert ExceedsDailyMintLimit();
        }

        // Update tracking
        totalMinted += totalAmount;
        dailyMinted[today] += totalAmount;

        // Mint to each recipient
        for (uint256 i = 0; i < _recipients.length; i++) {
            if (_recipients[i] == address(0)) {
                revert InvalidRecipient();
            }
            
            if (_amounts[i] == 0) {
                revert InvalidAmount();
            }

            // Record the mint
            mintRecords.push(MintRecord({
                to: _recipients[i],
                amount: _amounts[i],
                partition: _partition,
                reason: _reason,
                timestamp: block.timestamp,
                minter: msg.sender
            }));

            // Perform the mint
            securityToken.mintByPartition(_partition, _recipients[i], _amounts[i], "");
            
            emit TokensMinted(_recipients[i], _amounts[i], _partition, _reason, msg.sender);
        }
    }

    /**
     * @notice Set mint/burn limits (admin only)
     * @param _maxMintPerTransaction Maximum tokens per mint transaction
     * @param _maxBurnPerTransaction Maximum tokens per burn transaction
     * @param _dailyMintLimit Daily mint limit
     * @param _dailyBurnLimit Daily burn limit
     */
    function setLimits(
        uint256 _maxMintPerTransaction,
        uint256 _maxBurnPerTransaction,
        uint256 _dailyMintLimit,
        uint256 _dailyBurnLimit
    ) external onlyRole(MANAGER_ADMIN_ROLE) {
        maxMintPerTransaction = _maxMintPerTransaction;
        maxBurnPerTransaction = _maxBurnPerTransaction;
        dailyMintLimit = _dailyMintLimit;
        dailyBurnLimit = _dailyBurnLimit;

        emit LimitsUpdated(_maxMintPerTransaction, _maxBurnPerTransaction, _dailyMintLimit, _dailyBurnLimit);
    }

    /**
     * @notice Pause minting operations
     */
    function pauseMinting() external onlyRole(MANAGER_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause minting operations
     */
    function unpauseMinting() external onlyRole(MANAGER_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Get total number of mint records
     * @return Number of mint records
     */
    function getMintRecordsCount() external view returns (uint256) {
        return mintRecords.length;
    }

    /**
     * @notice Get total number of burn records
     * @return Number of burn records
     */
    function getBurnRecordsCount() external view returns (uint256) {
        return burnRecords.length;
    }

    /**
     * @notice Get mint record by index
     * @param _index Index of the mint record
     * @return Mint record struct
     */
    function getMintRecord(uint256 _index) external view returns (MintRecord memory) {
        return mintRecords[_index];
    }

    /**
     * @notice Get burn record by index
     * @param _index Index of the burn record
     * @return Burn record struct
     */
    function getBurnRecord(uint256 _index) external view returns (BurnRecord memory) {
        return burnRecords[_index];
    }

    /**
     * @notice Get daily mint/burn amounts for a specific date
     * @param _date Date in YYYYMMDD format
     * @return minted Amount minted on that date
     * @return burned Amount burned on that date
     */
    function getDailyAmounts(uint256 _date) external view returns (uint256 minted, uint256 burned) {
        return (dailyMinted[_date], dailyBurned[_date]);
    }

    /**
     * @notice Get today's date in YYYYMMDD format
     * @return Today's date
     */
    function _getToday() internal view returns (uint256) {
        // This is a simplified version - in production, you might want to use
        // a more sophisticated time-based solution or oracle
        return block.timestamp / 86400; // Days since epoch
    }
}
