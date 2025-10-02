import { ethers } from 'ethers';
import { TransactionType } from '../../models/Transaction';
import { TransactionRepository } from '../../repositories/TransactionRepository';
import { TransactionStatus } from '../../types/Common';
import { Logger } from '../../utils/Logger';
import { ContractService } from '../blockchain/ContractService';
import { MonadClient } from '../blockchain/MonadClient';

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOutMin: string;
  slippage: number;
  deadline: number;
  recipient: string;
  fee?: string;
}

export interface SwapQuote {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  priceImpact: number;
  fee: string;
  route: string[];
  gasEstimate: string;
  minimumReceived: string;
}

export interface SwapRoute {
  path: string[];
  pools: string[];
  fees: number[];
  totalFee: number;
}

export interface LiquidityPool {
  address: string;
  token0: string;
  token1: string;
  reserve0: string;
  reserve1: string;
  fee: number;
  liquidity: string;
  sqrtPriceX96: string;
  tick: number;
}

export class SwapService {
  private static instance: SwapService;
  private monadClient: MonadClient;
  private contractService: ContractService;
  private transactionRepository: TransactionRepository;
  private logger = Logger.getInstance();
  private dexContracts: Map<string, string> = new Map();

  private constructor() {
    this.monadClient = MonadClient.getInstance();
    this.contractService = ContractService.getInstance();
    this.transactionRepository = new TransactionRepository();
    this.initializeDexContracts();
  }

  public static getInstance(): SwapService {
    if (!SwapService.instance) {
      SwapService.instance = new SwapService();
    }
    return SwapService.instance;
  }

