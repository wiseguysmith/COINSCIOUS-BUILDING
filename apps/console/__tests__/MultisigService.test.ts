import { MultisigService, MultisigProposal } from '../lib/multisig';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('MultisigService', () => {
  let multisigService: MultisigService;

  beforeEach(() => {
    multisigService = new MultisigService();
    localStorageMock.clear();
  });

  describe('createProposal', () => {
    it('should create a valid proposal', async () => {
      const proposal: MultisigProposal = {
        actionType: 'pause',
        reason: 'Emergency pause for maintenance',
        data: { timestamp: Date.now() }
      };

      const result = await multisigService.createProposal(proposal, '0x1234567890123456789012345678901234567890');

      expect(result).toBeDefined();
      expect(result.actionType).toBe('pause');
      expect(result.proposer).toBe('0x1234567890123456789012345678901234567890');
      expect(result.status).toBe('PENDING');
      expect(result.approvals).toBe(1);
      expect(result.requiredApprovals).toBe(2);
    });

    it('should validate proposal data', () => {
      const invalidProposal: MultisigProposal = {
        actionType: '',
        reason: 'Short',
        data: {}
      };

      const validation = multisigService.validateProposal(invalidProposal);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Action type is required');
      expect(validation.errors).toContain('Reason must be at least 10 characters');
    });

    it('should validate target address for freeze actions', () => {
      const proposal: MultisigProposal = {
        actionType: 'freeze',
        reason: 'Freeze suspicious wallet',
        data: {}
      };

      const validation = multisigService.validateProposal(proposal);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Valid target address is required');
    });
  });

  describe('approveAction', () => {
    it('should approve an action', async () => {
      const proposal: MultisigProposal = {
        actionType: 'pause',
        reason: 'Emergency pause for maintenance',
        data: { timestamp: Date.now() }
      };

      const action = await multisigService.createProposal(proposal, '0x1234567890123456789012345678901234567890');
      const approver = '0x2345678901234567890123456789012345678901';

      const result = await multisigService.approveAction(action.id, approver);

      expect(result.approvers).toContain(approver);
      expect(result.approvals).toBe(2);
      expect(result.status).toBe('APPROVED');
    });

    it('should not allow duplicate approvals', async () => {
      const proposal: MultisigProposal = {
        actionType: 'pause',
        reason: 'Emergency pause for maintenance',
        data: { timestamp: Date.now() }
      };

      const action = await multisigService.createProposal(proposal, '0x1234567890123456789012345678901234567890');
      const approver = '0x1234567890123456789012345678901234567890'; // Same as proposer

      await expect(multisigService.approveAction(action.id, approver))
        .rejects.toThrow('Already approved by this operator');
    });

    it('should not allow unauthorized approvals', async () => {
      const proposal: MultisigProposal = {
        actionType: 'pause',
        reason: 'Emergency pause for maintenance',
        data: { timestamp: Date.now() }
      };

      const action = await multisigService.createProposal(proposal, '0x1234567890123456789012345678901234567890');
      const unauthorizedApprover = '0x9999999999999999999999999999999999999999';

      await expect(multisigService.approveAction(action.id, unauthorizedApprover))
        .rejects.toThrow('Not authorized to approve');
    });
  });

  describe('rejectAction', () => {
    it('should reject an action', async () => {
      const proposal: MultisigProposal = {
        actionType: 'pause',
        reason: 'Emergency pause for maintenance',
        data: { timestamp: Date.now() }
      };

      const action = await multisigService.createProposal(proposal, '0x1234567890123456789012345678901234567890');
      const rejector = '0x2345678901234567890123456789012345678901';

      const result = await multisigService.rejectAction(action.id, rejector, 'Invalid reason');

      expect(result.status).toBe('REJECTED');
      expect(result.data.rejectionReason).toBe('Invalid reason');
      expect(result.data.rejector).toBe(rejector);
    });
  });

  describe('executeAction', () => {
    it('should execute an approved action', async () => {
      const proposal: MultisigProposal = {
        actionType: 'pause',
        reason: 'Emergency pause for maintenance',
        data: { timestamp: Date.now() }
      };

      const action = await multisigService.createProposal(proposal, '0x1234567890123456789012345678901234567890');
      const approver = '0x2345678901234567890123456789012345678901';

      // Approve the action
      await multisigService.approveAction(action.id, approver);

      // Execute the action
      const result = await multisigService.executeAction(action.id, approver);

      expect(result.status).toBe('EXECUTED');
      expect(result.executedAt).toBeDefined();
      expect(result.executedTxHash).toBeDefined();
    });

    it('should not execute unapproved action', async () => {
      const proposal: MultisigProposal = {
        actionType: 'pause',
        reason: 'Emergency pause for maintenance',
        data: { timestamp: Date.now() }
      };

      const action = await multisigService.createProposal(proposal, '0x1234567890123456789012345678901234567890');

      await expect(multisigService.executeAction(action.id, '0x2345678901234567890123456789012345678901'))
        .rejects.toThrow('Action is not approved');
    });
  });

  describe('getActionsForOperator', () => {
    it('should return actions for operator', async () => {
      const proposal: MultisigProposal = {
        actionType: 'pause',
        reason: 'Emergency pause for maintenance',
        data: { timestamp: Date.now() }
      };

      const operator = '0x1234567890123456789012345678901234567890';
      await multisigService.createProposal(proposal, operator);

      const actions = await multisigService.getActionsForOperator(operator);
      expect(actions).toHaveLength(1);
      expect(actions[0].proposer).toBe(operator);
    });
  });

  describe('isOperator', () => {
    it('should check if address is operator', () => {
      expect(multisigService.isOperator('0x1234567890123456789012345678901234567890')).toBe(true);
      expect(multisigService.isOperator('0x9999999999999999999999999999999999999999')).toBe(false);
    });
  });
});
