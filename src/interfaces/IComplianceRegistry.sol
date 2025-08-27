// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IComplianceRegistry
 * @dev Interface for compliance registry operations
 * @notice Defines the public API for compliance checking and claims management
 */
interface IComplianceRegistry {
    /**
     * @dev Claims structure for wallet compliance data
     * @param countryCode ISO 3166-1 alpha-2 country code (e.g., "US", "CA")
     * @param accredited Whether the wallet is accredited
     * @param lockupUntil Timestamp when lockup period expires
     * @param revoked Whether the wallet has been revoked
     * @param expiresAt Timestamp when claims expire and need reverification
     */
    struct Claims {
        bytes2 countryCode;
        bool accredited;
        uint64 lockupUntil;
        bool revoked;
        uint64 expiresAt;
    }





    /**
     * @dev Sets compliance claims for a wallet
     * @param wallet The wallet address
     * @param claims The compliance claims data
     */
    function setClaims(address wallet, Claims calldata claims) external;

    /**
     * @dev Revokes a wallet's compliance status
     * @param wallet The wallet address
     */
    function revoke(address wallet) external;

    /**
     * @dev Checks if a wallet is whitelisted
     * @param wallet The wallet address
     * @return Whether the wallet is whitelisted
     */
    function isWalletWhitelisted(address wallet) external view returns (bool);

    /**
     * @dev Checks if a transfer is allowed between wallets
     * @param from The source wallet address
     * @param to The destination wallet address
     * @param partition The token partition (REG_D or REG_S)
     * @param amount The transfer amount
     * @return ok Whether the transfer is allowed
     * @return reason The reason for the decision
     */
    function isTransferAllowed(
        address from,
        address to,
        bytes32 partition,
        uint256 amount
    ) external view returns (bool ok, string memory reason);
}
