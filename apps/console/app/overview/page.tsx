'use client';

import { useAccount, useReadContract } from 'wagmi';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Network, 
  Shield, 
  DollarSign, 
  Users, 
  Activity,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

// Mock data - in real app, this would come from the indexer
const mockData = {
  network: 'Base Sepolia',
  contracts: {
    logAnchor: '0x1234...5678',
    complianceRegistry: '0x2345...6789',
    securityTokenFactory: '0x3456...7890',
    payoutDistributorFactory: '0x4567...8901',
  },
  systemState: {
    paused: false,
    controller: '0x5678...9012',
    lastPayout: '2024-01-15T10:30:00Z',
    totalPayouts: 12,
    totalDistributed: '1,250,000 USDC',
  },
  recentEvents: [
    { type: 'Transfer', from: '0x1111...', to: '0x2222...', amount: '1000', timestamp: '2024-01-15T10:25:00Z' },
    { type: 'Mint', to: '0x3333...', amount: '5000', timestamp: '2024-01-15T10:20:00Z' },
    { type: 'Payout', snapshotId: 12, amount: '50,000 USDC', timestamp: '2024-01-15T10:15:00Z' },
  ],
  stats: {
    totalTransfers: 1247,
    uniqueWallets: 89,
    totalPayouts: 12,
    totalDistributed: '1,250,000 USDC',
  }
};

export default function OverviewPage() {
  const { address, isConnected } = useAccount();
  const [deployments, setDeployments] = useState<any>(null);

  useEffect(() => {
    // Load deployments from JSON file
    const loadDeployments = async () => {
      try {
        const response = await fetch('/api/deployments');
        const data = await response.json();
        setDeployments(data);
      } catch (error) {
        console.error('Failed to load deployments:', error);
      }
    };
    loadDeployments();
  }, []);

  if (!isConnected) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">COINSCIOUS Operator Console</h1>
          <p className="text-gray-600 mb-6">Please connect your wallet to access the console</p>
          <Button>Connect Wallet</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">System Overview</h1>
        <p className="text-gray-600">Monitor and manage the COINSCIOUS platform</p>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {mockData.systemState.paused ? (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <span className="text-2xl font-bold">
                {mockData.systemState.paused ? 'Paused' : 'Active'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Controller: {mockData.systemState.controller}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">{mockData.network}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Connected as: {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockData.stats.totalPayouts}</div>
            <p className="text-xs text-muted-foreground">
              {mockData.stats.totalDistributed} distributed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Wallets</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockData.stats.uniqueWallets}</div>
            <p className="text-xs text-muted-foreground">
              {mockData.stats.totalTransfers} total transfers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contract Addresses */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Contract Addresses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Core Contracts</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>LogAnchor:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    {deployments?.contracts?.logAnchor || mockData.contracts.logAnchor}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span>ComplianceRegistry:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    {deployments?.contracts?.complianceRegistry || mockData.contracts.complianceRegistry}
                  </code>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Factories</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>SecurityTokenFactory:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    {deployments?.contracts?.securityTokenFactory || mockData.contracts.securityTokenFactory}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span>PayoutDistributorFactory:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    {deployments?.contracts?.payoutDistributorFactory || mockData.contracts.payoutDistributorFactory}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Recent Events</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockData.recentEvents.map((event, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline">{event.type}</Badge>
                  <span className="text-sm">
                    {event.type === 'Transfer' && `${event.from} → ${event.to}`}
                    {event.type === 'Mint' && `Minted to ${event.to}`}
                    {event.type === 'Payout' && `Snapshot ${event.snapshotId}`}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{event.amount}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



