'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  User,
  Calendar,
  Hash,
  ExternalLink
} from 'lucide-react';
import { multisigService, MultisigAction, MultisigProposal } from '@/lib/multisig';

interface MultisigConfirmationProps {
  proposal: MultisigProposal;
  proposer: string;
  onActionCreated: (action: MultisigAction) => void;
  onActionExecuted: (action: MultisigAction) => void;
  onCancel: () => void;
}

export function MultisigConfirmation({ 
  proposal, 
  proposer, 
  onActionCreated, 
  onActionExecuted, 
  onCancel 
}: MultisigConfirmationProps) {
  const [action, setAction] = useState<MultisigAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentOperator, setCurrentOperator] = useState<string>('');

  useEffect(() => {
    // Get current operator (in production, this would come from wallet connection)
    setCurrentOperator(proposer);
  }, [proposer]);

  const handleCreateProposal = async () => {
    setLoading(true);
    setError(null);

    try {
      // Validate proposal
      const validation = multisigService.validateProposal(proposal);
      if (!validation.valid) {
        setError(validation.errors.join(', '));
        return;
      }

      // Create the multisig action
      const newAction = await multisigService.createProposal(proposal, proposer);
      setAction(newAction);
      onActionCreated(newAction);

    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!action) return;

    setLoading(true);
    setError(null);

    try {
      const updatedAction = await multisigService.approveAction(action.id, currentOperator);
      setAction(updatedAction);

      if (updatedAction.status === 'APPROVED') {
        // Auto-execute if approved
        const executedAction = await multisigService.executeAction(action.id, currentOperator);
        setAction(executedAction);
        onActionExecuted(executedAction);
      }

    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!action) return;

    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    setLoading(true);
    setError(null);

    try {
      const updatedAction = await multisigService.rejectAction(action.id, currentOperator, reason);
      setAction(updatedAction);

    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'EXECUTED': return 'bg-blue-100 text-blue-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'EXPIRED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-4 w-4" />;
      case 'APPROVED': return <CheckCircle className="h-4 w-4" />;
      case 'EXECUTED': return <CheckCircle className="h-4 w-4" />;
      case 'REJECTED': return <XCircle className="h-4 w-4" />;
      case 'EXPIRED': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const canApprove = action && 
    action.status === 'PENDING' && 
    !action.approvers.includes(currentOperator) &&
    multisigService.isOperator(currentOperator);

  const canReject = action && 
    action.status === 'PENDING' && 
    multisigService.isOperator(currentOperator);

  const canExecute = action && 
    action.status === 'APPROVED' && 
    multisigService.isOperator(currentOperator);

  if (!action) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-yellow-800">
            <Shield className="h-5 w-5" />
            <span>Create Multisig Proposal</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-yellow-100 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Proposal Details:</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li><strong>Action:</strong> {proposal.actionType}</li>
                {proposal.targetAddress && <li><strong>Target:</strong> {proposal.targetAddress}</li>}
                {proposal.amount && <li><strong>Amount:</strong> {proposal.amount}</li>}
                <li><strong>Reason:</strong> {proposal.reason}</li>
              </ul>
            </div>

            <div className="bg-blue-100 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Multisig Process:</h4>
              <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
                <li>Create proposal (auto-approved by proposer)</li>
                <li>Wait for second operator approval</li>
                <li>Action executes automatically when approved</li>
                <li>Expires in 24 hours if not approved</li>
              </ol>
            </div>

            {error && (
              <div className="bg-red-100 p-4 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="flex space-x-2">
              <Button 
                onClick={handleCreateProposal} 
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Creating...' : 'Create Proposal'}
              </Button>
              <Button onClick={onCancel} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${getStatusColor(action.status).replace('text-', 'border-').replace('bg-', 'bg-')}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Multisig Action #{action.id.split('_')[1]}</span>
          </div>
          <Badge className={getStatusColor(action.status)}>
            {getStatusIcon(action.status)}
            <span className="ml-1">{action.status}</span>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Action Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Action Details:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div><strong>Type:</strong> {action.actionType}</div>
              {action.targetAddress && <div><strong>Target:</strong> {action.targetAddress}</div>}
              {action.amount && <div><strong>Amount:</strong> {action.amount}</div>}
              <div><strong>Reason:</strong> {action.reason}</div>
              <div><strong>Proposer:</strong> {action.proposer}</div>
              <div><strong>Created:</strong> {action.createdAt.toLocaleString()}</div>
              {action.expiresAt && <div><strong>Expires:</strong> {action.expiresAt.toLocaleString()}</div>}
              {action.executedAt && <div><strong>Executed:</strong> {action.executedAt.toLocaleString()}</div>}
              {action.executedTxHash && (
                <div className="md:col-span-2">
                  <strong>Transaction:</strong>{' '}
                  <a 
                    href={`https://sepolia.basescan.org/tx/${action.executedTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center"
                  >
                    {action.executedTxHash.slice(0, 10)}...
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Approvals */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Approvals:</h4>
            <div className="flex items-center space-x-2 mb-2">
              <div className="flex space-x-1">
                {Array.from({ length: action.requiredApprovals }, (_, i) => (
                  <div
                    key={i}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      i < action.approvals
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {i < action.approvals ? '✓' : i + 1}
                  </div>
                ))}
              </div>
              <span className="text-sm text-blue-800">
                {action.approvals} / {action.requiredApprovals} approvals
              </span>
            </div>
            <div className="text-sm text-blue-800">
              <strong>Approvers:</strong> {action.approvers.join(', ')}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-100 p-4 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            {canApprove && (
              <Button 
                onClick={handleApprove} 
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Approving...' : 'Approve & Execute'}
              </Button>
            )}
            
            {canReject && (
              <Button 
                onClick={handleReject} 
                disabled={loading}
                variant="destructive"
              >
                {loading ? 'Rejecting...' : 'Reject'}
              </Button>
            )}

            {action.status === 'EXECUTED' && (
              <Button onClick={onCancel} className="flex-1">
                Close
              </Button>
            )}

            {(action.status === 'REJECTED' || action.status === 'EXPIRED') && (
              <Button onClick={onCancel} variant="outline" className="flex-1">
                Close
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
