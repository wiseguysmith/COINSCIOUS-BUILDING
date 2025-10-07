import { keccak256, stringToBytes } from 'viem';
import preflightTexts from '../../config/ui/preflight-texts.json';

export interface PreflightResult {
  success: boolean;
  reasonCode?: string;
  humanReadable?: string;
  gasEstimate?: string;
  warnings?: string[];
  details?: any;
}

export interface PreflightOptions {
  action: 'mint' | 'transfer' | 'burn' | 'payout' | 'freeze' | 'unfreeze' | 'pause' | 'unpause';
  from?: string;
  to?: string;
  amount?: string;
  partition?: string;
  reasonCode?: string;
  snapshotId?: string;
  data?: any;
}

export class PreflightSimulator {
  /**
   * Simulate an action and return human-readable results
   */
  async simulate(options: PreflightOptions): Promise<PreflightResult> {
    try {
      // This would normally make a static call to the contract
      // For now, we'll simulate based on common scenarios
      const result = await this.performStaticCall(options);
      
      return {
        success: result.success,
        reasonCode: result.reasonCode,
        humanReadable: result.humanReadable,
        gasEstimate: result.gasEstimate,
        warnings: result.warnings,
        details: result.details
      };
    } catch (error) {
      return {
        success: false,
        reasonCode: 'ERR_SIMULATION_FAILED',
        humanReadable: `Preflight simulation failed: ${(error as Error).message}`,
        gasEstimate: 'Unknown',
        warnings: ['Simulation error occurred']
      };
    }
  }

  private async performStaticCall(options: PreflightOptions): Promise<PreflightResult> {
    // Simulate different scenarios based on action type
    switch (options.action) {
      case 'mint':
        return this.simulateMint(options);
      case 'transfer':
        return this.simulateTransfer(options);
      case 'burn':
        return this.simulateBurn(options);
      case 'payout':
        return this.simulatePayout(options);
      case 'freeze':
      case 'unfreeze':
        return this.simulateFreeze(options);
      case 'pause':
      case 'unpause':
        return this.simulatePause(options);
      default:
        return {
          success: false,
          reasonCode: 'ERR_UNKNOWN_ACTION',
          humanReadable: 'Unknown action type',
          gasEstimate: '0'
        };
    }
  }

  private async simulateMint(options: PreflightOptions): Promise<PreflightResult> {
    const warnings: string[] = [];
    
    if (!options.to) {
      return this.createErrorResult('ERR_INVALID_RECIPIENT', 'The recipient address is invalid or not provided.');
    }

    if (!options.amount || options.amount === '0') {
      return this.createErrorResult('ERR_AMOUNT_MUST_BE_POSITIVE', 'Mint amount must be greater than zero.');
    }

    // Simulate compliance check
    const complianceResult = await this.checkCompliance(options.to);
    if (!complianceResult.success) {
      return this.createErrorResult(complianceResult.reasonCode!, complianceResult.humanReadable!);
    }

    return this.createSuccessResult(
      `Successfully mint ${options.amount} tokens to ${options.to}`,
      '~150,000 gas',
      warnings
    );
  }

  private async simulateTransfer(options: PreflightOptions): Promise<PreflightResult> {
    const warnings: string[] = [];
    
    if (!options.from || !options.to) {
      return this.createErrorResult('ERR_INVALID_ADDRESSES', 'Both sender and recipient addresses are required.');
    }

    if (!options.amount || options.amount === '0') {
      return this.createErrorResult('ERR_AMOUNT_MUST_BE_POSITIVE', 'Transfer amount must be greater than zero.');
    }

    // Simulate balance check
    const balanceCheck = await this.checkBalance(options.from, options.amount);
    if (!balanceCheck.success) {
      return this.createErrorResult(balanceCheck.reasonCode!, balanceCheck.humanReadable!);
    }

    // Simulate compliance check
    const complianceResult = await this.checkCompliance(options.to);
    if (!complianceResult.success) {
      return this.createErrorResult(complianceResult.reasonCode!, complianceResult.humanReadable!);
    }

    return this.createSuccessResult(
      `Successfully transfer ${options.amount} tokens from ${options.from} to ${options.to}`,
      '~200,000 gas',
      warnings
    );
  }

