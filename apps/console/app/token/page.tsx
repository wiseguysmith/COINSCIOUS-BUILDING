'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Coins, 
  Plus, 
  Minus, 
  ArrowRightLeft, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { preflightSimulator } from '@/lib/preflight';

export default function TokenPage() {
  const [action, setAction] = useState<'mint' | 'burn' | 'transfer'>('mint');
  const [fromAddress, setFromAddress] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [partition, setPartition] = useState('REG_D');
  const [preflightResult, setPreflightResult] = useState<any>(null);

  const handlePreflight = async () => {
    const result = await preflightSimulator.simulate({
      action: action as any,
      from: fromAddress || undefined,
      to: toAddress || undefined,
      amount: amount || undefined,
      partition: partition || undefined
    });
    setPreflightResult(result);
  };

  const handleExecute = () => {
    if (preflightResult?.success) {
      // Execute the transaction
      console.log('Executing transaction:', { action, fromAddress, toAddress, amount, partition });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Token Operations</h1>
        <p className="text-gray-600">Mint, burn, and transfer security tokens</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Action Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Coins className="h-5 w-5" />
              <span>Select Action</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={action === 'mint' ? 'default' : 'outline'}
                  onClick={() => setAction('mint')}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Mint</span>
                </Button>
                <Button
                  variant={action === 'burn' ? 'default' : 'outline'}
                  onClick={() => setAction('burn')}
                  className="flex items-center space-x-2"
                >
                  <Minus className="h-4 w-4" />
                  <span>Burn</span>
                </Button>
                <Button
                  variant={action === 'transfer' ? 'default' : 'outline'}
                  onClick={() => setAction('transfer')}
                  className="flex items-center space-x-2"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  <span>Transfer</span>
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Partition
                </label>
                <select
                  value={partition}
                  onChange={(e) => setPartition(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="REG_D">REG_D (Accredited Investors)</option>
                  <option value="REG_S">REG_S (Non-US Persons)</option>
                </select>
              </div>

              {action === 'mint' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {action === 'burn' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Address
                  </label>
                  <input
                    type="text"
                    value={fromAddress}
                    onChange={(e) => setFromAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {action === 'transfer' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Address
                    </label>
                    <input
                      type="text"
                      value={fromAddress}
                      onChange={(e) => setFromAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To Address
                    </label>
                    <input
                      type="text"
                      value={toAddress}
                      onChange={(e) => setToAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

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

              <Button onClick={handlePreflight} className="w-full">
                Run Preflight Check
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preflight Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Preflight Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {preflightResult ? (
              <div className={`p-4 rounded-lg ${preflightResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center space-x-2 mb-3">
                  {preflightResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className={`font-medium ${preflightResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {preflightResult.success ? 'Preflight Passed' : 'Preflight Failed'}
                  </span>
                </div>
                
                <p className={`text-sm ${preflightResult.success ? 'text-green-700' : 'text-red-700'} mb-3`}>
                  {preflightResult.humanReadable}
                </p>

                {preflightResult.gasEstimate && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700">Gas Estimate:</p>
                    <p className="text-sm text-gray-600">{preflightResult.gasEstimate}</p>
                  </div>
                )}

                {preflightResult.warnings && preflightResult.warnings.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-yellow-800">Warnings:</p>
                    <ul className="text-sm text-yellow-700 list-disc list-inside">
                      {preflightResult.warnings.map((warning: string, index: number) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {preflightResult.success && (
                  <Button onClick={handleExecute} className="w-full">
                    Execute Transaction
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Preflight Check</h3>
                <p className="text-gray-600">Fill in the form and run a preflight check to see results.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Token Statistics */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Token Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">1,000,000</p>
                <p className="text-sm text-gray-600">Total Supply</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">750,000</p>
                <p className="text-sm text-gray-600">Circulating Supply</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">89</p>
                <p className="text-sm text-gray-600">Holders</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">1,247</p>
                <p className="text-sm text-gray-600">Total Transfers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