  /**
   * Get swap quote
   */
  public async getSwapQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    slippage: number = 0.5
  ): Promise<SwapQuote> {
    try {
      this.logger.logEnvio('SwapService', 'get_swap_quote', {
        tokenIn,
        tokenOut,
        amountIn,
        slippage
      });

      // Find best route
      const route = await this.findBestRoute(tokenIn, tokenOut, amountIn);
      
      // Calculate output amount
      const amountOut = await this.calculateOutputAmount(route, amountIn);
      
      // Calculate price impact
      const priceImpact = await this.calculatePriceImpact(tokenIn, tokenOut, amountIn, amountOut);
      
      // Calculate fees
      const fee = await this.calculateSwapFee(route, amountIn);
      
      // Estimate gas
      const gasEstimate = await this.estimateSwapGas(tokenIn, tokenOut, amountIn);
      
      // Calculate minimum received
      const minimumReceived = this.calculateMinimumReceived(amountOut, slippage);

      const quote: SwapQuote = {
        tokenIn,
        tokenOut,
        amountIn,
        amountOut,
        priceImpact,
        fee,
        route: route.path,
        gasEstimate,
        minimumReceived
      };

      this.logger.logEnvio('SwapService', 'quote_generated', {
        amountIn,
        amountOut,
        priceImpact,
        fee
      });

      return quote;

    } catch (error) {
      this.logger.error('Failed to get swap quote', error, { tokenIn, tokenOut });
      throw error;
    }
  }

  /**
   * Execute swap
   */
  public async executeSwap(
    params: SwapParams,
    wallet: ethers.Wallet
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    gasUsed?: string;
    fee?: string;
    error?: string;
  }> {
    try {
      this.logger.logEnvio('SwapService', 'execute_swap', {
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: params.amountIn,
        recipient: params.recipient
      });

      // Validate swap parameters
      await this.validateSwapParams(params);

      // Get swap quote
      const quote = await this.getSwapQuote(
        params.tokenIn,
        params.tokenOut,
        params.amountIn,
        params.slippage
      );

      // Check if minimum received is acceptable
      if (parseFloat(quote.amountOut) < parseFloat(params.amountOutMin)) {
        throw new Error('Insufficient output amount');
      }

      // Execute the swap
      const result = await this.performSwap(params, wallet);

      if (result.success && result.transactionHash) {
        // Save transaction to database
        await this.saveSwapTransaction(params, result, wallet.address);
      }

      this.logger.logEnvio('SwapService', 'swap_executed', {
        success: result.success,
        transactionHash: result.transactionHash,
        gasUsed: result.gasUsed
      });

      return result;

    } catch (error) {
      this.logger.error('Failed to execute swap', error, { params });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Swap execution failed'
      };
    }
  }

  /**
   * Get swap routes
   */
  public async getSwapRoutes(
    tokenIn: string,
    tokenOut: string,
    amountIn: string
  ): Promise<SwapRoute[]> {
    try {
      this.logger.logEnvio('SwapService', 'get_swap_routes', { tokenIn, tokenOut, amountIn });

      const routes: SwapRoute[] = [];

      // Direct route
      const directRoute = await this.getDirectRoute(tokenIn, tokenOut);
      if (directRoute) {
        routes.push(directRoute);
      }

      // Multi-hop routes
      const multiHopRoutes = await this.getMultiHopRoutes(tokenIn, tokenOut);
      routes.push(...multiHopRoutes);

      // Sort by total fee (ascending)
      routes.sort((a, b) => a.totalFee - b.totalFee);

      return routes;

    } catch (error) {
      this.logger.error('Failed to get swap routes', error, { tokenIn, tokenOut });
      return [];
    }
  }

  /**
   * Get liquidity pools
   */
  public async getLiquidityPools(
    token0?: string,
    token1?: string
  ): Promise<LiquidityPool[]> {
    try {
      this.logger.logEnvio('SwapService', 'get_liquidity_pools', { token0, token1 });

      // This would query actual DEX contracts for pool information
      // For now, return mock data
      const pools: LiquidityPool[] = [
        {
          address: '0x...',
          token0: '0x...USDC',
          token1: '0x...USDT',
          reserve0: '1000000',
          reserve1: '1000000',
          fee: 0.003,
          liquidity: '1000000',
          sqrtPriceX96: '79228162514264337593543950336',
          tick: 0
        },
        {
          address: '0x...',
          token0: '0x...ETH',
          token1: '0x...USDC',
          reserve0: '1000',
          reserve1: '2000000',
          fee: 0.003,
          liquidity: '1414213',
          sqrtPriceX96: '79228162514264337593543950336',
          tick: 0
        }
      ];

      // Filter by tokens if specified
      if (token0 && token1) {
        return pools.filter(pool => 
          (pool.token0 === token0 && pool.token1 === token1) ||
          (pool.token0 === token1 && pool.token1 === token0)
        );
      }

      return pools;

    } catch (error) {
      this.logger.error('Failed to get liquidity pools', error);
      return [];
    }
  }

  /**
   * Get swap history
   */
  public async getSwapHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    swaps: Array<{
      id: string;
      tokenIn: string;
      tokenOut: string;
      amountIn: string;
      amountOut: string;
      transactionHash: string;
      timestamp: Date;
      gasUsed: string;
      fee: string;
    }>;
    total: number;
  }> {
    try {
      this.logger.logEnvio('SwapService', 'get_swap_history', { userId, limit, offset });

      const result = await this.transactionRepository.findByUserId(
        userId,
        limit,
        offset,
        { type: TransactionType.SWAP }
      );

      const swaps = result.transactions.map(tx => ({
        id: (tx._id as any).toString(),
        tokenIn: tx.metadata?.tokenIn || '',
        tokenOut: tx.metadata?.tokenOut || '',
        amountIn: tx.amount || '0',
        amountOut: tx.metadata?.amountOut || '0',
        transactionHash: tx.transactionHash || '',
        timestamp: tx.executedAt || new Date(),
        gasUsed: tx.gasUsed || '0',
        fee: tx.fee || '0'
      }));

      return {
        swaps,
        total: result.total
      };

    } catch (error) {
      this.logger.error('Failed to get swap history', error, { userId });
      throw error;
    }
  }

  /**
   * Get swap statistics
   */
  public async getSwapStats(
    userId?: string,
    timeframe?: '1d' | '7d' | '30d'
  ): Promise<{
    totalSwaps: number;
    totalVolume: number;
    totalFees: number;
    averageGasUsed: number;
    successRate: number;
    topTokens: Array<{
      token: string;
      volume: number;
      count: number;
    }>;
  }> {
    try {
      this.logger.logEnvio('SwapService', 'get_swap_stats', { userId, timeframe });

      const stats = await this.transactionRepository.getStats(userId, timeframe);
      const volumeStats = await this.transactionRepository.getVolumeByToken(timeframe || '7d');

      return {
        totalSwaps: stats.totalTransactions,
        totalVolume: stats.totalVolume,
        totalFees: stats.totalFees,
        averageGasUsed: stats.averageGasUsed,
        successRate: stats.successRate,
        topTokens: volumeStats.map(token => ({
          token: token.token,
          volume: token.volume,
          count: token.transactionCount
        }))
      };

    } catch (error) {
      this.logger.error('Failed to get swap stats', error, { userId });
      throw error;
    }
  }

  // Private helper methods
  private initializeDexContracts(): void {
    this.dexContracts.set('uniswap', '0x...');
    this.dexContracts.set('sushiswap', '0x...');
    this.dexContracts.set('pancakeswap', '0x...');
  }

  private async findBestRoute(
    tokenIn: string,
    tokenOut: string,
    amountIn: string
  ): Promise<SwapRoute> {
    try {
      // This would implement actual routing algorithm
      // For now, return a simple direct route
      return {
        path: [tokenIn, tokenOut],
        pools: ['0x...'],
        fees: [0.003],
        totalFee: 0.003
      };

    } catch (error) {
      this.logger.error('Failed to find best route', error, { tokenIn, tokenOut });
      throw error;
    }
  }

  private async calculateOutputAmount(
    route: SwapRoute,
    amountIn: string
  ): Promise<string> {
    try {
      // This would calculate actual output using AMM formulas
      // For now, return a mock calculation
      const amountInNum = parseFloat(amountIn);
      const outputAmount = amountInNum * 0.99; // 1% fee
      return outputAmount.toString();

    } catch (error) {
      this.logger.error('Failed to calculate output amount', error);
      throw error;
    }
  }

  private async calculatePriceImpact(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    amountOut: string
  ): Promise<number> {
    try {
      // This would calculate actual price impact
      // For now, return a mock calculation
      return 0.1; // 0.1% price impact

    } catch (error) {
      this.logger.error('Failed to calculate price impact', error);
      return 0;
    }
  }

  private async calculateSwapFee(
    route: SwapRoute,
    amountIn: string
  ): Promise<string> {
    try {
      const amountInNum = parseFloat(amountIn);
      const fee = amountInNum * route.totalFee;
      return fee.toString();

    } catch (error) {
      this.logger.error('Failed to calculate swap fee', error);
      return '0';
    }
  }

  private async estimateSwapGas(
    tokenIn: string,
    tokenOut: string,
    amountIn: string
  ): Promise<string> {
    try {
      // This would estimate actual gas for swap
      // For now, return a mock estimate
      return '200000';

    } catch (error) {
      this.logger.error('Failed to estimate swap gas', error);
      return '200000';
    }
  }

  private calculateMinimumReceived(
    amountOut: string,
    slippage: number
  ): string {
    const amountOutNum = parseFloat(amountOut);
    const slippageAmount = amountOutNum * (slippage / 100);
    return (amountOutNum - slippageAmount).toString();
  }

  private async validateSwapParams(params: SwapParams): Promise<void> {
    if (!params.tokenIn || !params.tokenOut) {
      throw new Error('Invalid token addresses');
    }

    if (parseFloat(params.amountIn) <= 0) {
      throw new Error('Invalid amount');
    }

    if (params.slippage < 0 || params.slippage > 50) {
      throw new Error('Invalid slippage tolerance');
    }

    if (params.deadline <= Math.floor(Date.now() / 1000)) {
      throw new Error('Invalid deadline');
    }
  }

  private async performSwap(
    params: SwapParams,
    wallet: ethers.Wallet
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    gasUsed?: string;
    fee?: string;
    error?: string;
  }> {
    try {
      // This would interact with actual DEX contracts
      // For now, simulate the swap
      const gasEstimate = await this.monadClient.estimateGas({
        to: this.dexContracts.get('uniswap') || '0x...',
        from: wallet.address,
        value: '0',
        data: '0x...' // Swap function call data
      });

      const gasPrice = await this.monadClient.getGasPrice();
      const gasLimit = (BigInt(gasEstimate) * 120n / 100n).toString(); // 20% buffer

      // Simulate transaction
      const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
      const gasUsed = gasEstimate;
      const fee = (BigInt(gasUsed) * BigInt(gasPrice)).toString();

      return {
        success: true,
        transactionHash,
        gasUsed,
        fee
      };

    } catch (error) {
      this.logger.error('Failed to perform swap', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Swap execution failed'
      };
    }
  }

  private async saveSwapTransaction(
    params: SwapParams,
    result: any,
    fromAddress: string
  ): Promise<void> {
    try {
      if (result.transactionHash) {
        await this.transactionRepository.create({
          userId: '', // Would get from context
          type: TransactionType.SWAP,
          status: result.success ? TransactionStatus.COMPLETED : TransactionStatus.FAILED,
          transactionHash: result.transactionHash,
          amount: params.amountIn,
          tokenAddress: params.tokenIn,
          gasUsed: result.gasUsed,
          fee: result.fee,
          metadata: {
            priority: 'medium',
            tags: ['swap', 'dex'],
            description: `Swap ${params.tokenIn} for ${params.tokenOut}`,
            source: 'ai_recommendation',
            relatedTransactions: [],
            tokenIn: params.tokenIn,
            tokenOut: params.tokenOut,
            amountOut: params.amountOutMin
          }
        });
      }

    } catch (error) {
      this.logger.error('Failed to save swap transaction', error);
    }
  }

  private async getDirectRoute(
    tokenIn: string,
    tokenOut: string
  ): Promise<SwapRoute | null> {
    try {
      // Check if direct pool exists
      const pools = await this.getLiquidityPools(tokenIn, tokenOut);
      if (pools.length === 0) return null;

      const pool = pools[0];
      if (!pool) return null;
      
      return {
        path: [tokenIn, tokenOut],
        pools: [pool.address],
        fees: [pool.fee],
        totalFee: pool.fee
      };

    } catch (error) {
      this.logger.error('Failed to get direct route', error);
      return null;
    }
  }

  private async getMultiHopRoutes(
    tokenIn: string,
    tokenOut: string
  ): Promise<SwapRoute[]> {
    try {
      // This would implement multi-hop routing
      // For now, return empty array
      return [];

    } catch (error) {
      this.logger.error('Failed to get multi-hop routes', error);
      return [];
    }
  }

  private getTokenSymbol(tokenAddress: string): string {
    const symbols: Record<string, string> = {
      '0x...USDC': 'USDC',
      '0x...USDT': 'USDT',
      '0x...ETH': 'ETH'
    };
    return symbols[tokenAddress] || 'UNKNOWN';
  }
}