  private async simulateBurn(options: PreflightOptions): Promise<PreflightResult> {
    if (!options.amount || options.amount === '0') {
      return this.createErrorResult('ERR_AMOUNT_MUST_BE_POSITIVE', 'Burn amount must be greater than zero.');
    }

    return this.createSuccessResult(
      `Successfully burn ${options.amount} tokens`,
      '~100,000 gas'
    );
  }

  private async simulatePayout(options: PreflightOptions): Promise<PreflightResult> {
    if (!options.snapshotId) {
      return this.createErrorResult('ERR_INVALID_SNAPSHOT', 'Snapshot ID is required for payout.');
    }

    // Simulate funding check
    const fundingCheck = await this.checkFunding(options.snapshotId);
    if (!fundingCheck.success) {
      return this.createErrorResult(fundingCheck.reasonCode!, fundingCheck.humanReadable!);
    }

    return this.createSuccessResult(
      `Payout will distribute to 24 holders. Network fee est: 0.014 ETH`,
      '~500,000 gas',
      [],
      {
        holders: 24,
        totalAmount: '1000 USDC',
        networkFee: '0.014 ETH'
      }
    );
  }

  private async simulateFreeze(options: PreflightOptions): Promise<PreflightResult> {
    if (!options.to) {
      return this.createErrorResult('ERR_INVALID_ADDRESS', 'Wallet address is required for freeze/unfreeze.');
    }

    const action = options.action === 'freeze' ? 'freeze' : 'unfreeze';
    return this.createSuccessResult(
      `Successfully ${action} wallet ${options.to}`,
      '~50,000 gas'
    );
  }

  private async simulatePause(options: PreflightOptions): Promise<PreflightResult> {
    const action = options.action === 'pause' ? 'pause' : 'unpause';
    return this.createSuccessResult(
      `Successfully ${action} the system`,
      '~30,000 gas',
      ['This action affects all system operations']
    );
  }

  private async checkCompliance(address: string): Promise<{success: boolean, reasonCode?: string, humanReadable?: string}> {
    // Simulate compliance check
    if (address === '0x0000000000000000000000000000000000000000') {
      return {
        success: false,
        reasonCode: 'ERR_NOT_WHITELISTED',
        humanReadable: 'This wallet is not registered in the compliance system'
      };
    }

    if (address.startsWith('0x1111')) {
      return {
        success: false,
        reasonCode: 'ERR_FROZEN',
        humanReadable: 'This wallet is temporarily blocked by compliance'
      };
    }

    return { success: true };
  }

  private async checkBalance(address: string, amount: string): Promise<{success: boolean, reasonCode?: string, humanReadable?: string}> {
    // Simulate balance check
    if (address.startsWith('0x2222')) {
      return {
        success: false,
        reasonCode: 'ERR_INSUFFICIENT_BALANCE',
        humanReadable: 'The wallet does not have enough tokens for this operation'
      };
    }

    return { success: true };
  }

  private async checkFunding(snapshotId: string): Promise<{success: boolean, reasonCode?: string, humanReadable?: string}> {
    // Simulate funding check
    if (snapshotId === '999') {
      return {
        success: false,
        reasonCode: 'ERR_UNDERFUNDED_FULL_MODE',
        humanReadable: 'Insufficient USDC funding for full distribution mode'
      };
    }

    return { success: true };
  }

  private createSuccessResult(message: string, gasEstimate: string, warnings: string[] = [], details?: any): PreflightResult {
    return {
      success: true,
      reasonCode: 'ERR_OK',
      humanReadable: message,
      gasEstimate,
      warnings,
      details
    };
  }

  private createErrorResult(reasonCode: string, message: string): PreflightResult {
    return {
      success: false,
      reasonCode,
      humanReadable: message,
      gasEstimate: '0'
    };
  }

  /**
   * Get human-readable explanation for a reason code
   */
  getReasonExplanation(reasonCode: string): string {
    const error = preflightTexts.errors[reasonCode as keyof typeof preflightTexts.errors];
    return error ? error.message : `Unknown reason code: ${reasonCode}`;
  }

  /**
   * Get reason code from string using keccak256
   */
  getReasonCodeFromString(codeString: string): string {
    return keccak256(stringToBytes(codeString));
  }

  /**
   * Get all available reason codes
   */
  getAllReasonCodes(): Array<{code: string, title: string, explain: string}> {
    return Object.values(preflightTexts.errors);
  }
}

// Export singleton instance
export const preflightSimulator = new PreflightSimulator();



