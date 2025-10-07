import { reasonCodes } from './reasonCodes.json';

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
}

export class PreflightSimulator {
  private reasonCodesMap: Map<string, any>;

  constructor() {
    this.reasonCodesMap = new Map();
    Object.entries(reasonCodes).forEach(([key, value]) => {
      this.reasonCodesMap.set(key, value);
    });
  }

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
        humanReadable: 'Preflight simulation failed: ' + (error as Error).message,
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
    // Simulate minting logic
    const warnings: string[] = [];
    
    if (!options.to) {
      return {
        success: false,
        reasonCode: 'ERR_INVALID_RECIPIENT',
        humanReadable: 'Recipient address is required for minting',
        gasEstimate: '0'
      };
    }

    if (!options.amount || options.amount === '0') {
      return {
        success: false,
        reasonCode: 'ERR_AMOUNT_MUST_BE_POSITIVE',
        humanReadable: 'Mint amount must be greater than zero',
        gasEstimate: '0'
      };
    }

    // Simulate compliance check
    const complianceResult = await this.checkCompliance(options.to);
    if (!complianceResult.success) {
      return {
        success: false,
        reasonCode: complianceResult.reasonCode,
        humanReadable: complianceResult.humanReadable,
        gasEstimate: '0'
      };
    }

    return {
      success: true,
      reasonCode: 'ERR_OK',
      humanReadable: `Successfully mint ${options.amount} tokens to ${options.to}`,
      gasEstimate: '~150,000 gas',
      warnings
    };
  }

  private async simulateTransfer(options: PreflightOptions): Promise<PreflightResult> {
    const warnings: string[] = [];
    
    if (!options.from || !options.to) {
      return {
        success: false,
        reasonCode: 'ERR_INVALID_ADDRESSES',
        humanReadable: 'Both sender and recipient addresses are required',
        gasEstimate: '0'
      };
    }

    if (!options.amount || options.amount === '0') {
      return {
        success: false,
        reasonCode: 'ERR_AMOUNT_MUST_BE_POSITIVE',
        humanReadable: 'Transfer amount must be greater than zero',
        gasEstimate: '0'
      };
    }

    // Simulate balance check
    const balanceCheck = await this.checkBalance(options.from, options.amount);
    if (!balanceCheck.success) {
      return {
        success: false,
        reasonCode: balanceCheck.reasonCode,
        humanReadable: balanceCheck.humanReadable,
        gasEstimate: '0'
      };
    }

    // Simulate compliance check
    const complianceResult = await this.checkCompliance(options.to);
    if (!complianceResult.success) {
      return {
        success: false,
        reasonCode: complianceResult.reasonCode,
        humanReadable: complianceResult.humanReadable,
        gasEstimate: '0'
      };
    }

    return {
      success: true,
      reasonCode: 'ERR_OK',
      humanReadable: `Successfully transfer ${options.amount} tokens from ${options.from} to ${options.to}`,
      gasEstimate: '~200,000 gas',
      warnings
    };
  }

  private async simulateBurn(options: PreflightOptions): Promise<PreflightResult> {
    if (!options.amount || options.amount === '0') {
      return {
        success: false,
        reasonCode: 'ERR_AMOUNT_MUST_BE_POSITIVE',
        humanReadable: 'Burn amount must be greater than zero',
        gasEstimate: '0'
      };
    }

    return {
      success: true,
      reasonCode: 'ERR_OK',
      humanReadable: `Successfully burn ${options.amount} tokens`,
      gasEstimate: '~100,000 gas'
    };
  }

  private async simulatePayout(options: PreflightOptions): Promise<PreflightResult> {
    if (!options.snapshotId) {
      return {
        success: false,
        reasonCode: 'ERR_INVALID_SNAPSHOT',
        humanReadable: 'Snapshot ID is required for payout',
        gasEstimate: '0'
      };
    }

    // Simulate funding check
    const fundingCheck = await this.checkFunding(options.snapshotId);
    if (!fundingCheck.success) {
      return {
        success: false,
        reasonCode: fundingCheck.reasonCode,
        humanReadable: fundingCheck.humanReadable,
        gasEstimate: '0'
      };
    }

    return {
      success: true,
      reasonCode: 'ERR_OK',
      humanReadable: `Payout will distribute to 24 holders. Network fee est: 0.014 ETH`,
      gasEstimate: '~500,000 gas',
      details: {
        holders: 24,
        totalAmount: '1000 USDC',
        networkFee: '0.014 ETH'
      }
    };
  }

  private async simulateFreeze(options: PreflightOptions): Promise<PreflightResult> {
    if (!options.to) {
      return {
        success: false,
        reasonCode: 'ERR_INVALID_ADDRESS',
        humanReadable: 'Wallet address is required for freeze/unfreeze',
        gasEstimate: '0'
      };
    }

    const action = options.action === 'freeze' ? 'freeze' : 'unfreeze';
    return {
      success: true,
      reasonCode: 'ERR_OK',
      humanReadable: `Successfully ${action} wallet ${options.to}`,
      gasEstimate: '~50,000 gas'
    };
  }

  private async simulatePause(options: PreflightOptions): Promise<PreflightResult> {
    const action = options.action === 'pause' ? 'pause' : 'unpause';
    return {
      success: true,
      reasonCode: 'ERR_OK',
      humanReadable: `Successfully ${action} the system`,
      gasEstimate: '~30,000 gas',
      warnings: ['This action affects all system operations']
    };
  }

  private async checkCompliance(address: string): Promise<{success: boolean, reasonCode?: string, humanReadable?: string}> {
    // Simulate compliance check
    // In real implementation, this would call the compliance registry
    
    // Simulate some common failure scenarios
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
    // In real implementation, this would check the token balance
    
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
    // In real implementation, this would check if the distributor is funded
    
    if (snapshotId === '999') {
      return {
        success: false,
        reasonCode: 'ERR_UNDERFUNDED_FULL_MODE',
        humanReadable: 'Insufficient USDC funding for full distribution mode'
      };
    }

    return { success: true };
  }

  /**
   * Get human-readable explanation for a reason code
   */
  getReasonExplanation(reasonCode: string): string {
    const entry = this.reasonCodesMap.get(reasonCode);
    return entry ? entry.explain : `Unknown reason code: ${reasonCode}`;
  }

  /**
   * Get all available reason codes
   */
  getAllReasonCodes(): Array<{code: string, title: string, explain: string}> {
    return Array.from(this.reasonCodesMap.values());
  }
}

// Export singleton instance
export const preflightSimulator = new PreflightSimulator();



