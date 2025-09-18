// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./roles/OracleRole.sol";
import "./interfaces/IComplianceRegistry.sol";

/**
 * @title ComplianceRegistry
 * @notice Single source of truth for investor compliance and transfer rules
 * @dev Manages claims, whitelisting, and enforces REG_D/REG_S transfer restrictions
 */
contract ComplianceRegistry is OracleRole, IComplianceRegistry {
    // Claims storage
    mapping(address => Claims) public claims;
    
    // Organization isolation
    mapping(address => bool) public isWhitelisted;
    mapping(address => bool) public isRevoked;
    
    // Events (must match interface exactly)
    event ClaimsSet(address indexed wallet, Claims claims);
    event WalletRevoked(address indexed wallet);
    event WalletWhitelisted(address indexed wallet);
    
    // Constants for reason codes
    string public constant REASON_OK = "OK";
    string public constant REASON_NOT_WHITELISTED = "WALLET_NOT_WHITELISTED";
    string public constant REASON_REVOKED = "WALLET_REVOKED_SANCTIONS";
    string public constant REASON_EXPIRED = "CLAIMS_EXPIRED_REVERIFY";
    string public constant REASON_LOCKUP_ACTIVE = "LOCKUP_ACTIVE_UNTIL_";
    string public constant REASON_NOT_ACCREDITED = "DESTINATION_NOT_ACCREDITED_REG_D";
    string public constant REASON_US_PERSON_RESTRICTED = "REG_S_RESTRICTED_US_PERSON";
    
    /**
     * @notice Set compliance claims for a wallet
     * @param wallet Wallet address
     * @param newClaims New claims data
     */
    function setClaims(address wallet, Claims calldata newClaims) external onlyOracle {
        require(wallet != address(0), "ComplianceRegistry: wallet cannot be zero");
        require(newClaims.countryCode != bytes2(0), "ComplianceRegistry: country code required");
        
        // Validate lockup period
        if (newClaims.lockupUntil > 0) {
            require(newClaims.lockupUntil > block.timestamp, "ComplianceRegistry: lockup must be in future");
        }
        
        // Validate expiration
        if (newClaims.expiresAt > 0) {
            require(newClaims.expiresAt > block.timestamp, "ComplianceRegistry: expiration must be in future");
        }
        
        claims[wallet] = newClaims;
        isWhitelisted[wallet] = true;
        
        emit ClaimsSet(wallet, newClaims);
    }
    
    /**
     * @notice Revoke a wallet's compliance status
     * @param wallet Wallet address to revoke
     */
    function revoke(address wallet) external onlyOracle {
        require(wallet != address(0), "ComplianceRegistry: wallet cannot be zero");
        
        isRevoked[wallet] = true;
        isWhitelisted[wallet] = false;
        
        emit WalletRevoked(wallet);
    }
    
    /**
     * @notice Whitelist a wallet
     * @param wallet Wallet address to whitelist
     */
    function whitelist(address wallet) external onlyOracle {
        require(wallet != address(0), "ComplianceRegistry: wallet cannot be zero");
        require(claims[wallet].countryCode != bytes2(0), "ComplianceRegistry: claims must be set first");
        
        isWhitelisted[wallet] = true;
        isRevoked[wallet] = false;
        
        emit WalletWhitelisted(wallet);
    }
    
    /**
     * @notice Check if a wallet is whitelisted
     * @param wallet Wallet address to check
     * @return True if whitelisted
     */
    function isWalletWhitelisted(address wallet) external view override returns (bool) {
        if (wallet == address(0)) return false;
        
        Claims memory walletClaims = claims[wallet];
        
        // Check if wallet has claims
        if (walletClaims.countryCode == bytes2(0)) return false;
        
        // Check if revoked
        if (isRevoked[wallet]) return false;
        
        // Check if claims expired
        if (walletClaims.expiresAt > 0 && walletClaims.expiresAt <= block.timestamp) return false;
        
        return isWhitelisted[wallet];
    }
    
    /**
     * @notice Check if a transfer is allowed
     * @param from Source address
     * @param to Destination address
     * @param partition Target partition
     * @param amount Transfer amount
     * @return ok True if transfer allowed
     * @return reason Reason for decision
     */
    function isTransferAllowed(
        address from,
        address to,
        bytes32 partition,
        uint256 amount
    ) external view override returns (bool ok, string memory reason) {
        // Skip validation for minting (from == address(0))
        if (from != address(0)) {
            // Check source wallet compliance
            if (!_isWalletCompliant(from)) {
                return (false, REASON_NOT_WHITELISTED);
            }
        }
        
        // Check destination wallet compliance
        if (!_isWalletCompliant(to)) {
            return (false, REASON_NOT_WHITELISTED);
        }
        
        // Check lockup periods
        if (from != address(0)) {
            string memory lockupReason = _checkLockupRestriction(from, partition);
            if (bytes(lockupReason).length > 0) {
                return (false, lockupReason);
            }
        }
        
        // Check partition-specific rules
        if (partition == keccak256("REG_D")) {
            string memory regDReason = _checkRegDRestrictions(to);
            if (bytes(regDReason).length > 0) {
                return (false, regDReason);
            }
        } else if (partition == keccak256("REG_S")) {
            string memory regSReason = _checkRegSRestrictions(to);
            if (bytes(regSReason).length > 0) {
                return (false, regSReason);
            }
        }
        
        return (true, REASON_OK);
    }
    
    /**
     * @notice Get claims for a wallet
     * @param wallet Wallet address
     * @return Claims data
     */
    function getClaims(address wallet) external view returns (Claims memory) {
        return claims[wallet];
    }
    
    /**
     * @notice Check if wallet is compliant (internal)
     * @param wallet Wallet address
     * @return True if compliant
     */
    function _isWalletCompliant(address wallet) internal view returns (bool) {
        if (wallet == address(0)) return false;
        if (isRevoked[wallet]) return false;
        if (!isWhitelisted[wallet]) return false;
        
        Claims memory walletClaims = claims[wallet];
        if (walletClaims.countryCode == bytes2(0)) return false;
        
        if (walletClaims.expiresAt > 0 && walletClaims.expiresAt <= block.timestamp) return false;
        
        return true;
    }
    
    /**
     * @notice Check lockup restrictions
     * @param wallet Wallet address
     * @param partition Target partition
     * @return Reason string if locked, empty if allowed
     */
    function _checkLockupRestriction(address wallet, bytes32 partition) internal view returns (string memory) {
        Claims memory walletClaims = claims[wallet];
        
        if (walletClaims.lockupUntil > 0 && walletClaims.lockupUntil > block.timestamp) {
            // Format date as YYYY-MM-DD
            uint256 year = walletClaims.lockupUntil / 365 days + 1970;
            uint256 month = (walletClaims.lockupUntil % 365 days) / 30 days + 1;
            uint256 day = (walletClaims.lockupUntil % 30 days) + 1;
            
            return string(abi.encodePacked(
                REASON_LOCKUP_ACTIVE,
                _uintToString(year), "-",
                _uintToString(month), "-",
                _uintToString(day)
            ));
        }
        
        return "";
    }
    
    /**
     * @notice Check REG_D restrictions
     * @param to Destination address
     * @return Reason string if restricted, empty if allowed
     */
    function _checkRegDRestrictions(address to) internal view returns (string memory) {
        Claims memory toClaims = claims[to];
        
        if (!toClaims.accredited) {
            return REASON_NOT_ACCREDITED;
        }
        
        return "";
    }
    
    /**
     * @notice Check REG_S restrictions
     * @param to Destination address
     * @return Reason string if restricted, empty if allowed
     */
    function _checkRegSRestrictions(address to) internal view returns (string memory) {
        Claims memory toClaims = claims[to];
        
        // Check if destination is US person (simplified check)
        if (toClaims.countryCode == bytes2("US")) {
            // For pilot: assume 6-month restriction period
            // In production: this would be configurable per property
            uint256 restrictionEnd = toClaims.lockupUntil + 6 * 30 days;
            
            if (block.timestamp < restrictionEnd) {
                return REASON_US_PERSON_RESTRICTED;
            }
        }
        
        return "";
    }
    
    /**
     * @notice Convert uint to string (internal helper)
     * @param value Value to convert
     * @return String representation
     */
    function _uintToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        
        uint256 temp = value;
        uint256 digits;
        
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }
}
