import { PublicClient, parseAbi, getContract, Log } from 'viem';
import { DatabaseService } from './database';
import { AlertService } from './alerts';
import { logger } from './logger';

interface Deployments {
  contracts: {
    logAnchor: string;
    complianceRegistry: string;
    securityTokenFactory: string;
    payoutDistributorFactory: string;
  };
  deployer: string;
  gnosisSafe: string;
  timelockController: string;
  mockUSDC?: string;
}

export class EventIndexer {
  private client: PublicClient;
  private db: DatabaseService;
  private alerts: AlertService;
  private deployments: Deployments;
  private isRunning = false;
  private lastProcessedBlock = 0n;
  private contracts: any = {};

  // Contract ABIs
  private readonly ABIS = {
    SecurityToken: parseAbi([
      'event IssuedByPartition(bytes32 indexed partition, address indexed to, uint256 amount, bytes data)',
      'event TransferredByPartition(bytes32 indexed partition, address indexed from, address indexed to, uint256 amount, bytes data, bytes operatorData)',
      'event RedeemedByPartition(bytes32 indexed partition, address indexed from, uint256 amount, bytes data)',
      'event Paused(address account)',
      'event Unpaused(address account)',
      'event ControllerChanged(address indexed previousController, address indexed newController)',
      'event Freeze(address indexed wallet)',
      'event Unfreeze(address indexed wallet)'
    ]),
    ComplianceRegistry: parseAbi([
      'event InvestorRegistered(address indexed investor, bool accredited, string country)',
      'event ComplianceUpdated(address indexed investor, bool accredited, uint256 limit)',
      'event WalletFrozen(address indexed wallet, string reason)',
      'event WalletUnfrozen(address indexed wallet, string reason)'
    ]),
    PayoutDistributor: parseAbi([
      'event PayoutDistributed(uint256 indexed snapshotId, uint256 totalAmount, uint256 holderCount, string distributionMode)',
      'event PayoutRecipient(address indexed wallet, uint256 amount, uint256 percentage)'
    ]),
    LogAnchor: parseAbi([
      'event MerkleRootAnchored(bytes32 indexed root, uint256 indexed date, uint256 blockNumber)'
    ])
  };

  constructor(
    client: PublicClient,
    db: DatabaseService,
    alerts: AlertService,
    deployments: Deployments
  ) {
    this.client = client;
    this.db = db;
    this.alerts = alerts;
    this.deployments = deployments;
    this.initializeContracts();
  }

  private initializeContracts() {
    // Initialize contract instances
    this.contracts = {
      complianceRegistry: getContract({
        address: this.deployments.contracts.complianceRegistry as `0x${string}`,
        abi: this.ABIS.ComplianceRegistry,
        client: this.client
      }),
      logAnchor: getContract({
        address: this.deployments.contracts.logAnchor as `0x${string}`,
        abi: this.ABIS.LogAnchor,
        client: this.client
      })
    };

    logger.info('Contracts initialized', { 
      complianceRegistry: this.deployments.contracts.complianceRegistry,
      logAnchor: this.deployments.contracts.logAnchor
    });
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Indexer is already running');
      return;
    }

    try {
      logger.info('Starting event indexer...');
      
      // Get the last processed block
      await this.loadLastProcessedBlock();
      
      // Start the indexing loop
      this.isRunning = true;
      this.indexingLoop();
      
      logger.info('Event indexer started successfully');
    } catch (error) {
      logger.error('Failed to start event indexer', { error });
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.info('Event indexer stopped');
  }

