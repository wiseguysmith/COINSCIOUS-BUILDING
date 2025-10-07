import { EventIndexer } from '../src/indexer';
import { DatabaseService } from '../src/database';
import { AlertService } from '../src/alerts';

// Mock dependencies
jest.mock('../src/database');
jest.mock('../src/alerts');

describe('EventIndexer', () => {
  let eventIndexer: EventIndexer;
  let mockClient: any;
  let mockDb: jest.Mocked<DatabaseService>;
  let mockAlerts: jest.Mocked<AlertService>;

  const mockDeployments = {
    contracts: {
      logAnchor: '0x1111111111111111111111111111111111111111',
      complianceRegistry: '0x2222222222222222222222222222222222222222',
      securityTokenFactory: '0x3333333333333333333333333333333333333333',
      payoutDistributorFactory: '0x4444444444444444444444444444444444444444'
    },
    deployer: '0x5555555555555555555555555555555555555555',
    gnosisSafe: '0x6666666666666666666666666666666666666666',
    timelockController: '0x7777777777777777777777777777777777777777'
  };

  beforeEach(() => {
    mockClient = {
      getBlockNumber: jest.fn(),
      getLogs: jest.fn(),
      getBlock: jest.fn()
    };

    mockDb = new DatabaseService() as jest.Mocked<DatabaseService>;
    mockAlerts = new AlertService() as jest.Mocked<AlertService>;

    eventIndexer = new EventIndexer(mockClient, mockDb, mockAlerts, mockDeployments);
  });

  describe('constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(eventIndexer).toBeDefined();
    });
  });

  describe('start', () => {
    it('should start the indexer', async () => {
      mockClient.getBlockNumber.mockResolvedValue(1000n);
      mockDb.initialize = jest.fn().mockResolvedValue(undefined);

      await eventIndexer.start();

      expect(mockDb.initialize).toHaveBeenCalled();
    });

    it('should not start if already running', async () => {
      mockClient.getBlockNumber.mockResolvedValue(1000n);
      mockDb.initialize = jest.fn().mockResolvedValue(undefined);

      await eventIndexer.start();
      await eventIndexer.start(); // Second call

      expect(mockDb.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop', () => {
    it('should stop the indexer', async () => {
      await eventIndexer.stop();
      // Should not throw
    });

    it('should not stop if not running', async () => {
      await eventIndexer.stop();
      await eventIndexer.stop(); // Second call
      // Should not throw
    });
  });

  describe('processBlocks', () => {
    it('should process blocks without errors', async () => {
      mockClient.getLogs.mockResolvedValue([]);
      mockClient.getBlock.mockResolvedValue({
        timestamp: BigInt(Math.floor(Date.now() / 1000))
      });

      await eventIndexer['processBlocks'](1000n, 1001n);

      expect(mockClient.getLogs).toHaveBeenCalled();
    });
  });

  describe('processSecurityTokenEvents', () => {
    it('should process SecurityToken events', async () => {
      const mockEvents = [
        {
          transactionHash: '0x123',
          blockNumber: 1000n,
          logIndex: 0,
          args: {
            from: '0x1111111111111111111111111111111111111111',
            to: '0x2222222222222222222222222222222222222222',
            amount: 1000n,
            partition: '0x0000000000000000000000000000000000000000000000000000000000000000',
            operatorData: '0x'
          }
        }
      ];

      mockClient.getLogs.mockResolvedValue(mockEvents);
      mockClient.getBlock.mockResolvedValue({
        timestamp: BigInt(Math.floor(Date.now() / 1000))
      });
      mockDb.insertTokenTransfer = jest.fn().mockResolvedValue(undefined);

      await eventIndexer['processSecurityTokenEvents'](1000n, 1001n);

      expect(mockDb.insertTokenTransfer).toHaveBeenCalled();
    });
  });

  describe('processComplianceEvents', () => {
    it('should process ComplianceRegistry events', async () => {
      const mockEvents = [
        {
          transactionHash: '0x123',
          blockNumber: 1000n,
          logIndex: 0,
          eventName: 'InvestorRegistered',
          args: {
            investor: '0x1111111111111111111111111111111111111111',
            accredited: true,
            country: 'US'
          }
        }
      ];

      mockClient.getLogs.mockResolvedValue(mockEvents);
      mockClient.getBlock.mockResolvedValue({
        timestamp: BigInt(Math.floor(Date.now() / 1000))
      });
      mockDb.insertComplianceAction = jest.fn().mockResolvedValue(undefined);

      await eventIndexer['processComplianceEvents'](1000n, 1001n);

      expect(mockDb.insertComplianceAction).toHaveBeenCalled();
    });
  });

  describe('processPayoutEvents', () => {
    it('should process PayoutDistributor events', async () => {
      const mockEvents = [
        {
          transactionHash: '0x123',
          blockNumber: 1000n,
          logIndex: 0,
          args: {
            snapshotId: 1n,
            totalAmount: 10000n,
            holderCount: 100,
            distributionMode: 'PROPORTIONAL'
          }
        }
      ];

      mockClient.getLogs.mockResolvedValue(mockEvents);
      mockClient.getBlock.mockResolvedValue({
        timestamp: BigInt(Math.floor(Date.now() / 1000))
      });
      mockDb.insertPayout = jest.fn().mockResolvedValue(undefined);

      await eventIndexer['processPayoutEvents'](1000n, 1001n);

      expect(mockDb.insertPayout).toHaveBeenCalled();
    });
  });

  describe('processLogAnchorEvents', () => {
    it('should process LogAnchor events', async () => {
      const mockEvents = [
        {
          transactionHash: '0x123',
          blockNumber: 1000n,
          logIndex: 0,
          args: {
            root: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            date: 1n
          }
        }
      ];

      mockClient.getLogs.mockResolvedValue(mockEvents);
      mockClient.getBlock.mockResolvedValue({
        timestamp: BigInt(Math.floor(Date.now() / 1000))
      });
      mockDb.insertSnapshot = jest.fn().mockResolvedValue(undefined);

      await eventIndexer['processLogAnchorEvents'](1000n, 1001n);

      expect(mockDb.insertSnapshot).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      mockClient.getBlockNumber.mockRejectedValue(new Error('RPC Error'));
      mockAlerts.sendAlert = jest.fn().mockResolvedValue(undefined);

      // Start the indexer and let it run briefly
      eventIndexer.start();
      
      // Wait a bit for error handling
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockAlerts.sendAlert).toHaveBeenCalled();
    });
  });
});
