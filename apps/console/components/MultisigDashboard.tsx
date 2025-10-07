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
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';
import { multisigService, MultisigAction } from '@/lib/multisig';

interface MultisigDashboardProps {
  currentOperator: string;
  onActionSelect: (action: MultisigAction) => void;
}

export function MultisigDashboard({ currentOperator, onActionSelect }: MultisigDashboardProps) {
  const [actions, setActions] = useState<MultisigAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'my' | 'executed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadActions();
  }, [currentOperator]);

  const loadActions = async () => {
    setLoading(true);
    try {
      const allActions = await multisigService.getActionsForOperator(currentOperator);
      setActions(allActions);
    } catch (error) {
      console.error('Failed to load actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActions = actions.filter(action => {
    // Filter by status
    if (filter === 'pending' && action.status !== 'PENDING') return false;
    if (filter === 'executed' && action.status !== 'EXECUTED') return false;
    if (filter === 'my' && action.proposer !== currentOperator) return false;

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        action.actionType.toLowerCase().includes(searchLower) ||
        action.reason.toLowerCase().includes(searchLower) ||
        action.id.toLowerCase().includes(searchLower) ||
        (action.targetAddress && action.targetAddress.toLowerCase().includes(searchLower))
      );
    }

    return true;
  });

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

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'pause': return 'text-red-600 bg-red-50';
      case 'unpause': return 'text-green-600 bg-green-50';
      case 'freeze': return 'text-orange-600 bg-orange-50';
      case 'unfreeze': return 'text-blue-600 bg-blue-50';
      case 'forceTransfer': return 'text-purple-600 bg-purple-50';
      case 'emergencyPause': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const isExpiringSoon = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    return diff < 2 * 60 * 60 * 1000; // Less than 2 hours
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading multisig actions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Multisig Actions</h2>
          <p className="text-gray-600">Manage two-operator confirmation actions</p>
        </div>
        <Button onClick={loadActions} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search actions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All ({actions.length})
              </Button>
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
              >
                Pending ({actions.filter(a => a.status === 'PENDING').length})
              </Button>
              <Button
                variant={filter === 'my' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('my')}
              >
                My Actions ({actions.filter(a => a.proposer === currentOperator).length})
              </Button>
              <Button
                variant={filter === 'executed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('executed')}
              >
                Executed ({actions.filter(a => a.status === 'EXECUTED').length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions List */}
      <div className="space-y-4">
        {filteredActions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No actions found</h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? 'No multisig actions have been created yet.'
                  : `No ${filter} actions found.`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredActions.map((action) => (
            <Card 
              key={action.id} 
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                isExpiringSoon(action.expiresAt) && action.status === 'PENDING' 
                  ? 'border-orange-200 bg-orange-50' 
                  : ''
              }`}
              onClick={() => onActionSelect(action)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={getActionTypeColor(action.actionType)}>
                        {action.actionType}
                      </Badge>
                      <Badge className={getStatusColor(action.status)}>
                        {getStatusIcon(action.status)}
                        <span className="ml-1">{action.status}</span>
                      </Badge>
                      {isExpiringSoon(action.expiresAt) && action.status === 'PENDING' && (
                        <Badge className="bg-orange-100 text-orange-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Expiring Soon
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="font-medium text-gray-900 mb-1">
                      Action #{action.id.split('_')[1]}
                    </h3>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {action.reason}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Proposed by: {action.proposer}</span>
                      <span>Created: {formatTimeAgo(action.createdAt)}</span>
                      {action.expiresAt && (
                        <span>Expires: {formatTimeAgo(action.expiresAt)}</span>
                      )}
                      {action.executedAt && (
                        <span>Executed: {formatTimeAgo(action.executedAt)}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">
                      Approvals: {action.approvals}/{action.requiredApprovals}
                    </div>
                    <div className="flex space-x-1">
                      {Array.from({ length: action.requiredApprovals }, (_, i) => (
                        <div
                          key={i}
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                            i < action.approvals
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-300 text-gray-600'
                          }`}
                        >
                          {i < action.approvals ? '✓' : i + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