  private async loadLastProcessedBlock() {
    try {
      // Get the latest block from database
      const client = await this.db['pool'].connect();
      try {
        const result = await client.query(`
          SELECT MAX(block_number) as max_block 
          FROM (
            SELECT block_number FROM token_transfers
            UNION ALL
            SELECT block_number FROM compliance_actions
            UNION ALL
            SELECT block_number FROM payouts
            UNION ALL
            SELECT block_number FROM snapshots
          ) all_blocks
        `);
        
        this.lastProcessedBlock = result.rows[0]?.max_block ? BigInt(result.rows[0].max_block) : 0n;
        logger.info('Last processed block loaded', { block: this.lastProcessedBlock.toString() });
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Failed to load last processed block', { error });
      this.lastProcessedBlock = 0n;
    }
  }

  private async indexingLoop() {
    while (this.isRunning) {
      try {
        const currentBlock = await this.client.getBlockNumber();
        
        if (currentBlock > this.lastProcessedBlock) {
          const fromBlock = this.lastProcessedBlock + 1n;
          const toBlock = currentBlock;
          
          logger.info('Processing blocks', { 
            from: fromBlock.toString(), 
            to: toBlock.toString() 
          });
          
          await this.processBlocks(fromBlock, toBlock);
          this.lastProcessedBlock = toBlock;
        }
        
        // Wait 5 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        logger.error('Error in indexing loop', { error });
        await this.alerts.sendAlert({
          type: 'indexer_error',
          severity: 'HIGH',
          title: 'Indexer Error',
          message: `Indexer encountered an error: ${(error as Error).message}`,
          data: { error: (error as Error).message }
        });
        
        // Wait longer on error
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
  }

  private async processBlocks(fromBlock: bigint, toBlock: bigint) {
    try {
      // Process all contract events in parallel
      await Promise.all([
        this.processSecurityTokenEvents(fromBlock, toBlock),
        this.processComplianceEvents(fromBlock, toBlock),
        this.processPayoutEvents(fromBlock, toBlock),
        this.processLogAnchorEvents(fromBlock, toBlock)
      ]);
      
      logger.debug('Blocks processed successfully', { 
        from: fromBlock.toString(), 
        to: toBlock.toString() 
      });
      
    } catch (error) {
      logger.error('Error processing blocks', { error, fromBlock: fromBlock.toString(), toBlock: toBlock.toString() });
      throw error;
    }
  }

  private async processSecurityTokenEvents(fromBlock: bigint, toBlock: bigint) {
    try {
      // Get all SecurityToken events from all deployed instances
      const events = await this.client.getLogs({
        address: undefined, // Listen to all addresses
        event: this.ABIS.SecurityToken[0], // IssuedByPartition
        fromBlock,
        toBlock
      });

      for (const event of events) {
        await this.processTokenTransferEvent(event);
      }

      // Process other SecurityToken events
      const transferEvents = await this.client.getLogs({
        address: undefined,
        event: this.ABIS.SecurityToken[1], // TransferredByPartition
        fromBlock,
        toBlock
      });

      for (const event of transferEvents) {
        await this.processTokenTransferEvent(event);
      }

    } catch (error) {
      logger.error('Error processing SecurityToken events', { error });
    }
  }

  private async processComplianceEvents(fromBlock: bigint, toBlock: bigint) {
    try {
      const events = await this.client.getLogs({
        address: this.deployments.contracts.complianceRegistry as `0x${string}`,
        event: this.ABIS.ComplianceRegistry[0], // InvestorRegistered
        fromBlock,
        toBlock
      });

      for (const event of events) {
        await this.processComplianceEvent(event);
      }

      // Process freeze/unfreeze events
      const freezeEvents = await this.client.getLogs({
        address: this.deployments.contracts.complianceRegistry as `0x${string}`,
        event: this.ABIS.ComplianceRegistry[2], // WalletFrozen
        fromBlock,
        toBlock
      });

      for (const event of freezeEvents) {
        await this.processComplianceEvent(event);
      }

    } catch (error) {
      logger.error('Error processing ComplianceRegistry events', { error });
    }
  }

  private async processPayoutEvents(fromBlock: bigint, toBlock: bigint) {
    try {
      // Process PayoutDistributor events
      const events = await this.client.getLogs({
        address: undefined, // Listen to all PayoutDistributor instances
        event: this.ABIS.PayoutDistributor[0], // PayoutDistributed
        fromBlock,
        toBlock
      });

      for (const event of events) {
        await this.processPayoutEvent(event);
      }

    } catch (error) {
      logger.error('Error processing PayoutDistributor events', { error });
    }
  }

  private async processLogAnchorEvents(fromBlock: bigint, toBlock: bigint) {
    try {
      const events = await this.client.getLogs({
        address: this.deployments.contracts.logAnchor as `0x${string}`,
        event: this.ABIS.LogAnchor[0], // MerkleRootAnchored
        fromBlock,
        toBlock
      });

      for (const event of events) {
        await this.processLogAnchorEvent(event);
      }

    } catch (error) {
      logger.error('Error processing LogAnchor events', { error });
    }
  }

  private async processTokenTransferEvent(event: Log) {
    try {
      const block = await this.client.getBlock({ blockNumber: event.blockNumber });
      
      const transferData = {
        transactionHash: event.transactionHash,
        blockNumber: Number(event.blockNumber),
        logIndex: event.logIndex,
        from: event.args?.from || '0x0000000000000000000000000000000000000000',
        to: event.args?.to || '0x0000000000000000000000000000000000000000',
        amount: event.args?.amount?.toString() || '0',
        partition: event.args?.partition || '0x0000000000000000000000000000000000000000000000000000000000000000',
        operatorData: event.args?.operatorData || '0x',
        timestamp: new Date(Number(block.timestamp) * 1000)
      };

      await this.db.insertTokenTransfer(transferData);
      
      logger.debug('Token transfer processed', { 
        txHash: event.transactionHash,
        from: transferData.from,
        to: transferData.to,
        amount: transferData.amount
      });

    } catch (error) {
      logger.error('Error processing token transfer event', { error, event });
    }
  }

  private async processComplianceEvent(event: Log) {
    try {
      const block = await this.client.getBlock({ blockNumber: event.blockNumber });
      
      const complianceData = {
        transactionHash: event.transactionHash,
        blockNumber: Number(event.blockNumber),
        logIndex: event.logIndex,
        actionType: event.eventName || 'Unknown',
        walletAddress: event.args?.investor || event.args?.wallet || '0x0000000000000000000000000000000000000000',
        operatorAddress: '0x0000000000000000000000000000000000000000', // Will be filled from transaction
        reasonCode: event.args?.reason || null,
        details: {
          accredited: event.args?.accredited,
          country: event.args?.country,
          limit: event.args?.limit?.toString()
        },
        timestamp: new Date(Number(block.timestamp) * 1000)
      };

      await this.db.insertComplianceAction(complianceData);
      
      logger.debug('Compliance action processed', { 
        txHash: event.transactionHash,
        action: complianceData.actionType,
        wallet: complianceData.walletAddress
      });

    } catch (error) {
      logger.error('Error processing compliance event', { error, event });
    }
  }

  private async processPayoutEvent(event: Log) {
    try {
      const block = await this.client.getBlock({ blockNumber: event.blockNumber });
      
      const payoutData = {
        transactionHash: event.transactionHash,
        blockNumber: Number(event.blockNumber),
        logIndex: event.logIndex,
        snapshotId: Number(event.args?.snapshotId || 0),
        totalAmount: event.args?.totalAmount?.toString() || '0',
        distributionMode: event.args?.distributionMode || 'UNKNOWN',
        holderCount: Number(event.args?.holderCount || 0),
        networkFeeEth: '0', // Will be calculated from transaction
        timestamp: new Date(Number(block.timestamp) * 1000)
      };

      await this.db.insertPayout(payoutData);
      
      logger.debug('Payout processed', { 
        txHash: event.transactionHash,
        snapshotId: payoutData.snapshotId,
        amount: payoutData.totalAmount
      });

    } catch (error) {
      logger.error('Error processing payout event', { error, event });
    }
  }

  private async processLogAnchorEvent(event: Log) {
    try {
      const block = await this.client.getBlock({ blockNumber: event.blockNumber });
      
      const anchorData = {
        snapshotId: Number(event.args?.date || 0),
        transactionHash: event.transactionHash,
        blockNumber: Number(event.blockNumber),
        totalSupply: '0', // Will be calculated
        holderCount: 0, // Will be calculated
        timestamp: new Date(Number(block.timestamp) * 1000)
      };

      await this.db.insertSnapshot(anchorData);
      
      logger.debug('Log anchor processed', { 
        txHash: event.transactionHash,
        root: event.args?.root,
        date: anchorData.snapshotId
      });

    } catch (error) {
      logger.error('Error processing log anchor event', { error, event });
    }
  }
}
