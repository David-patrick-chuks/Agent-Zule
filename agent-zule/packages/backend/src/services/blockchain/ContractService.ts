import { ethers } from 'ethers';
import { Logger } from '../../utils/Logger';
import { MonadClient } from './MonadClient';
import { Config } from '../../config/AppConfig';

export interface ContractABI {
  name: string;
  type: string;
  inputs: Array<{
    name: string;
    type: string;
    indexed?: boolean;
  }>;
  outputs?: Array<{
    name: string;
    type: string;
  }>;
  stateMutability?: string;
}

export interface ContractInstance {
  address: string;
  abi: ContractABI[];
  name: string;
  version: string;
  deployedAt: number;
  verified: boolean;
}

export interface ContractCall {
  method: string;
  params: any[];
  value?: string;
  gasLimit?: string;
  gasPrice?: string;
}

export interface ContractEvent {
  name: string;
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  args: any;
}

export interface ContractDeployment {
  address: string;
  transactionHash: string;
  gasUsed: string;
  gasPrice: string;
  deployer: string;
  timestamp: number;
}

export class ContractService {
  private static instance: ContractService;
  private monadClient: MonadClient;
  private logger = Logger.getInstance();
  private config = Config.getConfig();
  private contracts: Map<string, ethers.Contract> = new Map();

  private constructor() {
    this.monadClient = MonadClient.getInstance();
  }

  public static getInstance(): ContractService {
    if (!ContractService.instance) {
      ContractService.instance = new ContractService();
    }
    return ContractService.instance;
  }

  /**
   * Deploy contract
   */
  public async deployContract(
    bytecode: string,
    abi: ContractABI[],
    constructorArgs: any[] = [],
    deployerWallet: ethers.Wallet
  ): Promise<ContractDeployment> {
    try {
      this.logger.logEnvio('ContractService', 'deploy_contract', { deployer: deployerWallet.address });

      const factory = new ethers.ContractFactory(abi, bytecode, deployerWallet);
      
      // Estimate gas
      const gasEstimate = await factory.getDeployTransaction(...constructorArgs).then(tx => 
        deployerWallet.estimateGas(tx)
      );

      // Deploy contract
      const contract = await factory.deploy(...constructorArgs, {
        gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
      });

      // Wait for deployment
      await contract.waitForDeployment();
      const address = await contract.getAddress();

      // Get deployment transaction details
      const deployTx = contract.deploymentTransaction();
      if (!deployTx) {
        throw new Error('Deployment transaction not found');
      }

      const receipt = await deployTx.wait();
      if (!receipt) {
        throw new Error('Deployment receipt not found');
      }

      const deployment: ContractDeployment = {
        address,
        transactionHash: deployTx.hash,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: deployTx.gasPrice?.toString() || '0',
        deployer: deployerWallet.address,
        timestamp: Date.now()
      };

      this.logger.logEnvio('ContractService', 'contract_deployed', {
        address,
        transactionHash: deployTx.hash,
        gasUsed: deployment.gasUsed
      });

      return deployment;

    } catch (error) {
      this.logger.error('Failed to deploy contract', error, { deployer: deployerWallet.address });
      throw error;
    }
  }

  /**
   * Get contract instance
   */
  public async getContract(
    address: string,
    abi: ContractABI[],
    wallet?: ethers.Wallet
  ): Promise<ethers.Contract> {
    try {
      const contractKey = `${address}-${wallet?.address || 'readonly'}`;
      
      if (this.contracts.has(contractKey)) {
        return this.contracts.get(contractKey)!;
      }

      const provider = wallet ? wallet : this.monadClient.getProvider();
      const contract = new ethers.Contract(address, abi, provider);
      
      this.contracts.set(contractKey, contract);
      return contract;

    } catch (error) {
      this.logger.error('Failed to get contract instance', error, { address });
      throw error;
    }
  }

  /**
   * Call contract method (read-only)
   */
  public async callMethod(
    address: string,
    abi: ContractABI[],
    methodName: string,
    params: any[] = []
  ): Promise<any> {
    try {
      this.logger.logEnvio('ContractService', 'call_method', { address, methodName });

      const contract = await this.getContract(address, abi);
      const result = await contract[methodName](...params);
      return result;

    } catch (error) {
      this.logger.error('Failed to call contract method', error, { address, methodName });
      throw error;
    }
  }

  /**
   * Send transaction to contract
   */
  public async sendTransaction(
    address: string,
    abi: ContractABI[],
    methodName: string,
    params: any[] = [],
    wallet: ethers.Wallet,
    options?: {
      value?: string;
      gasLimit?: string;
      gasPrice?: string;
    }
  ): Promise<{
    hash: string;
    receipt: ethers.TransactionReceipt;
  }> {
    try {
      this.logger.logEnvio('ContractService', 'send_transaction', { 
        address, 
        methodName, 
        from: wallet.address 
      });

      const contract = await this.getContract(address, abi, wallet);
      
      // Prepare transaction options
      const txOptions: any = {};
      if (options?.value) txOptions.value = options.value;
      if (options?.gasLimit) txOptions.gasLimit = options.gasLimit;
      if (options?.gasPrice) txOptions.gasPrice = options.gasPrice;

      // Send transaction
      const tx = await contract[methodName](...params, txOptions);
      const receipt = await tx.wait();

      this.logger.logEnvio('ContractService', 'transaction_sent', {
        hash: tx.hash,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status
      });

      return {
        hash: tx.hash,
        receipt
      };

    } catch (error) {
      this.logger.error('Failed to send transaction', error, { address, methodName });
      throw error;
    }
  }

