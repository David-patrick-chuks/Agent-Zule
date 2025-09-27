import { ethers } from 'ethers';
import { Logger } from '../../utils/Logger';
import { Config } from '../../config/AppConfig';

export interface MonadNetworkConfig {
  rpcUrl: string;
  chainId: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl: string;
}

export interface MonadTransaction {
  hash: string;
  blockNumber: number;
  blockHash: string;
  transactionIndex: number;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasLimit: string;
  gasUsed: string;
  nonce: number;
  data: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: number;
}

export interface MonadBlock {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: number;
  gasLimit: string;
  gasUsed: string;
  baseFeePerGas?: string;
  transactions: string[];
  size: number;
}

export interface MonadAccount {
  address: string;
  balance: string;
  nonce: number;
  codeHash: string;
}

export class MonadClient {
  private static instance: MonadClient;
  private provider: ethers.JsonRpcProvider;
  private logger = Logger.getInstance();
  private config = Config.getConfig();

  private constructor() {
    this.provider = new ethers.JsonRpcProvider(this.config.monad.rpcUrl);
  }

  public static getInstance(): MonadClient {
    if (!MonadClient.instance) {
      MonadClient.instance = new MonadClient();
    }
    return MonadClient.instance;
  }

  /**
   * Get network configuration
   */
  public getNetworkConfig(): MonadNetworkConfig {
    return {
      rpcUrl: this.config.monad.rpcUrl,
      chainId: this.config.monad.chainId,
      name: 'Monad Testnet',
      nativeCurrency: {
        name: 'Monad',
        symbol: 'MON',
        decimals: 18
      },
      blockExplorerUrl: 'https://testnet.monad.xyz'
    };
  }

  /**
   * Get current block number
   */
  public async getBlockNumber(): Promise<number> {
    try {
      this.logger.logEnvio('MonadClient', 'get_block_number', {});

      const blockNumber = await this.provider.getBlockNumber();
      return blockNumber;

    } catch (error) {
      this.logger.error('Failed to get block number', error);
      throw error;
    }
  }

  /**
   * Get block by number
   */
  public async getBlock(blockNumber: number): Promise<MonadBlock | null> {
    try {
      this.logger.logEnvio('MonadClient', 'get_block', { blockNumber });

      const block = await this.provider.getBlock(blockNumber);
      if (!block) return null;

      return {
        number: block.number,
        hash: block.hash || '',
        parentHash: block.parentHash,
        timestamp: block.timestamp,
        gasLimit: block.gasLimit.toString(),
        gasUsed: block.gasUsed.toString(),
        baseFeePerGas: block.baseFeePerGas?.toString(),
        transactions: block.transactions,
        size: 0 // Block size not available in ethers.js
      };

    } catch (error) {
      this.logger.error('Failed to get block', error, { blockNumber });
      throw error;
    }
  }

  /**
   * Get latest block
   */
  public async getLatestBlock(): Promise<MonadBlock | null> {
    try {
      const blockNumber = await this.getBlockNumber();
      return await this.getBlock(blockNumber);

    } catch (error) {
      this.logger.error('Failed to get latest block', error);
      throw error;
    }
  }

  /**
   * Get transaction by hash
   */
  public async getTransaction(txHash: string): Promise<MonadTransaction | null> {
    try {
      this.logger.logEnvio('MonadClient', 'get_transaction', { txHash });

      const tx = await this.provider.getTransaction(txHash);
      if (!tx) return null;

      const receipt = await this.provider.getTransactionReceipt(txHash);
      const block = tx.blockNumber ? await this.getBlock(tx.blockNumber) : null;

      return {
        hash: tx.hash,
        blockNumber: tx.blockNumber || 0,
        blockHash: tx.blockHash || '',
        transactionIndex: tx.index || 0,
        from: tx.from,
        to: tx.to || '',
        value: tx.value.toString(),
        gasPrice: tx.gasPrice?.toString() || '0',
        gasLimit: tx.gasLimit.toString(),
        gasUsed: receipt?.gasUsed.toString() || '0',
        nonce: tx.nonce,
        data: tx.data,
        status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending',
        timestamp: block?.timestamp || 0
      };

    } catch (error) {
      this.logger.error('Failed to get transaction', error, { txHash });
      throw error;
    }
  }

  /**
   * Get account information
   */
  public async getAccount(address: string): Promise<MonadAccount> {
    try {
      this.logger.logEnvio('MonadClient', 'get_account', { address });

      const [balance, nonce, code] = await Promise.all([
        this.provider.getBalance(address),
        this.provider.getTransactionCount(address),
        this.provider.getCode(address)
      ]);

      return {
        address,
        balance: balance.toString(),
        nonce,
        codeHash: ethers.keccak256(code)
      };

    } catch (error) {
      this.logger.error('Failed to get account', error, { address });
      throw error;
    }
  }

  /**
   * Get account balance
   */
  public async getBalance(address: string): Promise<string> {
    try {
      this.logger.logEnvio('MonadClient', 'get_balance', { address });

      const balance = await this.provider.getBalance(address);
      return balance.toString();

    } catch (error) {
      this.logger.error('Failed to get balance', error, { address });
      throw error;
    }
  }

