import { createPublicClient, http, parseAbi, getContract } from 'viem';
import { baseSepolia } from 'viem/chains';

export interface MultisigAction {
  id: string;
  actionType: 'pause' | 'unpause' | 'freeze' | 'unfreeze' | 'forceTransfer' | 'emergencyPause';
  targetAddress?: string;
  amount?: string;
  reason: string;
  proposer: string;
  approvers: string[];
  approvals: number;
  requiredApprovals: number;
  status: 'PENDING' | 'APPROVED' | 'EXECUTED' | 'REJECTED' | 'EXPIRED';
  expiresAt: Date;
  executedAt?: Date;
  executedTxHash?: string;
  createdAt: Date;
  data: any;
}

export interface MultisigProposal {
  actionType: string;
  targetAddress?: string;
  amount?: string;
  reason: string;
  data: any;
}

export class MultisigService {
  private client: any;
  private contracts: any = {};
  private operators: string[] = [];
  private requiredApprovals: number = 2;

  constructor() {
    // Initialize Viem client
    this.client = createPublicClient({
      chain: baseSepolia,
      transport: http(process.env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA || 'https://sepolia.base.org'),
    });

    // Load operators from environment
    this.operators = [
      process.env.NEXT_PUBLIC_OPERATOR_1 || '',
      process.env.NEXT_PUBLIC_OPERATOR_2 || '',
      process.env.NEXT_PUBLIC_OPERATOR_3 || ''
    ].filter(Boolean);

    this.requiredApprovals = Math.min(2, this.operators.length);
  }

  // Create a new multisig proposal
  async createProposal(proposal: MultisigProposal, proposer: string): Promise<MultisigAction> {
    const actionId = this.generateActionId();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const action: MultisigAction = {
      id: actionId,
      actionType: proposal.actionType as any,
      targetAddress: proposal.targetAddress,
      amount: proposal.amount,
      reason: proposal.reason,
      proposer,
      approvers: [proposer], // Proposer auto-approves
      approvals: 1,
      requiredApprovals: this.requiredApprovals,
      status: 'PENDING',
      expiresAt,
      createdAt: new Date(),
      data: proposal.data
    };

    // Store in database (in production, this would be a real database call)
    await this.storeAction(action);

    return action;
  }

  // Approve a multisig action
  async approveAction(actionId: string, approver: string): Promise<MultisigAction> {
    const action = await this.getAction(actionId);
    
    if (!action) {
      throw new Error('Action not found');
    }

    if (action.status !== 'PENDING') {
      throw new Error('Action is not pending');
    }

    if (action.expiresAt < new Date()) {
      action.status = 'EXPIRED';
      await this.updateAction(action);
      throw new Error('Action has expired');
    }

    if (action.approvers.includes(approver)) {
      throw new Error('Already approved by this operator');
    }

    if (!this.operators.includes(approver)) {
      throw new Error('Not authorized to approve');
    }

    // Add approval
    action.approvers.push(approver);
    action.approvals++;

    // Check if we have enough approvals
    if (action.approvals >= action.requiredApprovals) {
      action.status = 'APPROVED';
    }

    await this.updateAction(action);
    return action;
  }

  // Reject a multisig action
  async rejectAction(actionId: string, rejector: string, reason: string): Promise<MultisigAction> {
    const action = await this.getAction(actionId);
    
    if (!action) {
      throw new Error('Action not found');
    }

    if (action.status !== 'PENDING') {
      throw new Error('Action is not pending');
    }

    if (!this.operators.includes(rejector)) {
      throw new Error('Not authorized to reject');
    }

    action.status = 'REJECTED';
    action.data.rejectionReason = reason;
    action.data.rejector = rejector;

    await this.updateAction(action);
    return action;
  }