  /**
   * Listen to contract events
   */
  public async listenToEvents(
    address: string,
    abi: ContractABI[],
    eventName: string,
    callback: (event: ContractEvent) => void,
    filter?: any
  ): Promise<void> {
    try {
      this.logger.logEnvio('ContractService', 'listen_to_events', { address, eventName });

      const contract = await this.getContract(address, abi);
      
      contract.on(eventName, (...args) => {
        const event = args[args.length - 1]; // Last argument is the event object
        
        const contractEvent: ContractEvent = {
          name: eventName,
          address: event.address,
          topics: event.topics,
          data: event.data,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          logIndex: event.logIndex,
          args: args.slice(0, -1) // All args except the event object
        };

        callback(contractEvent);
      });

    } catch (error) {
      this.logger.error('Failed to listen to contract events', error, { address, eventName });
      throw error;
    }
  }

  /**
   * Get contract events
   */
  public async getEvents(
    address: string,
    abi: ContractABI[],
    eventName: string,
    fromBlock: number = 0,
    toBlock: number = 'latest'
  ): Promise<ContractEvent[]> {
    try {
      this.logger.logEnvio('ContractService', 'get_events', { address, eventName, fromBlock, toBlock });

      const contract = await this.getContract(address, abi);
      
      const filter = contract.filters[eventName]();
      const events = await contract.queryFilter(filter, fromBlock, toBlock);

      return events.map(event => ({
        name: eventName,
        address: event.address,
        topics: event.topics,
        data: event.data,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        logIndex: event.index,
        args: event.args
      }));

    } catch (error) {
      this.logger.error('Failed to get contract events', error, { address, eventName });
      throw error;
    }
  }

  /**
   * Estimate gas for contract call
   */
  public async estimateGas(
    address: string,
    abi: ContractABI[],
    methodName: string,
    params: any[] = [],
    wallet: ethers.Wallet,
    options?: {
      value?: string;
    }
  ): Promise<string> {
    try {
      this.logger.logEnvio('ContractService', 'estimate_gas', { address, methodName });

      const contract = await this.getContract(address, abi, wallet);
      
      const txOptions: any = {};
      if (options?.value) txOptions.value = options.value;

      const gasEstimate = await contract[methodName].estimateGas(...params, txOptions);
      return gasEstimate.toString();

    } catch (error) {
      this.logger.error('Failed to estimate gas', error, { address, methodName });
      throw error;
    }
  }

  /**
   * Get contract storage
   */
  public async getStorage(
    address: string,
    position: string
  ): Promise<string> {
    try {
      this.logger.logEnvio('ContractService', 'get_storage', { address, position });

      const storage = await this.monadClient.getStorageAt(address, position);
      return storage;

    } catch (error) {
      this.logger.error('Failed to get contract storage', error, { address, position });
      throw error;
    }
  }

  /**
   * Verify contract
   */
  public async verifyContract(
    address: string,
    sourceCode: string,
    contractName: string,
    constructorArgs: string = '',
    compilerVersion: string = '0.8.19'
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      this.logger.logEnvio('ContractService', 'verify_contract', { address, contractName });

      // This would typically call a contract verification service
      // For now, return a mock response
      return {
        success: true,
        message: 'Contract verification submitted successfully'
      };

    } catch (error) {
      this.logger.error('Failed to verify contract', error, { address });
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Get contract information
   */
  public async getContractInfo(address: string): Promise<{
    address: string;
    code: string;
    balance: string;
    nonce: number;
    isContract: boolean;
  }> {
    try {
      this.logger.logEnvio('ContractService', 'get_contract_info', { address });

      const [code, balance, nonce] = await Promise.all([
        this.monadClient.getCode(address),
        this.monadClient.getBalance(address),
        this.monadClient.getTransactionCount(address)
      ]);

      return {
        address,
        code,
        balance,
        nonce,
        isContract: code !== '0x'
      };

    } catch (error) {
      this.logger.error('Failed to get contract info', error, { address });
      throw error;
    }
  }

  /**
   * Create contract instance from ABI
   */
  public createContractInstance(
    address: string,
    abi: ContractABI[],
    wallet?: ethers.Wallet
  ): ethers.Contract {
    const provider = wallet ? wallet : this.monadClient.getProvider();
    return new ethers.Contract(address, abi, provider);
  }

  /**
   * Get contract method signature
   */
  public getMethodSignature(abi: ContractABI[], methodName: string): string {
    const method = abi.find(item => 
      item.type === 'function' && item.name === methodName
    );

    if (!method) {
      throw new Error(`Method ${methodName} not found in ABI`);
    }

    const inputs = method.inputs?.map(input => input.type).join(',') || '';
    return `${methodName}(${inputs})`;
  }

  /**
   * Get contract event signature
   */
  public getEventSignature(abi: ContractABI[], eventName: string): string {
    const event = abi.find(item => 
      item.type === 'event' && item.name === eventName
    );

    if (!event) {
      throw new Error(`Event ${eventName} not found in ABI`);
    }

    const inputs = event.inputs?.map(input => input.type).join(',') || '';
    return `${eventName}(${inputs})`;
  }

  /**
   * Clear contract cache
   */
  public clearCache(): void {
    this.contracts.clear();
    this.logger.debug('Contract cache cleared');
  }

  /**
   * Get cached contracts
   */
  public getCachedContracts(): string[] {
    return Array.from(this.contracts.keys());
  }
}
