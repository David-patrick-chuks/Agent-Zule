import { ethers } from 'ethers';
import { MONAD_CONFIG } from '@/lib/constants';

// Contract addresses (these would be deployed contract addresses)
const CONTRACT_ADDRESSES = {
  PortfolioAgent: process.env.NEXT_PUBLIC_PORTFOLIO_AGENT_ADDRESS || '0x...',
  PermissionManager: process.env.NEXT_PUBLIC_PERMISSION_MANAGER_ADDRESS || '0x...',
  VotingEngine: process.env.NEXT_PUBLIC_VOTING_ENGINE_ADDRESS || '0x...',
  ExecutionEngine: process.env.NEXT_PUBLIC_EXECUTION_ENGINE_ADDRESS || '0x...',
} as const;

// Contract ABIs (simplified versions - would need full ABIs from compilation)
const CONTRACT_ABIS = {
  PortfolioAgent: [
    // Core functions
    'function executeRebalancing((address[],uint256[],uint256,uint256) newPositions, uint256 maxSlippage, uint256 deadline) external',
    'function executeYieldOptimization((address,address,uint256,uint256,uint256) opportunity, uint256 amount) external',
    'function executeDca((address,uint256,uint256,uint256,uint256) params) external',
    
    // View functions
    'function getPortfolioPositions(address user) external view returns ((address,uint256,uint256)[] positions)',
    'function getPortfolioMetrics(address user) external view returns (uint256 totalValue, int256 totalReturn, uint256 sharpeRatio)',
    'function hasPermission(address user, bytes32 action) external view returns (bool userHasPermission)',
    
    // Events
    'event PortfolioRebalanced(address indexed user, (address,uint256,uint256)[] oldPositions, (address,uint256,uint256)[] newPositions, uint256 timestamp)',
    'event YieldOptimized(address indexed user, address indexed fromPool, address indexed toPool, uint256 amount, uint256 expectedApy)',
    'event DCAExecuted(address indexed user, address indexed token, uint256 amount, uint256 totalExecutions)',
    'event RiskThresholdUpdated(address indexed updater, uint256 oldThreshold, uint256 newThreshold)',
    'event EmergencyStopActivated(address indexed updater, string reason)',
  ],
  
  PermissionManager: [
    'function checkPermission(address user, bytes32 action, uint256 amount) external view returns (bool userHasPermission, bool requiresVoting)',
    'function grantPermission(address user, bytes32 action, uint256 maxAmount, uint256 expiresAt) external',
    'function revokePermission(address user, bytes32 action) external',
    'function addCondition(address user, bytes32 action, bytes32 conditionType, uint256 value) external',
    'function removeCondition(address user, bytes32 action, uint256 conditionId) external',
    
    'event PermissionGranted(address indexed user, bytes32 indexed action, uint256 maxAmount, uint256 expiresAt)',
    'event PermissionRevoked(address indexed user, bytes32 indexed action)',
    'event ConditionAdded(address indexed user, bytes32 indexed action, bytes32 indexed conditionType, uint256 value)',
    'event ConditionRemoved(address indexed user, bytes32 indexed action, uint256 indexed conditionId)',
  ],
  
  VotingEngine: [
    'function createVote(string description, bytes32 data, string metadata, uint256 duration) external returns (uint256 voteId)',
    'function castVote(uint256 voteId, bool support, string reason) external',
    'function executeVote(uint256 voteId) external',
    'function getVoteDetails(uint256 voteId) external view returns (string description, uint256 forVotes, uint256 againstVotes, uint256 endTime, bool executed)',
    
    'event VoteCreated(uint256 indexed voteId, address indexed creator, string description, uint256 endTime)',
    'event VoteCast(uint256 indexed voteId, address indexed voter, bool support, string reason)',
    'event VoteExecuted(uint256 indexed voteId, bool passed)',
  ],
  
  ExecutionEngine: [
    'function executeSwap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, address recipient) external',
    'function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB, address recipient) external',
    'function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, address recipient) external',
    'function stake(address token, uint256 amount) external',
    'function unstake(address token, uint256 amount) external',
    
    'event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, address indexed recipient)',
    'event LiquidityAdded(address indexed tokenA, address indexed tokenB, uint256 amountA, uint256 amountB, address indexed recipient)',
    'event LiquidityRemoved(address indexed tokenA, address indexed tokenB, uint256 liquidity, address indexed recipient)',
    'event Staked(address indexed token, uint256 amount, address indexed staker)',
    'event Unstaked(address indexed token, uint256 amount, address indexed unstaker)',
  ],
} as const;

