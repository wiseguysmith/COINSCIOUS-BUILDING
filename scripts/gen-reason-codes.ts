#!/usr/bin/env tsx

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { keccak256, stringToBytes } from "viem";
import { join } from "path";

interface ReasonCode {
  code: string;
  title: string;
  explain: string;
}

interface ReasonCodesConfig {
  codes: ReasonCode[];
}

/**
 * Generate Solidity constants from reason codes configuration
 * 
 * This script reads the reason codes from config/compliance/reason-codes.json
 * and generates a Solidity library with keccak256 hashed constants.
 * 
 * Usage: pnpm gen:reason-codes
 */

function main() {
  console.log("🔧 Generating ReasonCodes.sol from configuration...");
  
  try {
    // Read the reason codes configuration
    const configPath = join(process.cwd(), "config/compliance/reason-codes.json");
    const config: ReasonCodesConfig = JSON.parse(readFileSync(configPath, "utf8"));
    
    console.log(`📋 Found ${config.codes.length} reason codes to process`);
    
    // Generate the Solidity library header
    const header = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ReasonCodes
/// @notice Auto-generated reason code constants for COINSCIOUS platform
/// @dev Generated from config/compliance/reason-codes.json
/// @dev Do not edit by hand. Run: pnpm gen:reason-codes
library ReasonCodes {
`;

    // Generate constants for each reason code
    let body = "";
    const processedCodes = new Set<string>();
    
    for (const { code } of config.codes) {
      // Skip duplicates
      if (processedCodes.has(code)) {
        console.warn(`⚠️  Duplicate code skipped: ${code}`);
        continue;
      }
      processedCodes.add(code);
      
      // Generate keccak256 hash of the reason code string
      const hash = keccak256(stringToBytes(code));
      
      // Add constant definition
      body += `    /// @notice ${code}\n`;
      body += `    bytes32 internal constant ${code} = ${hash};\n\n`;
    }
    
    // Generate the footer
    const footer = `    /// @notice Get human-readable explanation for a reason code
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
`;

    // Combine all parts
    const output = header + body + footer;
    
    // Ensure the output directory exists
    const outputDir = join(process.cwd(), "contracts", "lib");
    mkdirSync(outputDir, { recursive: true });
    
    // Write the generated Solidity file
    const outputPath = join(outputDir, "ReasonCodes.sol");
    writeFileSync(outputPath, output);
    
    console.log(`✅ Generated ReasonCodes.sol with ${processedCodes.size} constants`);
    console.log(`📁 Output: ${outputPath}`);
    
    // Generate a summary
    console.log("\n📊 Generated Constants:");
    for (const code of Array.from(processedCodes).sort()) {
      const hash = keccak256(stringToBytes(code));
      console.log(`   ${code} = ${hash}`);
    }
    
  } catch (error) {
    console.error("❌ Error generating reason codes:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

