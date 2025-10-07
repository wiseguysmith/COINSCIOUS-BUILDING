'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Camera, 
  Play, 
  Pause, 
  CheckCircle,
  AlertTriangle,
  XCircle,
  Download
} from 'lucide-react';
import { preflightSimulator } from '@/lib/preflight';

// Mock data
const mockSnapshots = [
  {
    id: 1,
    timestamp: '2024-01-15T10:00:00Z',
    holders: 24,
    totalAmount: '50,000 USDC',
    status: 'completed',
    distributionMode: 'FULL'
  },
  {
    id: 2,
    timestamp: '2024-01-14T10:00:00Z',
    holders: 23,
    totalAmount: '45,000 USDC',
    status: 'completed',
    distributionMode: 'FULL'
  },
  {
    id: 3,
    timestamp: '2024-01-13T10:00:00Z',
    holders: 22,
    totalAmount: '40,000 USDC',
    status: 'pending',
    distributionMode: 'PRO_RATA'
  }
];

export default function PayoutsPage() {
  const [selectedSnapshot, setSelectedSnapshot] = useState<any>(null);
  const [preflightResult, setPreflightResult] = useState<any>(null);
  const [fundingAmount, setFundingAmount] = useState('');

  const handleCreateSnapshot = async () => {
    const result = await preflightSimulator.simulate({
      action: 'payout',
      snapshotId: 'new'
    });
    setPreflightResult(result);
  };

  const handleFundPayout = async (snapshotId: number) => {
    const result = await preflightSimulator.simulate({
      action: 'payout',
      snapshotId: snapshotId.toString(),
      amount: fundingAmount
    });
    setPreflightResult(result);
    setSelectedSnapshot(mockSnapshots.find(s => s.id === snapshotId));
  };

  const handleDistribute = async (snapshotId: number) => {
    const result = await preflightSimulator.simulate({
      action: 'payout',
      snapshotId: snapshotId.toString()
    });
    setPreflightResult(result);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Payout Management</h1>
        <p className="text-gray-600">Create snapshots and distribute payouts to token holders</p>
      </div>

      {/* Preflight Result */}
      {preflightResult && (
        <Card className={`mb-6 ${preflightResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
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
            {preflightResult.details && (
              <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Distribution Details:</p>
                <ul className="text-sm text-gray-600 mt-1">
                  <li>Holders: {preflightResult.details.holders}</li>
                  <li>Total Amount: {preflightResult.details.totalAmount}</li>
                  <li>Network Fee: {preflightResult.details.networkFee}</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create Snapshot */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Camera className="h-5 w-5" />
              <span>Create Snapshot</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Create a snapshot of current token holders for payout distribution.
              </p>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Current Holder Stats</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700">Total Holders:</p>
                    <p className="font-medium">24</p>
                  </div>
                  <div>
                    <p className="text-blue-700">Total Supply:</p>
                    <p className="font-medium">1,000,000 COIN</p>
                  </div>
                </div>
              </div>

              <Button onClick={handleCreateSnapshot} className="w-full">
                Create Snapshot
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Fund Payout */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Fund Payout</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Funding Amount (USDC)
                </label>
                <input
                  type="number"
                  value={fundingAmount}
                  onChange={(e) => setFundingAmount(e.target.value)}
                  placeholder="50000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">Funding Modes</h4>
                <div className="text-sm text-yellow-700 space-y-1">
                  <p><strong>FULL:</strong> Distribute to all holders (requires exact funding)</p>
                  <p><strong>PRO_RATA:</strong> Distribute proportionally if underfunded</p>
                </div>
              </div>

              <Button 
                onClick={() => handleFundPayout(3)} 
                className="w-full"
                disabled={!fundingAmount}
              >
                Fund Pending Payout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Snapshots List */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Payout Snapshots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockSnapshots.map((snapshot) => (
                <div key={snapshot.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h4 className="font-medium">Snapshot #{snapshot.id}</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(snapshot.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge 
                      variant={snapshot.status === 'completed' ? 'default' : 'secondary'}
                    >
                      {snapshot.status}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{snapshot.totalAmount}</p>
                      <p className="text-xs text-gray-600">{snapshot.holders} holders</p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {snapshot.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleDistribute(snapshot.id)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Distribute
                        </Button>
                      )}
                      
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout Statistics */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Payout Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">12</p>
                <p className="text-sm text-gray-600">Total Payouts</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">$1,250,000</p>
                <p className="text-sm text-gray-600">Total Distributed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">24</p>
                <p className="text-sm text-gray-600">Average Holders</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">$52,083</p>
                <p className="text-sm text-gray-600">Average Payout</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
