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
    
    // Global compliance controls
    bool public globalCompliancePaused;
    mapping(address => bool) public frozen;
    
    // Events are defined in the interface; do not redeclare here
    
    // Constants for reason codes (bytes32)
    bytes32 public constant ERR_OK = keccak256("ERR_OK");
    bytes32 public constant ERR_NOT_WHITELISTED = keccak256("ERR_NOT_WHITELISTED");
    bytes32 public constant ERR_REVOKED = keccak256("ERR_REVOKED");
    bytes32 public constant ERR_CLAIMS_EXPIRED = keccak256("ERR_CLAIMS_EXPIRED");
    bytes32 public constant ERR_LOCKUP_ACTIVE = keccak256("ERR_LOCKUP_ACTIVE");
    bytes32 public constant ERR_DESTINATION_NOT_ACCREDITED_REG_D = keccak256("ERR_DESTINATION_NOT_ACCREDITED_REG_D");
    bytes32 public constant ERR_SOURCE_NOT_ACCREDITED_REG_D = keccak256("ERR_SOURCE_NOT_ACCREDITED_REG_D");
    bytes32 public constant ERR_REG_S_US_PERSON_RESTRICTED = keccak256("ERR_REG_S_US_PERSON_RESTRICTED");
    bytes32 public constant ERR_UNKNOWN_PARTITION = keccak256("ERR_UNKNOWN_PARTITION");
    bytes32 public constant ERR_PARTITION_CROSS_NOT_ALLOWED = keccak256("ERR_PARTITION_CROSS_NOT_ALLOWED");
    bytes32 public constant ERR_PAUSED = keccak256("ERR_PAUSED");
    bytes32 public constant ERR_INTERNAL_POLICY = keccak256("ERR_INTERNAL_POLICY");
    bytes32 public constant ERR_COMPLIANCE_PAUSED = keccak256("ERR_COMPLIANCE_PAUSED");
    bytes32 public constant ERR_FROZEN = keccak256("ERR_FROZEN");

    // New events for defense-in-depth controls
    event GlobalCompliancePausedSet(bool paused);
    event AccountFrozen(address indexed wallet);
    event AccountUnfrozen(address indexed wallet);

    /**
     * @notice Pause or unpause global compliance (admin/timelock only)
     * @param paused New paused state
     */
    function setGlobalCompliancePaused(bool paused) external onlyRole(DEFAULT_ADMIN_ROLE) {
        globalCompliancePaused = paused;
        emit GlobalCompliancePausedSet(paused);
    }

    /**
     * @notice Freeze an account, blocking compliance operations (admin/timelock only)
     * @param wallet Wallet to freeze
     */
    function freeze(address wallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(wallet != address(0), "ComplianceRegistry: wallet cannot be zero");
        frozen[wallet] = true;
        emit AccountFrozen(wallet);
    }

    /**
     * @notice Unfreeze an account (admin/timelock only)
     * @param wallet Wallet to unfreeze
     */
    function unfreeze(address wallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(wallet != address(0), "ComplianceRegistry: wallet cannot be zero");
        frozen[wallet] = false;
        emit AccountUnfrozen(wallet);
    }

    /**
     * @notice Check if an account is frozen
     * @param wallet Wallet address to check
     * @return True if frozen
     */
    function isFrozen(address wallet) external view returns (bool) {
        return frozen[wallet];
    }
    
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
        isRevoked[wallet] = false; // Unrevoke when new claims are set
        
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
     * @return reasonCode Machine-readable reason code (ERR_*)
     * @return lockupUntil Lockup timestamp if blocked due to lockup
     */
    function isTransferAllowed(
        address from,
        address to,
        bytes32 partition,
        uint256 amount
    ) external view override returns (bool ok, bytes32 reasonCode, uint64 lockupUntil) {
        // Global compliance pause
        if (globalCompliancePaused) {
            return (false, ERR_COMPLIANCE_PAUSED, 0);
        }

        // Frozen account checks
        if (from != address(0) && frozen[from]) {
            return (false, ERR_FROZEN, 0);
        }
        if (frozen[to]) {
            return (false, ERR_FROZEN, 0);
        }
        // Skip validation for minting (from == address(0))
        if (from != address(0)) {
            // Check source wallet compliance
            if (!_isWalletCompliant(from)) {
                return (false, ERR_NOT_WHITELISTED, 0);
            }
        }
        
        // Check destination wallet compliance
        if (!_isWalletCompliant(to)) {
            return (false, ERR_NOT_WHITELISTED, 0);
        }
        
        // Check lockup periods
        if (from != address(0)) {
            uint64 lockTs = _lockupUntil(from);
            if (lockTs > 0 && lockTs > block.timestamp) {
                return (false, ERR_LOCKUP_ACTIVE, lockTs);
            }
        }
        
        // Check partition-specific rules
        if (partition == keccak256("REG_D")) {
            bytes32 regDReason = _checkRegDRestrictions(from, to);
            if (regDReason != bytes32(0)) {
                return (false, regDReason, 0);
            }
        } else if (partition == keccak256("REG_S")) {
            bytes32 regSReason = _checkRegSRestrictions(from, to);
            if (regSReason != bytes32(0)) {
                return (false, regSReason, 0);
            }
        } else {
            return (false, ERR_UNKNOWN_PARTITION, 0);
        }
        
        return (true, ERR_OK, 0);
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
        if (frozen[wallet]) return false;
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
     * @return lockTimestamp Lockup timestamp if active, 0 if not locked
     */
    function _lockupUntil(address wallet) internal view returns (uint64) {
        Claims memory walletClaims = claims[wallet];
        if (walletClaims.lockupUntil > block.timestamp) {
            return walletClaims.lockupUntil;
        }
        return 0;
    }
    
    /**
     * @notice Check REG_D restrictions
     * @param to Destination address
     * @return Reason string if restricted, empty if allowed
     */
    function _checkRegDRestrictions(address from, address to) internal view returns (bytes32) {
        Claims memory toClaims = claims[to];
        if (!toClaims.accredited) {
            return ERR_DESTINATION_NOT_ACCREDITED_REG_D;
        }
        Claims memory fromClaims = claims[from];
        if (from != address(0) && !fromClaims.accredited) {
            return ERR_SOURCE_NOT_ACCREDITED_REG_D;
        }
        return bytes32(0);
    }
    
    /**
     * @notice Check REG_S restrictions
     * @param from Source address
     * @param to Destination address
     * @return Reason string if restricted, empty if allowed
     */
    function _checkRegSRestrictions(address from, address to) internal view returns (bytes32) {
        Claims memory toClaims = claims[to];
        Claims memory fromClaims = claims[from];
        
        bool isToUSPerson = (toClaims.countryCode == bytes2("US")) || toClaims.usTaxResident;
        bool isFromUSPerson = (fromClaims.countryCode == bytes2("US")) || fromClaims.usTaxResident;
        
        // Only apply REG_S restrictions to actual transfers (not minting)
        if (from != address(0)) {
            // Block transfers TO US persons (REG_S is for non-US persons only)
            if (isToUSPerson) {
                return ERR_REG_S_US_PERSON_RESTRICTED;
            }
        }
        
        return bytes32(0);
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
