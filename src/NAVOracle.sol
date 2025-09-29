// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title NAVOracle
 * @notice Net Asset Value (NAV) oracle for real estate token valuation
 * @dev Currently supports manual NAV updates, designed for future Chainlink integration
 */
contract NAVOracle is AccessControl, Pausable {
    // Roles
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant ORACLE_ADMIN_ROLE = keccak256("ORACLE_ADMIN_ROLE");

    // NAV data structure
    struct NAVData {
        uint256 value;           // NAV value in USD (with decimals)
        uint256 timestamp;       // When the NAV was last updated
        string source;           // Source of the NAV data
        uint256 confidence;      // Confidence level (0-100)
        bool isValid;            // Whether the NAV data is valid
    }

    // Current NAV data
    NAVData public currentNAV;
    
    // Historical NAV data
    NAVData[] public navHistory;
    
    // NAV update frequency limits
    uint256 public minUpdateInterval = 3600; // 1 hour minimum between updates
    uint256 public maxUpdateInterval = 86400; // 24 hours maximum between updates
    
    // NAV validation parameters
    uint256 public maxNAVChangePercent = 5000; // 50% maximum change (in basis points)
    uint256 public minConfidenceLevel = 80;    // Minimum confidence level required
    
    // Supported tokens for NAV calculation
    mapping(address => bool) public supportedTokens;
    
    // Token weights in NAV calculation
    mapping(address => uint256) public tokenWeights; // In basis points (10000 = 100%)
    
    // Events
    event NAVUpdated(
        uint256 indexed newValue,
        uint256 indexed previousValue,
        string source,
        uint256 confidence,
        address indexed updater
    );
    
    event NAVValidationFailed(
        uint256 proposedValue,
        uint256 currentValue,
        string reason
    );
    
    event TokenAdded(address indexed token, uint256 weight);
    event TokenRemoved(address indexed token);
    event TokenWeightUpdated(address indexed token, uint256 newWeight);
    
    event UpdateIntervalUpdated(uint256 minInterval, uint256 maxInterval);
    event ValidationParametersUpdated(uint256 maxChangePercent, uint256 minConfidence);

    // Errors
    error InvalidNAVValue();
    error UpdateTooFrequent();
    error UpdateTooDelayed();
    error NAVChangeTooLarge();
    error ConfidenceTooLow();
    error InvalidConfidenceLevel();
    error InvalidUpdateInterval();
    error InvalidChangePercent();
    error InvalidSource();
    error TokenNotSupported();
    error TokenAlreadySupported();
    error InvalidTokenWeight();
    error NAVNotInitialized();

    /**
     * @notice Constructor
     * @param _admin Address to be granted admin role
     * @param _oracle Address to be granted oracle role
     */
    constructor(address _admin, address _oracle) {
        if (_admin == address(0) || _oracle == address(0)) {
            revert InvalidNAVValue();
        }
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ORACLE_ADMIN_ROLE, _admin);
        _grantRole(ORACLE_ROLE, _oracle);
    }

    /**
     * @notice Set NAV value (manual update)
     * @param _newValue New NAV value in USD
     * @param _source Source of the NAV data
     * @param _confidence Confidence level (0-100)
     */
    function setNAV(
        uint256 _newValue,
        string calldata _source,
        uint256 _confidence
    ) external onlyRole(ORACLE_ROLE) whenNotPaused {
        if (_newValue == 0) {
            revert InvalidNAVValue();
        }
        
        if (bytes(_source).length == 0) {
            revert InvalidSource();
        }
        
        if (_confidence < minConfidenceLevel || _confidence > 100) {
            revert ConfidenceTooLow();
        }

        // Check update frequency
        if (currentNAV.timestamp > 0) {
            uint256 timeSinceLastUpdate = block.timestamp - currentNAV.timestamp;
            
            if (timeSinceLastUpdate < minUpdateInterval) {
                revert UpdateTooFrequent();
            }
            
            if (timeSinceLastUpdate > maxUpdateInterval) {
                revert UpdateTooDelayed();
            }

            // Validate NAV change
            _validateNAVChange(_newValue, currentNAV.value);
        }

        uint256 previousValue = currentNAV.value;
        
        // Update current NAV
        currentNAV = NAVData({
            value: _newValue,
            timestamp: block.timestamp,
            source: _source,
            confidence: _confidence,
            isValid: true
        });

        // Add to history
        navHistory.push(currentNAV);

        emit NAVUpdated(_newValue, previousValue, _source, _confidence, msg.sender);
    }

    /**
     * @notice Add supported token for NAV calculation
     * @param _token Address of the token
     * @param _weight Weight in basis points (10000 = 100%)
     */
    function addSupportedToken(address _token, uint256 _weight) external onlyRole(ORACLE_ADMIN_ROLE) {
        if (_token == address(0)) {
            revert InvalidNAVValue();
        }
        
        if (supportedTokens[_token]) {
            revert TokenAlreadySupported();
        }
        
        if (_weight > 10000) {
            revert InvalidTokenWeight();
        }
        
        supportedTokens[_token] = true;
        tokenWeights[_token] = _weight;
        
        emit TokenAdded(_token, _weight);
    }

    /**
     * @notice Remove supported token
     * @param _token Address of the token to remove
     */
    function removeSupportedToken(address _token) external onlyRole(ORACLE_ADMIN_ROLE) {
        supportedTokens[_token] = false;
        tokenWeights[_token] = 0;
        
        emit TokenRemoved(_token);
    }

    /**
     * @notice Update token weight
     * @param _token Address of the token
     * @param _newWeight New weight in basis points
     */
    function updateTokenWeight(address _token, uint256 _newWeight) external onlyRole(ORACLE_ADMIN_ROLE) {
        if (!supportedTokens[_token]) {
            revert TokenNotSupported();
        }
        
        if (_newWeight > 10000) {
            revert InvalidTokenWeight();
        }
        
        tokenWeights[_token] = _newWeight;
        
        emit TokenWeightUpdated(_token, _newWeight);
    }

    /**
     * @notice Set update interval parameters
     * @param _minInterval Minimum time between updates (seconds)
     * @param _maxInterval Maximum time between updates (seconds)
     */
    function setUpdateIntervals(uint256 _minInterval, uint256 _maxInterval) external onlyRole(ORACLE_ADMIN_ROLE) {
        if (_minInterval >= _maxInterval) {
            revert InvalidUpdateInterval();
        }
        
        minUpdateInterval = _minInterval;
        maxUpdateInterval = _maxInterval;
        
        emit UpdateIntervalUpdated(_minInterval, _maxInterval);
    }

    /**
     * @notice Set validation parameters
     * @param _maxChangePercent Maximum allowed change in basis points
     * @param _minConfidence Minimum confidence level required
     */
    function setValidationParameters(uint256 _maxChangePercent, uint256 _minConfidence) external onlyRole(ORACLE_ADMIN_ROLE) {
        if (_maxChangePercent > 10000) {
            revert InvalidChangePercent();
        }
        
        if (_minConfidence > 100) {
            revert InvalidConfidenceLevel();
        }
        
        maxNAVChangePercent = _maxChangePercent;
        minConfidenceLevel = _minConfidence;
        
        emit ValidationParametersUpdated(_maxChangePercent, _minConfidence);
    }

    /**
     * @notice Invalidate current NAV (emergency function)
     */
    function invalidateNAV() external onlyRole(ORACLE_ADMIN_ROLE) {
        currentNAV.isValid = false;
    }

    /**
     * @notice Pause NAV updates
     */
    function pause() external onlyRole(ORACLE_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause NAV updates
     */
    function unpause() external onlyRole(ORACLE_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Get current NAV value
     * @return Current NAV value
     */
    function getNAV() external view returns (uint256) {
        if (!currentNAV.isValid) {
            revert NAVNotInitialized();
        }
        return currentNAV.value;
    }

    /**
     * @notice Get current NAV data
     * @return Current NAV data struct
     */
    function getNAVData() external view returns (NAVData memory) {
        return currentNAV;
    }

    /**
     * @notice Get NAV history count
     * @return Number of historical NAV records
     */
    function getNAVHistoryCount() external view returns (uint256) {
        return navHistory.length;
    }

    /**
     * @notice Get NAV history entry
     * @param _index Index of the history entry
     * @return NAV data struct
     */
    function getNAVHistory(uint256 _index) external view returns (NAVData memory) {
        return navHistory[_index];
    }

    /**
     * @notice Get latest NAV with age check
     * @return nav Current NAV value
     * @return age Age of the NAV in seconds
     * @return isValid Whether the NAV is valid and recent
     */
    function getNAVWithAge() external view returns (uint256 nav, uint256 age, bool isValid) {
        if (!currentNAV.isValid) {
            return (0, 0, false);
        }
        
        age = block.timestamp - currentNAV.timestamp;
        isValid = age <= maxUpdateInterval;
        
        return (currentNAV.value, age, isValid);
    }

    /**
     * @notice Validate NAV change
     * @param _newValue New NAV value
     * @param _currentValue Current NAV value
     */
    function _validateNAVChange(uint256 _newValue, uint256 _currentValue) internal view {
        if (_currentValue == 0) return; // Skip validation for first update
        
        uint256 changePercent;
        
        if (_newValue > _currentValue) {
            changePercent = ((_newValue - _currentValue) * 10000) / _currentValue;
        } else {
            changePercent = ((_currentValue - _newValue) * 10000) / _currentValue;
        }
        
        if (changePercent > maxNAVChangePercent) {
            emit NAVValidationFailed(_newValue, _currentValue, "Change too large");
            revert NAVChangeTooLarge();
        }
    }

    /**
     * @notice Calculate weighted average of token prices (future Chainlink integration)
     * @dev This is a placeholder for future Chainlink price feed integration
     * @return weightedAverage Weighted average price
     */
    function calculateWeightedAverage() external view returns (uint256 weightedAverage) {
        // This would integrate with Chainlink price feeds in the future
        // For now, return the current NAV as a placeholder
        return currentNAV.value;
    }
}
