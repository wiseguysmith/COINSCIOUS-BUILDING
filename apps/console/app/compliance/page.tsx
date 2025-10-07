'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Upload, 
  Shield, 
  UserCheck, 
  UserX, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { preflightSimulator } from '@/lib/preflight';

// Mock data - in real app, this would come from the indexer
const mockInvestors = [
  {
    address: '0x1234567890123456789012345678901234567890',
    name: 'John Doe',
    accredited: true,
    country: 'US',
    kycCompleted: true,
    investmentLimit: '100000',
    status: 'active',
    lastActivity: '2024-01-15T10:30:00Z'
  },
  {
    address: '0x2345678901234567890123456789012345678901',
    name: 'Jane Smith',
    accredited: false,
    country: 'CA',
    kycCompleted: true,
    investmentLimit: '50000',
    status: 'active',
    lastActivity: '2024-01-14T15:20:00Z'
  },
  {
    address: '0x3456789012345678901234567890123456789012',
    name: 'Bob Johnson',
    accredited: true,
    country: 'US',
    kycCompleted: false,
    investmentLimit: '0',
    status: 'frozen',
    lastActivity: '2024-01-10T09:15:00Z'
  }
];

export default function CompliancePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvestor, setSelectedInvestor] = useState<any>(null);
  const [preflightResult, setPreflightResult] = useState<any>(null);

  const filteredInvestors = mockInvestors.filter(investor =>
    investor.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    investor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFreezeToggle = async (investor: any) => {
    const action = investor.status === 'frozen' ? 'unfreeze' : 'freeze';
    const result = await preflightSimulator.simulate({
      action: action as any,
      to: investor.address
    });
    setPreflightResult(result);
    setSelectedInvestor(investor);
  };

  const handleCSVUpload = () => {
    // CSV upload functionality would be implemented here
    console.log('CSV upload triggered');
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Compliance Management</h1>
        <p className="text-gray-600">Manage investor compliance and KYC status</p>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by address or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <Button onClick={handleCSVUpload} className="flex items-center space-x-2">
          <Upload className="h-4 w-4" />
          <span>Upload CSV</span>
        </Button>
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
            {preflightResult.warnings && preflightResult.warnings.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-yellow-800">Warnings:</p>
                <ul className="text-sm text-yellow-700 list-disc list-inside">
                  {preflightResult.warnings.map((warning: string, index: number) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Investors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredInvestors.map((investor) => (
          <Card key={investor.address} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{investor.name}</CardTitle>
                <Badge 
                  variant={investor.status === 'active' ? 'default' : 'destructive'}
                >
                  {investor.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {investor.address.slice(0, 6)}...{investor.address.slice(-4)}
                  </code>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Accredited</p>
                    <div className="flex items-center space-x-1">
                      {investor.accredited ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">{investor.accredited ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">KYC</p>
                    <div className="flex items-center space-x-1">
                      {investor.kycCompleted ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">{investor.kycCompleted ? 'Complete' : 'Pending'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Investment Limit</p>
                  <p className="text-sm font-medium">${parseInt(investor.investmentLimit).toLocaleString()}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Country</p>
                  <p className="text-sm">{investor.country}</p>
                </div>

                <div className="flex space-x-2 pt-2">
                  <Button
                    size="sm"
                    variant={investor.status === 'frozen' ? 'default' : 'destructive'}
                    onClick={() => handleFreezeToggle(investor)}
                    className="flex-1"
                  >
                    {investor.status === 'frozen' ? (
                      <>
                        <UserCheck className="h-4 w-4 mr-1" />
                        Unfreeze
                      </>
                    ) : (
                      <>
                        <UserX className="h-4 w-4 mr-1" />
                        Freeze
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInvestors.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No investors found</h3>
            <p className="text-gray-600">Try adjusting your search terms or upload a CSV file.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
