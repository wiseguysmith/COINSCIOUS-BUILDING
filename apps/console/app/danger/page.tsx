'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Pause, 
  Play, 
  Shield, 
  ArrowRightLeft,
  UserX,
  CheckCircle,
  XCircle,
  Lock,
  List,
  Plus
} from 'lucide-react';
import { preflightSimulator } from '@/lib/preflight';
import { MultisigConfirmation } from '@/components/MultisigConfirmation';
import { MultisigDashboard } from '@/components/MultisigDashboard';
import { MultisigAction, MultisigProposal } from '@/lib/multisig';

export default function DangerZonePage() {
  const [view, setView] = useState<'actions' | 'create' | 'details'>('actions');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [preflightResult, setPreflightResult] = useState<any>(null);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [confirmationStep, setConfirmationStep] = useState(0);
  const [targetAddress, setTargetAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [currentAction, setCurrentAction] = useState<MultisigAction | null>(null);
  const [currentOperator] = useState('0x1234567890123456789012345678901234567890'); // In production, get from wallet

  const dangerActions = [
    {
      id: 'pause',
      title: 'Pause System',
      description: 'Pause all token operations system-wide',
      icon: Pause,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      id: 'unpause',
      title: 'Unpause System',
      description: 'Resume all token operations system-wide',
      icon: Play,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      id: 'freeze',
      title: 'Freeze Wallet',
      description: 'Freeze a specific wallet address',
      icon: UserX,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      id: 'unfreeze',
      title: 'Unfreeze Wallet',
      description: 'Unfreeze a previously frozen wallet',
      icon: Shield,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'forceTransfer',
      title: 'Force Transfer',
      description: 'Transfer tokens without owner consent',
      icon: ArrowRightLeft,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    }
  ];

  const handleActionSelect = (actionId: string) => {
    setSelectedAction(actionId);
    setView('create');
    setConfirmationStep(0);
    setPreflightResult(null);
  };

  const handlePreflight = async () => {
    if (!selectedAction) return;

    const result = await preflightSimulator.simulate({
      action: selectedAction as any,
      to: targetAddress || undefined,
      amount: amount || undefined
    });
    
    setPreflightResult(result);
    
    if (result.success) {
      setRequiresConfirmation(true);
    }
  };

  const handleCreateMultisigProposal = () => {
    if (!selectedAction) return;

    const proposal: MultisigProposal = {
      actionType: selectedAction,
      targetAddress: targetAddress || undefined,
      amount: amount || undefined,
      reason: `Danger zone action: ${selectedAction}`,
      data: {
        preflightResult,
        timestamp: new Date().toISOString()
      }
    };

    setCurrentAction({
      id: '',
      actionType: selectedAction as any,
      targetAddress: proposal.targetAddress,
      amount: proposal.amount,
      reason: proposal.reason,
      proposer: currentOperator,
      approvers: [],
      approvals: 0,
      requiredApprovals: 2,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      data: proposal.data
    });
  };

  const handleActionCreated = (action: MultisigAction) => {
    setCurrentAction(action);
    setView('details');
  };

  const handleActionExecuted = (action: MultisigAction) => {
    setCurrentAction(action);
    // Could show success message or redirect
  };

  const handleActionSelectFromDashboard = (action: MultisigAction) => {
    setCurrentAction(action);
    setView('details');
  };

  const resetAction = () => {
    setSelectedAction(null);
    setPreflightResult(null);
    setRequiresConfirmation(false);
    setConfirmationStep(0);
    setTargetAddress('');
    setAmount('');
    setCurrentAction(null);
    setView('actions');
  };

  const selectedActionData = dangerActions.find(action => action.id === selectedAction);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <h1 className="text-3xl font-bold text-red-600">Danger Zone</h1>
              <p className="text-gray-600">Critical system operations requiring two-operator confirmation</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant={view === 'actions' ? 'default' : 'outline'}
              onClick={() => setView('actions')}
              className="flex items-center space-x-2"
            >
              <List className="h-4 w-4" />
              <span>All Actions</span>
            </Button>
            <Button
              variant={view === 'create' ? 'default' : 'outline'}
              onClick={() => setView('create')}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Action</span>
            </Button>
          </div>
        </div>

        {/* Warning Banner */}
        <Card className="mb-8 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Lock className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="font-medium text-red-800">Two-Operator Confirmation Required</h3>
                <p className="text-sm text-red-700">
                  All actions in this section require approval from two different operator wallets for security.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {view === 'actions' && (
        <MultisigDashboard
          currentOperator={currentOperator}
          onActionSelect={handleActionSelectFromDashboard}
        />
      )}

      {view === 'create' && (
        <div className="space-y-6">
          {/* Action Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dangerActions.map((action) => {
              const Icon = action.icon;
              return (
                <Card 
                  key={action.id} 
                  className={`cursor-pointer hover:shadow-lg transition-shadow ${action.borderColor}`}
                  onClick={() => handleActionSelect(action.id)}
                >
                  <CardHeader>
                    <CardTitle className={`flex items-center space-x-2 ${action.color}`}>
                      <Icon className="h-5 w-5" />
                      <span>{action.title}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Action Configuration */}
          {selectedAction && (
            <div className="max-w-2xl mx-auto">
              <Card className={`${selectedActionData?.borderColor} ${selectedActionData?.bgColor}`}>
                <CardHeader>
                  <CardTitle className={`flex items-center space-x-2 ${selectedActionData?.color}`}>
                    {selectedActionData && <selectedActionData.icon className="h-5 w-5" />}
                    <span>{selectedActionData?.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">{selectedActionData?.description}</p>

                    {(selectedAction === 'freeze' || selectedAction === 'unfreeze' || selectedAction === 'forceTransfer') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Target Address
                        </label>
                        <input
                          type="text"
                          value={targetAddress}
                          onChange={(e) => setTargetAddress(e.target.value)}
                          placeholder="0x..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}

                    {selectedAction === 'forceTransfer' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Amount
                        </label>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="1000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <Button onClick={handlePreflight} className="flex-1">
                        Run Preflight Check
                      </Button>
                      <Button onClick={resetAction} variant="outline">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preflight Result */}
              {preflightResult && (
                <Card className={`mt-6 ${preflightResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <CardHeader>
                    <CardTitle className={`flex items-center space-x-2 ${preflightResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {preflightResult.success ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}
                      <span>Preflight Result</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={preflightResult.success ? 'text-green-700' : 'text-red-700'}>
                      {preflightResult.humanReadable}
                    </p>
                    {preflightResult.gasEstimate && (
                      <p className="text-sm text-gray-600 mt-2">
                        Gas Estimate: {preflightResult.gasEstimate}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Multisig Confirmation */}
              {requiresConfirmation && (
                <div className="mt-6">
                  <MultisigConfirmation
                    proposal={{
                      actionType: selectedAction,
                      targetAddress: targetAddress || undefined,
                      amount: amount || undefined,
                      reason: `Danger zone action: ${selectedAction}`,
                      data: { preflightResult }
                    }}
                    proposer={currentOperator}
                    onActionCreated={handleActionCreated}
                    onActionExecuted={handleActionExecuted}
                    onCancel={resetAction}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {view === 'details' && currentAction && (
        <div className="max-w-4xl mx-auto">
          <MultisigConfirmation
            proposal={{
              actionType: currentAction.actionType,
              targetAddress: currentAction.targetAddress,
              amount: currentAction.amount,
              reason: currentAction.reason,
              data: currentAction.data
            }}
            proposer={currentOperator}
            onActionCreated={handleActionCreated}
            onActionExecuted={handleActionExecuted}
            onCancel={resetAction}
          />
        </div>
      )}
    </div>
  );
}
