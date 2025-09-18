// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ReasonCodes
/// @notice Auto-generated reason code constants for COINSCIOUS platform
/// @dev Generated from config/compliance/reason-codes.json
/// @dev Do not edit by hand. Run: pnpm gen:reason-codes
library ReasonCodes {
    /// @notice ERR_OK
    bytes32 internal constant ERR_OK = 0x8670ff8414a4161850e9f04e9837a3a2da1afc3ba98ba644703635d448697caa;

    /// @notice ERR_NOT_WHITELISTED
    bytes32 internal constant ERR_NOT_WHITELISTED = 0xd03711a645ac13b3887baa10c28f347997e96617340d7ffae036e653d4c59185;

    /// @notice ERR_REVOKED
    bytes32 internal constant ERR_REVOKED = 0x9a27f44d2f6ff3a91f0cef92d2aeadbf280f675373204a8719f88503e98a40c8;

    /// @notice ERR_CLAIMS_EXPIRED
    bytes32 internal constant ERR_CLAIMS_EXPIRED = 0x3bf9a69a35f9ffc782e4a2c9cef08fbba4b7f2b0c8dcbc431efe25815d94aaa8;

    /// @notice ERR_LOCKUP_ACTIVE
    bytes32 internal constant ERR_LOCKUP_ACTIVE = 0x07988dcc8431ea2d4b3407f233f523f6b9a834a35261c06ee88327d1340575e3;

    /// @notice ERR_DESTINATION_NOT_ACCREDITED_REG_D
    bytes32 internal constant ERR_DESTINATION_NOT_ACCREDITED_REG_D = 0xbef7adf6ebd4a32bcc2a8a423f78f8bae66d4fbccd708061af6af777917024c9;

    /// @notice ERR_SOURCE_NOT_ACCREDITED_REG_D
    bytes32 internal constant ERR_SOURCE_NOT_ACCREDITED_REG_D = 0x579108b04395f165d03a250e48af18e7176946dedf5f2055483c95b7e1a3f722;

    /// @notice ERR_REG_S_US_PERSON_RESTRICTED
    bytes32 internal constant ERR_REG_S_US_PERSON_RESTRICTED = 0xe01d357f8329e458c7fdfe360ba24fb76730ddb13bac803b5b77430b04ef59e4;

    /// @notice ERR_UNKNOWN_PARTITION
    bytes32 internal constant ERR_UNKNOWN_PARTITION = 0xe3b485aa0881e18a8b9fb6515965a1bd9a98a15d1dc9ed158e950f89baa26bfc;

    /// @notice ERR_PARTITION_CROSS_NOT_ALLOWED
    bytes32 internal constant ERR_PARTITION_CROSS_NOT_ALLOWED = 0x45e4e80bab0d47df0ecc411108da6e6c22d4cdc52c6afab5bbe18619eb94c297;

    /// @notice ERR_PAUSED
    bytes32 internal constant ERR_PAUSED = 0x4e02dd11d88cb397adbe714f037f7663e819b2ef2f779b943c2d21eebdcb6602;

    /// @notice ERR_FROZEN
    bytes32 internal constant ERR_FROZEN = 0x31a2ca2c2152755c56924038ccbb99cf9bd48733649fe856f91db29ce18126ae;

    /// @notice ERR_INSUFFICIENT_BALANCE
    bytes32 internal constant ERR_INSUFFICIENT_BALANCE = 0xe6435104c9113a561334b5facdd8047444eb35ab492103b4c0a1527995bb60f8;

    /// @notice ERR_AMOUNT_MUST_BE_POSITIVE
    bytes32 internal constant ERR_AMOUNT_MUST_BE_POSITIVE = 0x1608ee447f3f8a805c7ff2f9e0370e47e6d9753477faa55b023379effbc69e32;

    /// @notice ERR_REASON_CODE_REQUIRED
    bytes32 internal constant ERR_REASON_CODE_REQUIRED = 0xe374b61009be74be959bbda06ea4523b811e4f217a89c8d8ff4d09064230a351;

    /// @notice ERR_UNDERFUNDED_FULL_MODE
    bytes32 internal constant ERR_UNDERFUNDED_FULL_MODE = 0xb870e1488a3141494d7e23d1dc4601277ddf9f7e68c3a408f57bf7b5ac0680b8;

    /// @notice ERR_INVALID_SNAPSHOT
    bytes32 internal constant ERR_INVALID_SNAPSHOT = 0x31c63c96754e875d527895598b72bc35602e8bb100e7c41038b2c6cff03776c4;

    /// @notice ERR_ALREADY_DISTRIBUTED
    bytes32 internal constant ERR_ALREADY_DISTRIBUTED = 0x20972cbbf88328b20ae050dc0030739250d650d69090267a788f9ba0795012a3;

    /// @notice ERR_INVALID_DAY
    bytes32 internal constant ERR_INVALID_DAY = 0x16fe4cc1ea85e911c099f2ebbd65aa257d07029c23f083ec37e5b660de96d6be;

    /// @notice ERR_ZERO_ROOT
    bytes32 internal constant ERR_ZERO_ROOT = 0x25e38926797f3a6f819584449d2979bf681147b1c86438263da13ba583d7c7b4;

    /// @notice ERR_INVALID_RECIPIENT
    bytes32 internal constant ERR_INVALID_RECIPIENT = 0x86a0e4f10a94ffa4d3b25bcec0b0781375f4b9d95b7e5e02ac4e1243fc3d5ed7;

    /// @notice ERR_INVALID_ADDRESSES
    bytes32 internal constant ERR_INVALID_ADDRESSES = 0xfc320f67266193494ee77cdb62262748ffbb9b29f21879ebe494e4d593f8fdb9;

    /// @notice ERR_INVALID_ADDRESS
    bytes32 internal constant ERR_INVALID_ADDRESS = 0xa7d3f5b8fcfdb9260fb71cc6af515e9b07a68a1202d1cb2f5a3f8f30449ddc07;

    /// @notice ERR_SIMULATION_FAILED
    bytes32 internal constant ERR_SIMULATION_FAILED = 0x9437ec6ed787decf34b8786755ec0842a4dfefd7aadcf71179cdd9037c6ecc61;

    /// @notice ERR_UNKNOWN_ACTION
    bytes32 internal constant ERR_UNKNOWN_ACTION = 0x587279b32fd713f104631b5b171265ad894d4631eebcca683409db1965acf12d;

    /// @notice Get human-readable explanation for a reason code
    /// @param reasonCode The reason code to explain
    /// @return explanation Human-readable explanation of the reason code
    function getExplanation(bytes32 reasonCode) internal pure returns (string memory explanation) {
        // This would typically be implemented with a mapping or switch statement
        // For now, return a generic message
        if (reasonCode == ERR_OK) {
            return "Operation completed successfully";
        } else if (reasonCode == ERR_NOT_WHITELISTED) {
            return "This wallet is not registered in the compliance system";
        } else if (reasonCode == ERR_REVOKED) {
            return "This wallet has been permanently revoked from the system";
        } else if (reasonCode == ERR_CLAIMS_EXPIRED) {
            return "The compliance claims for this wallet have expired";
        } else if (reasonCode == ERR_LOCKUP_ACTIVE) {
            return "This wallet is in a lockup period and cannot transfer tokens";
        } else if (reasonCode == ERR_DESTINATION_NOT_ACCREDITED_REG_D) {
            return "The destination wallet is not accredited for REG_D transfers";
        } else if (reasonCode == ERR_SOURCE_NOT_ACCREDITED_REG_D) {
            return "The source wallet is not accredited for REG_D transfers";
        } else if (reasonCode == ERR_REG_S_US_PERSON_RESTRICTED) {
            return "REG_S tokens cannot be transferred to US persons";
        } else if (reasonCode == ERR_UNKNOWN_PARTITION) {
            return "The specified partition is not recognized";
        } else if (reasonCode == ERR_PARTITION_CROSS_NOT_ALLOWED) {
            return "Cross-partition transfers are not permitted";
        } else if (reasonCode == ERR_PAUSED) {
            return "The system is currently paused and operations are restricted";
        } else if (reasonCode == ERR_FROZEN) {
            return "This wallet is temporarily blocked by compliance";
        } else if (reasonCode == ERR_INSUFFICIENT_BALANCE) {
            return "The wallet does not have enough tokens for this operation";
        } else if (reasonCode == ERR_AMOUNT_MUST_BE_POSITIVE) {
            return "The transfer amount must be greater than zero";
        } else if (reasonCode == ERR_REASON_CODE_REQUIRED) {
            return "A reason code is required for this operation";
        } else if (reasonCode == ERR_UNDERFUNDED_FULL_MODE) {
            return "Insufficient USDC funding for full distribution mode";
        } else if (reasonCode == ERR_INVALID_SNAPSHOT) {
            return "The specified snapshot ID is invalid or not found";
        } else if (reasonCode == ERR_ALREADY_DISTRIBUTED) {
            return "This snapshot has already been distributed";
        } else if (reasonCode == ERR_INVALID_DAY) {
            return "The specified day is outside the valid range";
        } else if (reasonCode == ERR_ZERO_ROOT) {
            return "The Merkle root cannot be zero";
        } else if (reasonCode == ERR_INVALID_RECIPIENT) {
            return "The recipient address is invalid or not provided";
        } else if (reasonCode == ERR_INVALID_ADDRESSES) {
            return "One or more addresses are invalid or not provided";
        } else if (reasonCode == ERR_INVALID_ADDRESS) {
            return "The provided address is invalid";
        } else if (reasonCode == ERR_SIMULATION_FAILED) {
            return "Preflight simulation failed due to an error";
        } else if (reasonCode == ERR_UNKNOWN_ACTION) {
            return "The specified action type is not recognized";
        } else {
            return "Unknown reason code";
        }
    }
}
