// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ComplianceTypes
/// @notice Structured types for COINSCIOUS compliance system
/// @dev Provides clean, typed interfaces for compliance data structures
library ComplianceTypes {
    
    /// @notice Tax form types for different jurisdictions
    enum TaxForm { 
        None,       // No tax form required
        W9,         // US person (W-9)
        W8BEN,      // Non-US individual (W-8BEN)
        W8BENE      // Non-US entity (W-8BENE)
    }

    /// @notice Comprehensive compliance claims for a wallet
    /// @dev Packed for gas efficiency - total size: 32 bytes
    struct Claims {
        bool isUsPerson;                 // true for US person (Reg S block)
        bool accredited;                 // Reg D 506(c) accreditation status
        uint64 accreditationExpiresAt;   // unix seconds; 0 = unset
        bytes2 countryIso2;              // e.g., "US", "GB" (packed)
        bool sanctioned;                 // OFAC/blocked status
        TaxForm taxForm;                 // required tax form for payouts
        bytes32 provider;                // e.g., keccak256("InvestReady")
        uint64 kycLastCheckedAt;         // audit timestamp
    }

    /// @notice Per-account state for compliance controls
    struct AccountState {
        bool frozen;                     // per-account freeze status
    }

    /// @notice Token lot for Rule 144 compliance
    /// @dev Tracks individual token lots with unlock times
    struct Lot {
        uint128 amount;                  // amount of tokens in this lot
        uint64 unlockTime;               // Rule 144 unlock timestamp
    }

    /// @notice Snapshot information for payouts
    struct SnapshotInfo {
        uint64 id;                       // unique snapshot identifier
        uint64 takenAt;                  // timestamp when snapshot was taken
        uint256 totalSupply;             // total supply at snapshot time
        bool distributed;                // whether this snapshot has been distributed
    }

    /// @notice Validation result for compliance checks
    struct ValidationResult {
        bool valid;                      // whether the operation is valid
        bytes32 reasonCode;              // reason code if invalid
        string message;                  // human-readable message
    }

    /// @notice Transfer context for compliance validation
    struct TransferContext {
        address from;                    // sender address
        address to;                      // recipient address
        uint256 amount;                  // transfer amount
        bytes32 partition;               // token partition (REG_D/REG_S)
        bytes data;                      // additional transfer data
    }

    /// @notice Payout context for distribution validation
    struct PayoutContext {
        uint64 snapshotId;               // snapshot identifier
        address token;                   // token contract address
        address distributor;             // payout distributor address
        uint256 totalAmount;             // total payout amount
        address[] recipients;            // payout recipients
    }

    /// @notice Compliance event data
    struct ComplianceEvent {
        address wallet;                  // affected wallet
        string action;                   // action taken (e.g., "freeze", "unfreeze")
        bytes32 reasonCode;              // reason for the action
        uint64 timestamp;                // event timestamp
        address operator;                // operator who performed the action
    }

    /// @notice Check if claims are valid and not expired
    /// @param claims The claims to validate
    /// @return valid True if claims are valid and not expired
    function isValid(Claims memory claims) internal view returns (bool valid) {
        // Check if claims have expired
        if (claims.accreditationExpiresAt > 0 && claims.accreditationExpiresAt < block.timestamp) {
            return false;
        }
        
        // Check if wallet is sanctioned
        if (claims.sanctioned) {
            return false;
        }
        
        return true;
    }

    /// @notice Check if claims are accredited
    /// @param claims The claims to check
    /// @return accredited True if claims are accredited and not expired
    function isAccredited(Claims memory claims) internal view returns (bool accredited) {
        if (!claims.accredited) {
            return false;
        }
        
        // Check if accreditation has expired
        if (claims.accreditationExpiresAt > 0 && claims.accreditationExpiresAt < block.timestamp) {
            return false;
        }
        
        return true;
    }

    /// @notice Check if claims represent a US person
    /// @param claims The claims to check
    /// @return isUsPerson True if claims represent a US person
    function isUsPerson(Claims memory claims) internal pure returns (bool isUsPerson) {
        return claims.isUsPerson || claims.countryIso2 == bytes2("US");
    }

    /// @notice Get the appropriate tax form for a claims structure
    /// @param claims The claims to analyze
    /// @return taxForm The required tax form
    function getRequiredTaxForm(Claims memory claims) internal pure returns (TaxForm taxForm) {
        if (isUsPerson(claims)) {
            return TaxForm.W9;
        } else if (claims.taxForm != TaxForm.None) {
            return claims.taxForm;
        } else {
            return TaxForm.W8BEN; // Default for non-US persons
        }
    }

    /// @notice Create a validation result
    /// @param valid Whether the validation passed
    /// @param reasonCode Reason code if validation failed
    /// @param message Human-readable message
    /// @return result The validation result
    function createValidationResult(
        bool valid,
        bytes32 reasonCode,
        string memory message
    ) internal pure returns (ValidationResult memory result) {
        return ValidationResult({
            valid: valid,
            reasonCode: reasonCode,
            message: message
        });
    }

    /// @notice Create a successful validation result
    /// @return result The validation result
    function createSuccessResult() internal pure returns (ValidationResult memory result) {
        return createValidationResult(true, bytes32(0), "Validation successful");
    }

    /// @notice Create a failed validation result
    /// @param reasonCode Reason code for the failure
    /// @param message Human-readable failure message
    /// @return result The validation result
    function createFailureResult(
        bytes32 reasonCode,
        string memory message
    ) internal pure returns (ValidationResult memory result) {
        return createValidationResult(false, reasonCode, message);
    }
}



