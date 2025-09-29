// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title Treasury
 * @notice Manages reserve tokens for buybacks, liquidity, and partnerships
 * @dev Multi-sig controlled treasury with comprehensive tracking and limits
 */
contract Treasury is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Roles
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");
    bytes32 public constant TREASURY_ADMIN_ROLE = keccak256("TREASURY_ADMIN_ROLE");

    // Supported tokens
    mapping(address => bool) public supportedTokens;
    
    // Token balances tracking
    mapping(address => uint256) public tokenBalances;
    
    // Transaction records
    struct TreasuryTransaction {
        address token;
        address to;
        uint256 amount;
        string purpose;
        uint256 timestamp;
        address executor;
        bool isIncoming;
    }

    TreasuryTransaction[] public transactions;
    
    // Spending limits and tracking
    struct SpendingLimit {
        uint256 dailyLimit;
        uint256 monthlyLimit;
        uint256 dailySpent;
        uint256 monthlySpent;
        uint256 lastDailyReset;
        uint256 lastMonthlyReset;
    }

    mapping(address => SpendingLimit) public spendingLimits;
    
    // Total treasury value tracking (in USD basis points)
    uint256 public totalTreasuryValue;
    uint256 public lastValueUpdate;

    // Events
    event TokensReceived(
        address indexed token,
        uint256 amount,
        address indexed from,
        string purpose
    );
    
    event TokensSent(
        address indexed token,
        address indexed to,
        uint256 amount,
        string purpose,
        address indexed executor
    );
    
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    
    event SpendingLimitUpdated(
        address indexed token,
        uint256 dailyLimit,
        uint256 monthlyLimit
    );
    
    event TreasuryValueUpdated(uint256 newValue, uint256 timestamp);

    // Errors
    error TokenNotSupported();
    error InsufficientBalance();
    error ExceedsDailyLimit();
    error ExceedsMonthlyLimit();
    error InvalidAmount();
    error InvalidRecipient();
    error InvalidPurpose();
    error TokenAlreadySupported();

    /**
     * @notice Constructor
     * @param _admin Address to be granted admin role
     */
    constructor(address _admin) {
        if (_admin == address(0)) {
            revert InvalidRecipient();
        }
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(TREASURY_ADMIN_ROLE, _admin);
        _grantRole(TREASURY_ROLE, _admin);
    }

    /**
     * @notice Add a supported token
     * @param _token Address of the token to support
     */
    function addSupportedToken(address _token) external onlyRole(TREASURY_ADMIN_ROLE) {
        if (_token == address(0)) {
            revert InvalidRecipient();
        }
        
        if (supportedTokens[_token]) {
            revert TokenAlreadySupported();
        }
        
        supportedTokens[_token] = true;
        emit TokenAdded(_token);
    }

    /**
     * @notice Remove a supported token (emergency only)
     * @param _token Address of the token to remove
     */
    function removeSupportedToken(address _token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        supportedTokens[_token] = false;
        emit TokenRemoved(_token);
    }

    /**
     * @notice Set spending limits for a token
     * @param _token Address of the token
     * @param _dailyLimit Daily spending limit
     * @param _monthlyLimit Monthly spending limit
     */
    function setSpendingLimits(
        address _token,
        uint256 _dailyLimit,
        uint256 _monthlyLimit
    ) external onlyRole(TREASURY_ADMIN_ROLE) {
        if (!supportedTokens[_token]) {
            revert TokenNotSupported();
        }
        
        spendingLimits[_token] = SpendingLimit({
            dailyLimit: _dailyLimit,
            monthlyLimit: _monthlyLimit,
            dailySpent: 0,
            monthlySpent: 0,
            lastDailyReset: block.timestamp,
            lastMonthlyReset: block.timestamp
        });
        
        emit SpendingLimitUpdated(_token, _dailyLimit, _monthlyLimit);
    }

    /**
     * @notice Send tokens from treasury
     * @param _token Address of the token to send
     * @param _to Recipient address
     * @param _amount Amount to send
     * @param _purpose Purpose of the transaction (e.g., "Buyback", "Partnership", "Liquidity")
     */
    function sendTokens(
        address _token,
        address _to,
        uint256 _amount,
        string calldata _purpose
    ) external onlyRole(TREASURY_ROLE) nonReentrant whenNotPaused {
        if (!supportedTokens[_token]) {
            revert TokenNotSupported();
        }
        
        if (_to == address(0)) {
            revert InvalidRecipient();
        }
        
        if (_amount == 0) {
            revert InvalidAmount();
        }
        
        if (bytes(_purpose).length == 0) {
            revert InvalidPurpose();
        }

        // Check balance
        uint256 balance = IERC20(_token).balanceOf(address(this));
        if (balance < _amount) {
            revert InsufficientBalance();
        }

        // Check spending limits
        _checkSpendingLimits(_token, _amount);

        // Update spending tracking
        _updateSpendingTracking(_token, _amount);

        // Update token balance tracking
        tokenBalances[_token] -= _amount;

        // Record transaction
        transactions.push(TreasuryTransaction({
            token: _token,
            to: _to,
            amount: _amount,
            purpose: _purpose,
            timestamp: block.timestamp,
            executor: msg.sender,
            isIncoming: false
        }));

        // Transfer tokens
        IERC20(_token).safeTransfer(_to, _amount);

        emit TokensSent(_token, _to, _amount, _purpose, msg.sender);
    }

    /**
     * @notice Batch send tokens to multiple recipients
     * @param _token Address of the token to send
     * @param _recipients Array of recipient addresses
     * @param _amounts Array of amounts to send
     * @param _purpose Purpose of the transaction
     */
    function batchSendTokens(
        address _token,
        address[] calldata _recipients,
        uint256[] calldata _amounts,
        string calldata _purpose
    ) external onlyRole(TREASURY_ROLE) nonReentrant whenNotPaused {
        if (_recipients.length != _amounts.length) {
            revert InvalidAmount();
        }

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            totalAmount += _amounts[i];
        }

        // Check balance
        uint256 balance = IERC20(_token).balanceOf(address(this));
        if (balance < totalAmount) {
            revert InsufficientBalance();
        }

        // Check spending limits
        _checkSpendingLimits(_token, totalAmount);

        // Update spending tracking
        _updateSpendingTracking(_token, totalAmount);

        // Update token balance tracking
        tokenBalances[_token] -= totalAmount;

        // Send to each recipient
        for (uint256 i = 0; i < _recipients.length; i++) {
            if (_recipients[i] == address(0)) {
                revert InvalidRecipient();
            }
            
            if (_amounts[i] == 0) {
                revert InvalidAmount();
            }

            // Record transaction
            transactions.push(TreasuryTransaction({
                token: _token,
                to: _recipients[i],
                amount: _amounts[i],
                purpose: _purpose,
                timestamp: block.timestamp,
                executor: msg.sender,
                isIncoming: false
            }));

            // Transfer tokens
            IERC20(_token).safeTransfer(_recipients[i], _amounts[i]);
            
            emit TokensSent(_token, _recipients[i], _amounts[i], _purpose, msg.sender);
        }
    }

    /**
     * @notice Receive tokens into treasury (external call)
     * @param _token Address of the token received
     * @param _amount Amount received
     * @param _purpose Purpose of the incoming transaction
     */
    function receiveTokens(
        address _token,
        uint256 _amount,
        string calldata _purpose
    ) external {
        if (!supportedTokens[_token]) {
            revert TokenNotSupported();
        }
        
        if (_amount == 0) {
            revert InvalidAmount();
        }
        
        if (bytes(_purpose).length == 0) {
            revert InvalidPurpose();
        }

        // Transfer tokens to treasury
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        // Update token balance tracking
        tokenBalances[_token] += _amount;

        // Record transaction
        transactions.push(TreasuryTransaction({
            token: _token,
            to: address(this),
            amount: _amount,
            purpose: _purpose,
            timestamp: block.timestamp,
            executor: msg.sender,
            isIncoming: true
        }));

        emit TokensReceived(_token, _amount, msg.sender, _purpose);
    }

    /**
     * @notice Update treasury value (admin only)
     * @param _newValue New treasury value in USD basis points
     */
    function updateTreasuryValue(uint256 _newValue) external onlyRole(TREASURY_ADMIN_ROLE) {
        totalTreasuryValue = _newValue;
        lastValueUpdate = block.timestamp;
        
        emit TreasuryValueUpdated(_newValue, block.timestamp);
    }

    /**
     * @notice Pause treasury operations
     */
    function pause() external onlyRole(TREASURY_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause treasury operations
     */
    function unpause() external onlyRole(TREASURY_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Get current token balance
     * @param _token Address of the token
     * @return Current balance
     */
    function getTokenBalance(address _token) external view returns (uint256) {
        return IERC20(_token).balanceOf(address(this));
    }

    /**
     * @notice Get transaction count
     * @return Number of transactions
     */
    function getTransactionCount() external view returns (uint256) {
        return transactions.length;
    }

    /**
     * @notice Get transaction by index
     * @param _index Index of the transaction
     * @return Transaction struct
     */
    function getTransaction(uint256 _index) external view returns (TreasuryTransaction memory) {
        return transactions[_index];
    }

    /**
     * @notice Get spending limit info for a token
     * @param _token Address of the token
     * @return Spending limit struct
     */
    function getSpendingLimit(address _token) external view returns (SpendingLimit memory) {
        return spendingLimits[_token];
    }

    /**
     * @notice Check spending limits
     * @param _token Address of the token
     * @param _amount Amount to spend
     */
    function _checkSpendingLimits(address _token, uint256 _amount) internal view {
        SpendingLimit memory limit = spendingLimits[_token];
        
        if (limit.dailyLimit > 0 && limit.dailySpent + _amount > limit.dailyLimit) {
            revert ExceedsDailyLimit();
        }
        
        if (limit.monthlyLimit > 0 && limit.monthlySpent + _amount > limit.monthlyLimit) {
            revert ExceedsMonthlyLimit();
        }
    }

    /**
     * @notice Update spending tracking
     * @param _token Address of the token
     * @param _amount Amount spent
     */
    function _updateSpendingTracking(address _token, uint256 _amount) internal {
        SpendingLimit storage limit = spendingLimits[_token];
        
        // Reset daily tracking if needed
        if (block.timestamp - limit.lastDailyReset >= 1 days) {
            limit.dailySpent = 0;
            limit.lastDailyReset = block.timestamp;
        }
        
        // Reset monthly tracking if needed
        if (block.timestamp - limit.lastMonthlyReset >= 30 days) {
            limit.monthlySpent = 0;
            limit.lastMonthlyReset = block.timestamp;
        }
        
        // Update spent amounts
        limit.dailySpent += _amount;
        limit.monthlySpent += _amount;
    }

    /**
     * @notice Emergency function to withdraw tokens (super admin only)
     * @param _token Address of the token to withdraw
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_amount > IERC20(_token).balanceOf(address(this))) {
            revert InsufficientBalance();
        }
        
        IERC20(_token).safeTransfer(msg.sender, _amount);
    }
}
