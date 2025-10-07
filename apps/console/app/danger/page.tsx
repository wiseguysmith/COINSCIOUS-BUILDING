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
  Lock
} from 'lucide-react';
import { preflightSimulator } from '@/lib/preflight';

export default function DangerZonePage() {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [preflightResult, setPreflightResult] = useState<any>(null);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [confirmationStep, setConfirmationStep] = useState(0);
  const [targetAddress, setTargetAddress] = useState('');
  const [amount, setAmount] = useState('');

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

  const handleConfirmation = () => {
    setConfirmationStep(1);
  };

  const handleFinalExecution = () => {
    if (confirmationStep === 1) {
      // Execute the action
      console.log('Executing danger zone action:', selectedAction);
      setConfirmationStep(2);
    }
  };

  const resetAction = () => {
    setSelectedAction(null);
    setPreflightResult(null);
    setRequiresConfirmation(false);
    setConfirmationStep(0);
    setTargetAddress('');
    setAmount('');
  };

  const selectedActionData = dangerActions.find(action => action.id === selectedAction);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-2">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <h1 className="text-3xl font-bold text-red-600">Danger Zone</h1>
        </div>
        <p className="text-gray-600">Critical system operations requiring two-operator confirmation</p>
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

      {!selectedAction ? (
        /* Action Selection */
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
      ) : (
        /* Action Configuration */
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

          {/* Two-Operator Confirmation */}
          {requiresConfirmation && confirmationStep === 0 && (
            <Card className="mt-6 border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-yellow-800">
                  <Lock className="h-5 w-5" />
                  <span>Two-Operator Confirmation Required</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-yellow-700">
                    This action requires approval from two different operator wallets. 
                    Please confirm that you have the necessary permissions.
                  </p>
                  
                  <div className="bg-yellow-100 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">Confirmation Steps:</h4>
                    <ol className="text-sm text-yellow-800 list-decimal list-inside space-y-1">
                      <li>First operator confirms the action</li>
                      <li>Second operator reviews and approves</li>
                      <li>Action executes automatically</li>
                    </ol>
                  </div>

                  <div className="flex space-x-2">
                    <Button onClick={handleConfirmation} className="flex-1">
                      I Confirm - Proceed to Two-Operator Approval
                    </Button>
                    <Button onClick={resetAction} variant="outline">
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Confirmation Step 1 */}
          {confirmationStep === 1 && (
            <Card className="mt-6 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-blue-800">
                  <Shield className="h-5 w-5" />
                  <span>First Operator Confirmation</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-blue-700">
                    First operator has confirmed. Waiting for second operator approval...
                  </p>
                  
                  <div className="bg-blue-100 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Action Details:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>Action: {selectedActionData?.title}</li>
                      {targetAddress && <li>Target: {targetAddress}</li>}
                      {amount && <li>Amount: {amount}</li>}
                      <li>Gas Estimate: {preflightResult?.gasEstimate}</li>
                    </ul>
                  </div>

                  <div className="flex space-x-2">
                    <Button onClick={handleFinalExecution} className="flex-1">
                      Second Operator - Approve & Execute
                    </Button>
                    <Button onClick={resetAction} variant="outline">
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Confirmation Complete */}
          {confirmationStep === 2 && (
            <Card className="mt-6 border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <span>Action Executed Successfully</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-green-700 mb-4">
                  The {selectedActionData?.title.toLowerCase()} action has been executed successfully.
                </p>
                <Button onClick={resetAction} className="w-full">
                  Return to Danger Zone
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
