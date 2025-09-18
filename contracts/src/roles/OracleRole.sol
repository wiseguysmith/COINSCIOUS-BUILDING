// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title OracleRole
 * @dev Simple AccessControl role for compliance oracle operations
 * @notice This contract manages who can set compliance claims and revoke wallets
 */
contract OracleRole is AccessControl {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
    }

    /**
     * @dev Modifier to restrict access to oracle operations
     */
    modifier onlyOracle() {
        require(hasRole(ORACLE_ROLE, msg.sender), "OracleRole: caller is not oracle");
        _;
    }
}