interface ContractServiceConfig {
  provider?: ethers.Provider;
  signer?: ethers.Signer;
}

class ContractService {
  private portfolioAgent: ethers.Contract | null = null;
  private permissionManager: ethers.Contract | null = null;
  private votingEngine: ethers.Contract | null = null;
  private executionEngine: ethers.Contract | null = null;
  private provider: ethers.Provider | null = null;
  private signer: ethers.Signer | null = null;

  constructor(config?: ContractServiceConfig) {
    if (config?.provider) {
      this.provider = config.provider;
    }
    if (config?.signer) {
      this.signer = config.signer;
    }
  }

  async initialize(provider?: ethers.Provider, signer?: ethers.Signer): Promise<void> {
    if (provider) {
      this.provider = provider;
    }
    if (signer) {
      this.signer = signer;
    }

    if (!this.provider) {
      throw new Error('Provider not available');
    }

    // Initialize contracts
    this.portfolioAgent = new ethers.Contract(
      CONTRACT_ADDRESSES.PortfolioAgent,
      CONTRACT_ABIS.PortfolioAgent,
      this.signer || this.provider
    );

    this.permissionManager = new ethers.Contract(
      CONTRACT_ADDRESSES.PermissionManager,
      CONTRACT_ABIS.PermissionManager,
      this.signer || this.provider
    );

    this.votingEngine = new ethers.Contract(
      CONTRACT_ADDRESSES.VotingEngine,
      CONTRACT_ABIS.VotingEngine,
      this.signer || this.provider
    );

    this.executionEngine = new ethers.Contract(
      CONTRACT_ADDRESSES.ExecutionEngine,
      CONTRACT_ABIS.ExecutionEngine,
      this.signer || this.provider
    );
  }

  // Portfolio Agent methods
  async getPortfolioPositions(userAddress: string): Promise<any[]> {
    if (!this.portfolioAgent) {
      throw new Error('PortfolioAgent contract not initialized');
    }
    
    return await this.portfolioAgent.getPortfolioPositions(userAddress);
  }

  async getPortfolioMetrics(userAddress: string): Promise<{
    totalValue: bigint;
    totalReturn: bigint;
    sharpeRatio: bigint;
  }> {
    if (!this.portfolioAgent) {
      throw new Error('PortfolioAgent contract not initialized');
    }
    
    return await this.portfolioAgent.getPortfolioMetrics(userAddress);
  }

  async hasPermission(userAddress: string, action: string): Promise<boolean> {
    if (!this.portfolioAgent) {
      throw new Error('PortfolioAgent contract not initialized');
    }
    
    const actionHash = ethers.keccak256(ethers.toUtf8Bytes(action));
    return await this.portfolioAgent.hasPermission(userAddress, actionHash);
  }

  async executeRebalancing(
    newPositions: any[],
    maxSlippage: number,
    deadline: number
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.portfolioAgent || !this.signer) {
      throw new Error('PortfolioAgent contract or signer not available');
    }

    const rebalanceParams = {
      newPositions,
      maxSlippage,
      deadline,
    };

