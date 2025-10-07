'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Filter, 
  Download, 
  Search,
  Calendar,
  ExternalLink
} from 'lucide-react';

// Mock data
const mockEvents = [
  {
    id: 1,
    type: 'Transfer',
    from: '0x1234567890123456789012345678901234567890',
    to: '0x2345678901234567890123456789012345678901',
    amount: '1000',
    timestamp: '2024-01-15T10:30:00Z',
    transactionHash: '0xabc123...def456',
    blockNumber: 12345678
  },
  {
    id: 2,
    type: 'Mint',
    to: '0x3456789012345678901234567890123456789012',
    amount: '5000',
    timestamp: '2024-01-15T10:25:00Z',
    transactionHash: '0xdef456...ghi789',
    blockNumber: 12345675
  },
  {
    id: 3,
    type: 'Payout',
    snapshotId: 12,
    amount: '50,000 USDC',
    timestamp: '2024-01-15T10:20:00Z',
    transactionHash: '0xghi789...jkl012',
    blockNumber: 12345670
  },
  {
    id: 4,
    type: 'Freeze',
    target: '0x4567890123456789012345678901234567890123',
    timestamp: '2024-01-15T10:15:00Z',
    transactionHash: '0xjkl012...mno345',
    blockNumber: 12345665
  },
  {
    id: 5,
    type: 'Pause',
    timestamp: '2024-01-15T10:10:00Z',
    transactionHash: '0xmno345...pqr678',
    blockNumber: 12345660
  }
];

const eventTypes = ['All', 'Transfer', 'Mint', 'Burn', 'Payout', 'Freeze', 'Unfreeze', 'Pause', 'Unpause'];

export default function EventsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [dateRange, setDateRange] = useState('7d');

  const filteredEvents = mockEvents.filter(event => {
    const matchesSearch = 
      event.from?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.to?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.target?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.transactionHash.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'All' || event.type === selectedType;
    
    return matchesSearch && matchesType;
  });

  const handleExport = () => {
    // Export functionality would be implemented here
    console.log('Exporting events...');
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'Transfer':
        return '↔️';
      case 'Mint':
        return '➕';
      case 'Burn':
        return '➖';
      case 'Payout':
        return '💰';
      case 'Freeze':
        return '❄️';
      case 'Unfreeze':
        return '🔥';
      case 'Pause':
        return '⏸️';
      case 'Unpause':
        return '▶️';
      default:
        return '📝';
    }
  };

  const getEventDescription = (event: any) => {
    switch (event.type) {
      case 'Transfer':
        return `${event.from?.slice(0, 6)}...${event.from?.slice(-4)} → ${event.to?.slice(0, 6)}...${event.to?.slice(-4)}`;
      case 'Mint':
        return `Minted to ${event.to?.slice(0, 6)}...${event.to?.slice(-4)}`;
      case 'Burn':
        return `Burned from ${event.from?.slice(0, 6)}...${event.from?.slice(-4)}`;
      case 'Payout':
        return `Snapshot #${event.snapshotId}`;
      case 'Freeze':
      case 'Unfreeze':
        return `Target: ${event.target?.slice(0, 6)}...${event.target?.slice(-4)}`;
      case 'Pause':
      case 'Unpause':
        return 'System-wide action';
      default:
        return 'Unknown event';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Event Monitoring</h1>
        <p className="text-gray-600">Monitor and track all platform events and transactions</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search by address or transaction hash..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex space-x-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {eventTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="1d">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              
              <Button onClick={handleExport} variant="outline" className="flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Export</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Recent Events</span>
            </div>
            <Badge variant="outline">{filteredEvents.length} events</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">{getEventIcon(event.type)}</div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{event.type}</Badge>
                      <span className="text-sm text-gray-600">
                        {getEventDescription(event)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-500">
                        Block #{event.blockNumber}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {event.amount && (
                    <div className="text-right">
                      <p className="text-sm font-medium">{event.amount}</p>
                      <p className="text-xs text-gray-500">Amount</p>
                    </div>
                  )}
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(`https://sepolia.basescan.org/tx/${event.transactionHash}`, '_blank')}
                    className="flex items-center space-x-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>View</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-600">Try adjusting your search filters.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Statistics */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Event Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">1,247</p>
                <p className="text-sm text-gray-600">Total Events</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">89</p>
                <p className="text-sm text-gray-600">Unique Addresses</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">12</p>
                <p className="text-sm text-gray-600">Payout Events</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">24h</p>
                <p className="text-sm text-gray-600">Last Activity</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