  // Execute a multisig action
  async executeAction(actionId: string, executor: string): Promise<MultisigAction> {
    const action = await this.getAction(actionId);
    
    if (!action) {
      throw new Error('Action not found');
    }

    if (action.status !== 'APPROVED') {
      throw new Error('Action is not approved');
    }

    if (!this.operators.includes(executor)) {
      throw new Error('Not authorized to execute');
    }

    try {
      // Execute the action on the blockchain
      const txHash = await this.executeOnChain(action, executor);
      
      action.status = 'EXECUTED';
      action.executedAt = new Date();
      action.executedTxHash = txHash;

      await this.updateAction(action);
      return action;

    } catch (error) {
      action.data.executionError = (error as Error).message;
      await this.updateAction(action);
      throw error;
    }
  }

  // Get all actions for an operator
  async getActionsForOperator(operator: string): Promise<MultisigAction[]> {
    // In production, this would query the database
    const actions = await this.getAllActions();
    return actions.filter(action => 
      action.proposer === operator || 
      action.approvers.includes(operator)
    );
  }

  // Get pending actions
  async getPendingActions(): Promise<MultisigAction[]> {
    const actions = await this.getAllActions();
    return actions.filter(action => action.status === 'PENDING');
  }

  // Get action by ID
  async getAction(actionId: string): Promise<MultisigAction | null> {
    // In production, this would query the database
    const actions = await this.getAllActions();
    return actions.find(action => action.id === actionId) || null;
  }

  // Private methods
  private generateActionId(): string {
    return `ms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async storeAction(action: MultisigAction): Promise<void> {
    // In production, this would store in database
    const actions = this.getStoredActions();
    actions.push(action);
    localStorage.setItem('multisig_actions', JSON.stringify(actions));
  }

  private async updateAction(action: MultisigAction): Promise<void> {
    // In production, this would update in database
    const actions = this.getStoredActions();
    const index = actions.findIndex(a => a.id === action.id);
    if (index !== -1) {
      actions[index] = action;
      localStorage.setItem('multisig_actions', JSON.stringify(actions));
    }
  }

  private async getAllActions(): Promise<MultisigAction[]> {
    return this.getStoredActions();
  }

  private getStoredActions(): MultisigAction[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('multisig_actions');
    if (!stored) return [];
    
    try {
      const actions = JSON.parse(stored);
      return actions.map((action: any) => ({
        ...action,
        expiresAt: new Date(action.expiresAt),
        executedAt: action.executedAt ? new Date(action.executedAt) : undefined,
        createdAt: new Date(action.createdAt)
      }));
    } catch {
      return [];
    }
  }

  private async executeOnChain(action: MultisigAction, executor: string): Promise<string> {
    // This would execute the actual blockchain transaction
    // For now, we'll simulate it
    console.log('Executing on-chain action:', action);
    
    // Simulate transaction hash
    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    
    // In production, this would:
    // 1. Connect to the appropriate contract
    // 2. Call the appropriate function
    // 3. Return the actual transaction hash
    
    return txHash;
  }

  // Validation methods
  validateProposal(proposal: MultisigProposal): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!proposal.actionType) {
      errors.push('Action type is required');
    }

    if (!proposal.reason || proposal.reason.length < 10) {
      errors.push('Reason must be at least 10 characters');
    }

    if (proposal.actionType === 'freeze' || proposal.actionType === 'unfreeze' || proposal.actionType === 'forceTransfer') {
      if (!proposal.targetAddress || !this.isValidAddress(proposal.targetAddress)) {
        errors.push('Valid target address is required');
      }
    }

    if (proposal.actionType === 'forceTransfer') {
      if (!proposal.amount || isNaN(Number(proposal.amount)) || Number(proposal.amount) <= 0) {
        errors.push('Valid amount is required for force transfer');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  // Get operator info
  getOperators(): string[] {
    return [...this.operators];
  }

  getRequiredApprovals(): number {
    return this.requiredApprovals;
  }

  // Check if address is an operator
  isOperator(address: string): boolean {
    return this.operators.includes(address);
  }
}

// Export singleton instance
export const multisigService = new MultisigService();