  /**
   * Get transaction count for account
   */
  public async getTransactionCount(address: string): Promise<number> {
    try {
      this.logger.logEnvio('MonadClient', 'get_transaction_count', { address });

      const count = await this.provider.getTransactionCount(address);
      return count;

    } catch (error) {
      this.logger.error('Failed to get transaction count', error, { address });
      throw error;
    }
  }

  /**
   * Get gas price
   */
  public async getGasPrice(): Promise<string> {
    try {
      this.logger.logEnvio('MonadClient', 'get_gas_price', {});

      const gasPrice = await this.provider.getFeeData();
      return gasPrice.gasPrice?.toString() || '0';

    } catch (error) {
      this.logger.error('Failed to get gas price', error);
      throw error;
    }
  }

  /**
   * Estimate gas for transaction
   */
  public async estimateGas(transaction: {
    to?: string;
    from?: string;
    value?: string;
    data?: string;
  }): Promise<string> {
    try {
      this.logger.logEnvio('MonadClient', 'estimate_gas', { to: transaction.to });

      const gasEstimate = await this.provider.estimateGas(transaction);
      return gasEstimate.toString();

    } catch (error) {
      this.logger.error('Failed to estimate gas', error, { transaction });
      throw error;
    }
  }

  /**
   * Send raw transaction
   */
  public async sendRawTransaction(signedTransaction: string): Promise<string> {
    try {
      this.logger.logEnvio('MonadClient', 'send_raw_transaction', {});

      const tx = await this.provider.broadcastTransaction(signedTransaction);
      return tx.hash;

    } catch (error) {
      this.logger.error('Failed to send raw transaction', error);
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  public async waitForTransaction(
    txHash: string,
    confirmations: number = 1,
    timeout: number = 300000 // 5 minutes
  ): Promise<MonadTransaction | null> {
    try {
      this.logger.logEnvio('MonadClient', 'wait_for_transaction', { txHash, confirmations });

      const receipt = await this.provider.waitForTransaction(txHash, confirmations, timeout);
      if (!receipt) return null;

      return await this.getTransaction(txHash);

    } catch (error) {
      this.logger.error('Failed to wait for transaction', error, { txHash });
      throw error;
    }
  }

  /**
   * Get logs for contract
   */
  public async getLogs(filter: {
    address?: string;
    topics?: string[];
    fromBlock?: number;
    toBlock?: number;
  }): Promise<Array<{
    address: string;
    topics: string[];
    data: string;
    blockNumber: number;
    transactionHash: string;
    logIndex: number;
  }>> {
    try {
      this.logger.logEnvio('MonadClient', 'get_logs', { address: filter.address });

      const logs = await this.provider.getLogs(filter);
      return logs.map(log => ({
        address: log.address,
        topics: log.topics,
        data: log.data,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.index
      }));

    } catch (error) {
      this.logger.error('Failed to get logs', error, { filter });
      throw error;
    }
  }

  /**
   * Call contract method (read-only)
   */
  public async callContract(
    contractAddress: string,
    abi: any[],
    methodName: string,
    params: any[] = []
  ): Promise<any> {
    try {
      this.logger.logEnvio('MonadClient', 'call_contract', { contractAddress, methodName });

      const contract = new ethers.Contract(contractAddress, abi, this.provider);
      const result = await contract[methodName](...params);
      return result;

    } catch (error) {
      this.logger.error('Failed to call contract', error, { contractAddress, methodName });
      throw error;
    }
  }

  /**
   * Get contract code
   */
  public async getCode(address: string): Promise<string> {
    try {
      this.logger.logEnvio('MonadClient', 'get_code', { address });

      const code = await this.provider.getCode(address);
      return code;

    } catch (error) {
      this.logger.error('Failed to get contract code', error, { address });
      throw error;
    }
  }

  /**
   * Get storage at address
   */
  public async getStorageAt(address: string, position: string): Promise<string> {
    try {
      this.logger.logEnvio('MonadClient', 'get_storage_at', { address, position });

      const storage = await this.provider.getStorage(address, position);
      return storage;

    } catch (error) {
      this.logger.error('Failed to get storage', error, { address, position });
      throw error;
    }
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    lastBlock: number;
    chainId: number;
    errors: string[];
  }> {
    const startTime = Date.now();
    
    try {
      const [blockNumber, chainId] = await Promise.all([
        this.getBlockNumber(),
        this.provider.getNetwork().then(network => Number(network.chainId))
      ]);

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        lastBlock: blockNumber,
        chainId,
        errors: []
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'unhealthy',
        responseTime,
        lastBlock: 0,
        chainId: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get provider instance
   */
  public getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  /**
   * Create wallet from private key
   */
  public createWallet(privateKey: string): ethers.Wallet {
    return new ethers.Wallet(privateKey, this.provider);
  }

  /**
   * Create wallet from mnemonic
   */
  public createWalletFromMnemonic(mnemonic: string, path?: string): ethers.Wallet {
    return ethers.Wallet.fromPhrase(mnemonic, this.provider, path);
  }
}
