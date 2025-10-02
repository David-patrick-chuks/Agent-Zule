import axios, { AxiosInstance } from 'axios';
import { Logger } from '../../utils/Logger';
import { Config } from '../../config/AppConfig';

export interface HyperSyncRequest {
  method: string;
  params: any[];
  id?: number;
}

export interface HyperSyncResponse<T = any> {
  id: number;
  result: T;
  error?: {
    code: number;
    message: string;
  };
}

export interface BlockData {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: number;
  gasLimit: string;
  gasUsed: string;
  transactions: TransactionData[];
}

export interface TransactionData {
  hash: string;
  blockNumber: number;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasUsed: string;
  status: 'success' | 'failed';
  logs: LogData[];
}

export interface LogData {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
}

export interface ContractState {
  address: string;
  storage: Record<string, string>;
  code: string;
  balance: string;
  nonce: number;
}

export class HyperSyncService {
  private static instance: HyperSyncService;
  private httpClient: AxiosInstance;
  private logger = Logger.getInstance();
  private config = Config.getConfig();

  private constructor() {
    this.httpClient = axios.create({
      baseURL: this.config.envio.hyperSyncEndpoint,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.envio.apiKey}`
      }
    });

    this.setupInterceptors();
  }

  public static getInstance(): HyperSyncService {
    if (!HyperSyncService.instance) {
      HyperSyncService.instance = new HyperSyncService();
    }
    return HyperSyncService.instance;
  }

  /**
   * Get latest block data
   */
  public async getLatestBlock(): Promise<BlockData> {
    try {
      this.logger.logEnvio('HyperSync', 'get_latest_block', {});

      const request: HyperSyncRequest = {
        method: 'eth_getBlockByNumber',
        params: ['latest', true],
        id: 1
      };

      const response = await this.httpClient.post<HyperSyncResponse<BlockData>>('', request);
      
      if (response.data.error) {
        throw new Error(`HyperSync error: ${response.data.error.message}`);
      }

      this.logger.debug('Latest block retrieved', {
        blockNumber: response.data.result.number,
        transactionCount: response.data.result.transactions.length
      });

      return response.data.result;

    } catch (error) {
      this.logger.error('Failed to get latest block', error);
      throw error;
    }
  }

  /**
   * Get block data by number
   */
  public async getBlockByNumber(blockNumber: number): Promise<BlockData> {
    try {
      this.logger.logEnvio('HyperSync', 'get_block_by_number', { blockNumber });

      const request: HyperSyncRequest = {
        method: 'eth_getBlockByNumber',
        params: [`0x${blockNumber.toString(16)}`, true],
        id: 1
      };

      const response = await this.httpClient.post<HyperSyncResponse<BlockData>>('', request);
      
      if (response.data.error) {
        throw new Error(`HyperSync error: ${response.data.error.message}`);
      }

      return response.data.result;

    } catch (error) {
      this.logger.error('Failed to get block by number', error, { blockNumber });
      throw error;
    }
  }

  /**
   * Get transaction data by hash
   */
  public async getTransactionByHash(txHash: string): Promise<TransactionData> {
    try {
      this.logger.logEnvio('HyperSync', 'get_transaction_by_hash', { txHash });

      const request: HyperSyncRequest = {
        method: 'eth_getTransactionByHash',
        params: [txHash],
        id: 1
      };

      const response = await this.httpClient.post<HyperSyncResponse<TransactionData>>('', request);
      
      if (response.data.error) {
        throw new Error(`HyperSync error: ${response.data.error.message}`);
      }

      return response.data.result;

    } catch (error) {
      this.logger.error('Failed to get transaction by hash', error, { txHash });
      throw error;
    }
  }

  /**
   * Get contract state at specific block
   */
  public async getContractState(
    contractAddress: string,
    blockNumber?: number
  ): Promise<ContractState> {
    try {
      this.logger.logEnvio('HyperSync', 'get_contract_state', {
        contractAddress,
        blockNumber
      });

      const blockParam = blockNumber ? `0x${blockNumber.toString(16)}` : 'latest';

      const request: HyperSyncRequest = {
        method: 'eth_getCode',
        params: [contractAddress, blockParam],
        id: 1
      };

      const response = await this.httpClient.post<HyperSyncResponse<string>>('', request);
      
      if (response.data.error) {
        throw new Error(`HyperSync error: ${response.data.error.message}`);
      }

      // Get balance
      const balanceRequest: HyperSyncRequest = {
        method: 'eth_getBalance',
        params: [contractAddress, blockParam],
        id: 2
      };

      const balanceResponse = await this.httpClient.post<HyperSyncResponse<string>>('', balanceRequest);

      return {
        address: contractAddress,
        storage: {}, // Would need additional calls to get storage
        code: response.data.result,
        balance: balanceResponse.data.result || '0x0',
        nonce: 0 // Would need additional call to get nonce
      };

    } catch (error) {
      this.logger.error('Failed to get contract state', error, { contractAddress });
      throw error;
    }
  }

  /**
   * Get logs for a specific address and block range
   */
  public async getLogs(
    address: string,
    fromBlock?: number,
    toBlock?: number,
    topics?: string[]
  ): Promise<LogData[]> {
    try {
      this.logger.logEnvio('HyperSync', 'get_logs', {
        address,
        fromBlock,
        toBlock,
        topicsCount: topics?.length || 0
      });

      const params: any = {
        address,
        fromBlock: fromBlock ? `0x${fromBlock.toString(16)}` : '0x0',
        toBlock: toBlock ? `0x${toBlock.toString(16)}` : 'latest'
      };

      if (topics && topics.length > 0) {
        params.topics = topics;
      }

      const request: HyperSyncRequest = {
        method: 'eth_getLogs',
        params: [params],
        id: 1
      };

      const response = await this.httpClient.post<HyperSyncResponse<LogData[]>>('', request);
      
      if (response.data.error) {
        throw new Error(`HyperSync error: ${response.data.error.message}`);
      }

      return response.data.result;

    } catch (error) {
      this.logger.error('Failed to get logs', error, { address });
      throw error;
    }
  }

  /**
   * Get block range data for bulk processing
   */
  public async getBlockRange(
    fromBlock: number,
    toBlock: number,
    includeTransactions: boolean = true
  ): Promise<BlockData[]> {
    try {
      this.logger.logEnvio('HyperSync', 'get_block_range', {
        fromBlock,
        toBlock,
        includeTransactions
      });

      const blocks: BlockData[] = [];
      
      // Process blocks in batches to avoid overwhelming the service
      const batchSize = 10;
      for (let i = fromBlock; i <= toBlock; i += batchSize) {
        const batchEnd = Math.min(i + batchSize - 1, toBlock);
        
        const batchPromises: Promise<BlockData>[] = [];
        for (let blockNum = i; blockNum <= batchEnd; blockNum++) {
          batchPromises.push(this.getBlockByNumber(blockNum));
        }

        const batchBlocks = await Promise.all(batchPromises);
        blocks.push(...batchBlocks);

        // Add small delay between batches
        if (batchEnd < toBlock) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      this.logger.debug('Block range retrieved', {
        blockCount: blocks.length,
        fromBlock,
        toBlock
      });

      return blocks;

    } catch (error) {
      this.logger.error('Failed to get block range', error, { fromBlock, toBlock });
      throw error;
    }
  }

  /**
   * Monitor specific contract events in real-time
   */
  public async monitorContractEvents(
    contractAddress: string,
    eventSignature: string,
    callback: (log: LogData) => void,
    fromBlock?: number
  ): Promise<void> {
    try {
      this.logger.logEnvio('HyperSync', 'monitor_contract_events_started', {
        contractAddress,
        eventSignature
      });

      // Get the topic hash for the event signature
      const topicHash = this.getEventTopicHash(eventSignature);
      
      let currentBlock = fromBlock || await this.getLatestBlockNumber();

      // Poll for new events
      const pollInterval = 5000; // 5 seconds
      const poll = async () => {
        try {
          const latestBlock = await this.getLatestBlockNumber();
          
          if (latestBlock > currentBlock) {
            const logs = await this.getLogs(
              contractAddress,
              currentBlock + 1,
              latestBlock,
              [topicHash]
            );

            for (const log of logs) {
              callback(log);
            }

            currentBlock = latestBlock;
          }
        } catch (error) {
          this.logger.error('Error in contract event monitoring', error);
        }

        setTimeout(poll, pollInterval);
      };

      poll();

    } catch (error) {
      this.logger.error('Failed to monitor contract events', error, { contractAddress });
      throw error;
    }
  }

  /**
   * Get account balance at specific block
   */
  public async getBalance(
    address: string,
    blockNumber?: number
  ): Promise<string> {
    try {
      const blockParam = blockNumber ? `0x${blockNumber.toString(16)}` : 'latest';

      const request: HyperSyncRequest = {
        method: 'eth_getBalance',
        params: [address, blockParam],
        id: 1
      };

      const response = await this.httpClient.post<HyperSyncResponse<string>>('', request);
      
      if (response.data.error) {
        throw new Error(`HyperSync error: ${response.data.error.message}`);
      }

      return response.data.result;

    } catch (error) {
      this.logger.error('Failed to get balance', error, { address });
      throw error;
    }
  }

  /**
   * Get transaction count for an address
   */
  public async getTransactionCount(
    address: string,
    blockNumber?: number
  ): Promise<number> {
    try {
      const blockParam = blockNumber ? `0x${blockNumber.toString(16)}` : 'latest';

      const request: HyperSyncRequest = {
        method: 'eth_getTransactionCount',
        params: [address, blockParam],
        id: 1
      };

      const response = await this.httpClient.post<HyperSyncResponse<string>>('', request);
      
      if (response.data.error) {
        throw new Error(`HyperSync error: ${response.data.error.message}`);
      }

      return parseInt(response.data.result, 16);

    } catch (error) {
      this.logger.error('Failed to get transaction count', error, { address });
      throw error;
    }
  }

  /**
   * Health check for HyperSync service
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    lastBlock: number;
    errors: string[];
  }> {
    const startTime = Date.now();
    
    try {
      const latestBlock = await this.getLatestBlock();
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        lastBlock: latestBlock.number,
        errors: []
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'unhealthy',
        responseTime,
        lastBlock: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Private helper methods
  private setupInterceptors(): void {
    // Request interceptor
    this.httpClient.interceptors.request.use(
      (config) => {
        this.logger.debug('HyperSync request', {
          url: config.url,
          method: config.method,
          data: config.data
        });
        return config;
      },
      (error) => {
        this.logger.error('HyperSync request error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug('HyperSync response', {
          status: response.status,
          dataSize: JSON.stringify(response.data).length
        });
        return response;
      },
      (error) => {
        this.logger.error('HyperSync response error', error);
        return Promise.reject(error);
      }
    );
  }

  private async getLatestBlockNumber(): Promise<number> {
    const latestBlock = await this.getLatestBlock();
    return latestBlock.number;
  }

  private getEventTopicHash(eventSignature: string): string {
    // This would use ethers.js or web3 to calculate the keccak256 hash
    // For now, return a placeholder
    return '0x' + '0'.repeat(64);
  }
}