    return await this.portfolioAgent.executeRebalancing(rebalanceParams);
  }

  async executeYieldOptimization(
    opportunity: any,
    amount: bigint
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.portfolioAgent || !this.signer) {
      throw new Error('PortfolioAgent contract or signer not available');
    }

    return await this.portfolioAgent.executeYieldOptimization(opportunity, amount);
  }

  async executeDCA(params: any): Promise<ethers.ContractTransactionResponse> {
    if (!this.portfolioAgent || !this.signer) {
      throw new Error('PortfolioAgent contract or signer not available');
    }

    return await this.portfolioAgent.executeDca(params);
  }

  // Permission Manager methods
  async checkPermission(
    userAddress: string,
    action: string,
    amount: bigint
  ): Promise<{ userHasPermission: boolean; requiresVoting: boolean }> {
    if (!this.permissionManager) {
      throw new Error('PermissionManager contract not initialized');
    }

    const actionHash = ethers.keccak256(ethers.toUtf8Bytes(action));
    return await this.permissionManager.checkPermission(userAddress, actionHash, amount);
  }

  async grantPermission(
    userAddress: string,
    action: string,
    maxAmount: bigint,
    expiresAt: number
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.permissionManager || !this.signer) {
      throw new Error('PermissionManager contract or signer not available');
    }

    const actionHash = ethers.keccak256(ethers.toUtf8Bytes(action));
    return await this.permissionManager.grantPermission(userAddress, actionHash, maxAmount, expiresAt);
  }

  async revokePermission(
    userAddress: string,
    action: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.permissionManager || !this.signer) {
      throw new Error('PermissionManager contract or signer not available');
    }

    const actionHash = ethers.keccak256(ethers.toUtf8Bytes(action));
    return await this.permissionManager.revokePermission(userAddress, actionHash);
  }

  // Voting Engine methods
  async createVote(
    description: string,
    data: string,
    metadata: string,
    duration: number
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.votingEngine || !this.signer) {
      throw new Error('VotingEngine contract or signer not available');
    }

    return await this.votingEngine.createVote(description, data, metadata, duration);
  }

  async castVote(
    voteId: bigint,
    support: boolean,
    reason: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.votingEngine || !this.signer) {
      throw new Error('VotingEngine contract or signer not available');
    }

    return await this.votingEngine.castVote(voteId, support, reason);
  }

  async getVoteDetails(voteId: bigint): Promise<any> {
    if (!this.votingEngine) {
      throw new Error('VotingEngine contract not initialized');
    }

    return await this.votingEngine.getVoteDetails(voteId);
  }

  // Execution Engine methods
  async executeSwap(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    minAmountOut: bigint,
    recipient: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.executionEngine || !this.signer) {
      throw new Error('ExecutionEngine contract or signer not available');
    }

    return await this.executionEngine.executeSwap(tokenIn, tokenOut, amountIn, minAmountOut, recipient);
  }

  async addLiquidity(
    tokenA: string,
    tokenB: string,
    amountA: bigint,
    amountB: bigint,
    recipient: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.executionEngine || !this.signer) {
      throw new Error('ExecutionEngine contract or signer not available');
    }

    return await this.executionEngine.addLiquidity(tokenA, tokenB, amountA, amountB, recipient);
  }

  async removeLiquidity(
    tokenA: string,
    tokenB: string,
    liquidity: bigint,
    recipient: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.executionEngine || !this.signer) {
      throw new Error('ExecutionEngine contract or signer not available');
    }

    return await this.executionEngine.removeLiquidity(tokenA, tokenB, liquidity, recipient);
  }

  async stake(token: string, amount: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.executionEngine || !this.signer) {
      throw new Error('ExecutionEngine contract or signer not available');
    }

    return await this.executionEngine.stake(token, amount);
  }

  async unstake(token: string, amount: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.executionEngine || !this.signer) {
      throw new Error('ExecutionEngine contract or signer not available');
    }

    return await this.executionEngine.unstake(token, amount);
  }

  // Event listeners
  onPortfolioRebalanced(callback: (user: string, oldPositions: any[], newPositions: any[], timestamp: bigint) => void) {
    if (!this.portfolioAgent) {
      throw new Error('PortfolioAgent contract not initialized');
    }

    return this.portfolioAgent.on('PortfolioRebalanced', callback);
  }

  onYieldOptimized(callback: (user: string, fromPool: string, toPool: string, amount: bigint, expectedApy: bigint) => void) {
    if (!this.portfolioAgent) {
      throw new Error('PortfolioAgent contract not initialized');
    }

    return this.portfolioAgent.on('YieldOptimized', callback);
  }

  onVoteCreated(callback: (voteId: bigint, creator: string, description: string, endTime: bigint) => void) {
    if (!this.votingEngine) {
      throw new Error('VotingEngine contract not initialized');
    }

    return this.votingEngine.on('VoteCreated', callback);
  }

  // Utility methods
  getContractAddresses() {
    return CONTRACT_ADDRESSES;
  }

  isInitialized(): boolean {
    return !!(
      this.portfolioAgent &&
      this.permissionManager &&
      this.votingEngine &&
      this.executionEngine
    );
  }
}

export const contractService = new ContractService();
export { ContractService };
