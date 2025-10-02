import { ethers } from 'ethers';
import { PortfolioRepository } from '../../repositories/PortfolioRepository';
import { TransactionRepository } from '../../repositories/TransactionRepository';
import { Position } from '../../types/Common';
import { Logger } from '../../utils/Logger';
import { ContractService } from '../blockchain/ContractService';
import { MonadClient } from '../blockchain/MonadClient';

export interface PositionManagerPosition {
  id: string;
  userId: string;
  token: string;
  symbol: string;
  amount: string;
  value: number;
  allocation: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercentage: number;
  riskScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PositionUpdate {
  token: string;
  amount: string;
  value: number;
  allocation: number;
  price: number;
  pnl: number;
  pnlPercentage: number;
}

export interface PositionMetrics {
  totalValue: number;
  totalPnl: number;
  totalPnlPercentage: number;
  diversificationScore: number;
  concentrationRisk: number;
  averageRiskScore: number;
  topPositions: Array<{
    token: string;
    symbol: string;
    allocation: number;
    pnl: number;
  }>;
}

export interface RebalanceAction {
  token: string;
  action: 'buy' | 'sell' | 'hold';
  currentAllocation: number;
  targetAllocation: number;
  amount: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

export class PositionManager {
  private static instance: PositionManager;
  private monadClient: MonadClient;
  private contractService: ContractService;
  private transactionRepository: TransactionRepository;
  private portfolioRepository: PortfolioRepository;
  private logger = Logger.getInstance();
  private positions: Map<string, Position> = new Map();

  private constructor() {
    this.monadClient = MonadClient.getInstance();
    this.contractService = ContractService.getInstance();
    this.transactionRepository = new TransactionRepository();
    this.portfolioRepository = new PortfolioRepository();
  }

  public static getInstance(): PositionManager {
    if (!PositionManager.instance) {
      PositionManager.instance = new PositionManager();
    }
    return PositionManager.instance;
  }

  /**
   * Get user positions
   */
  public async getUserPositions(userId: string): Promise<PositionManagerPosition[]> {
    try {
      this.logger.logEnvio('PositionManager', 'get_user_positions', { userId });

      // Get portfolio from database
      const portfolio = await this.portfolioRepository.findByUserId(userId);
      if (!portfolio) {
        return [];
      }

      // Convert portfolio positions to Position objects
      const positions: PositionManagerPosition[] = portfolio.positions.map((pos, index) => ({
        id: `pos_${userId}_${pos.token.address}`,
        userId,
        token: pos.token.address,
        symbol: pos.token.symbol,
        amount: pos.amount,
        value: typeof pos.value === 'string' ? parseFloat(pos.value) : pos.value,
        allocation: pos.allocation,
        entryPrice: 0, // Would calculate from historical data
        currentPrice: (typeof pos.value === 'string' ? parseFloat(pos.value) : pos.value) / parseFloat(pos.amount),
        pnl: 0, // Would calculate from entry price
        pnlPercentage: 0,
        riskScore: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      return positions;

    } catch (error) {
      this.logger.error('Failed to get user positions', error, { userId });
      return [];
    }
  }

  /**
   * Update position
   */
  public async updatePosition(
    userId: string,
    token: string,
    update: PositionUpdate
  ): Promise<PositionManagerPosition | null> {
    try {
      this.logger.logEnvio('PositionManager', 'update_position', { userId, token });

      // Get current portfolio
      const portfolio = await this.portfolioRepository.findByUserId(userId);
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      // Find and update position
      const positionIndex = portfolio.positions.findIndex(p => p.token.address === token);
      if (positionIndex === -1) {
        throw new Error('Position not found');
      }

      // Update position
      portfolio.positions[positionIndex] = {
        ...portfolio.positions[positionIndex],
        amount: update.amount,
        value: update.value,
        allocation: update.allocation
      };

      // Recalculate total value and allocations
      const totalValue = portfolio.positions.reduce((sum, pos) => sum + (typeof pos.value === 'string' ? parseFloat(pos.value) : pos.value), 0);
      
      // Update allocations to ensure they sum to 1
      portfolio.positions.forEach(pos => {
        pos.allocation = pos.value / totalValue;
      });

      // Update portfolio
      await this.portfolioRepository.updateMetrics(
        userId,
        totalValue.toString(),
        0 // Default risk score as number
      );

      // Create updated position object
      const position: PositionManagerPosition = {
        id: `pos_${userId}_${token}`,
        userId,
        token,
        symbol: this.getTokenSymbol(token),
        amount: update.amount,
        value: update.value,
        allocation: update.allocation,
        entryPrice: 0,
        currentPrice: update.price,
        pnl: update.pnl,
        pnlPercentage: update.pnlPercentage,
        riskScore: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.logger.logEnvio('PositionManager', 'position_updated', {
        userId,
        token,
        value: update.value,
        allocation: update.allocation
      });

      return position;

    } catch (error) {
      this.logger.error('Failed to update position', error, { userId, token });
      throw error;
    }
  }

  /**
   * Add new position
   */
  public async addPosition(
    userId: string,
    token: string,
    amount: string,
    value: string
  ): Promise<PositionManagerPosition> {
    try {
      this.logger.logEnvio('PositionManager', 'add_position', { userId, token, amount, value });

      // Get current portfolio
      const portfolio = await this.portfolioRepository.findByUserId(userId);
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      // Check if position already exists
      const existingPosition = portfolio.positions.find(p => p.token.address === token);
      if (existingPosition) {
        throw new Error('Position already exists');
      }

      // Add new position
      const newPosition = {
        token: { 
          address: token, 
          symbol: this.getTokenSymbol(token), 
          name: this.getTokenSymbol(token),
          decimals: 18,
          price: parseFloat(value) / parseFloat(amount)
        }, // Create TokenInfo object
        amount,
        value: parseFloat(value),
        allocation: 0, // Will be calculated after updating total value
        entryPrice: 0,
        currentPrice: parseFloat(value) / parseFloat(amount),
        pnl: 0,
        pnlPercentage: 0
      };

      portfolio.positions.push(newPosition);

      // Recalculate total value and allocations
      const totalValue = portfolio.positions.reduce((sum, pos) => sum + (typeof pos.value === 'string' ? parseFloat(pos.value) : pos.value), 0);
      
      // Update allocations
      portfolio.positions.forEach(pos => {
        pos.allocation = (typeof pos.value === 'string' ? parseFloat(pos.value) : pos.value) / totalValue;
      });

      // Update portfolio
      await this.portfolioRepository.updateMetrics(
        userId,
        totalValue.toString(),
        0 // Default risk score as number
      );

      // Create position object
      const position: PositionManagerPosition = {
        id: `pos_${userId}_${token}`,
        userId,
        token,
        symbol: this.getTokenSymbol(token),
        amount,
        value: parseFloat(value),
        allocation: parseFloat(value) / totalValue,
        entryPrice: 0,
        currentPrice: parseFloat(value) / parseFloat(amount),
        pnl: 0,
        pnlPercentage: 0,
        riskScore: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.logger.logEnvio('PositionManager', 'position_added', {
        userId,
        token,
        value,
        allocation: position.allocation
      });

      return position;

    } catch (error) {
      this.logger.error('Failed to add position', error, { userId, token });
      throw error;
    }
  }

  /**
   * Remove position
   */
  public async removePosition(
    userId: string,
    token: string
  ): Promise<boolean> {
    try {
      this.logger.logEnvio('PositionManager', 'remove_position', { userId, token });

      // Get current portfolio
      const portfolio = await this.portfolioRepository.findByUserId(userId);
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      // Find and remove position
      const positionIndex = portfolio.positions.findIndex(p => p.token.address === token);
      if (positionIndex === -1) {
        throw new Error('Position not found');
      }

      portfolio.positions.splice(positionIndex, 1);

      // Recalculate total value and allocations
      const totalValue = portfolio.positions.reduce((sum, pos) => sum + (typeof pos.value === 'string' ? parseFloat(pos.value) : pos.value), 0);
      
      // Update allocations
      portfolio.positions.forEach(pos => {
        pos.allocation = (typeof pos.value === 'string' ? parseFloat(pos.value) : pos.value) / totalValue;
      });

      // Update portfolio
      await this.portfolioRepository.updateMetrics(
        userId,
        totalValue.toString(),
        0 // Default risk score as number
      );

      this.logger.logEnvio('PositionManager', 'position_removed', { userId, token });
      return true;

    } catch (error) {
      this.logger.error('Failed to remove position', error, { userId, token });
      throw error;
    }
  }

  /**
   * Get position metrics
   */
  public async getPositionMetrics(userId: string): Promise<PositionMetrics> {
    try {
      this.logger.logEnvio('PositionManager', 'get_position_metrics', { userId });

      const positions = await this.getUserPositions(userId);
      
      const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
      const totalPnl = positions.reduce((sum, pos) => sum + pos.pnl, 0);
      const totalPnlPercentage = totalValue > 0 ? (totalPnl / totalValue) * 100 : 0;
      
      // Calculate diversification score (1 - HHI)
      const hhi = positions.reduce((sum, pos) => sum + Math.pow(pos.allocation, 2), 0);
      const diversificationScore = 1 - hhi;
      
      // Calculate concentration risk (max allocation)
      const concentrationRisk = Math.max(...positions.map(pos => pos.allocation));
      
      // Calculate average risk score
      const averageRiskScore = positions.length > 0 ? 
        positions.reduce((sum, pos) => sum + pos.riskScore, 0) / positions.length : 0;
      
      // Get top positions
      const topPositions = positions
        .sort((a, b) => b.allocation - a.allocation)
        .slice(0, 5)
        .map(pos => ({
          token: pos.token,
          symbol: pos.symbol,
          allocation: pos.allocation,
          pnl: pos.pnl
        }));

      return {
        totalValue,
        totalPnl,
        totalPnlPercentage,
        diversificationScore,
        concentrationRisk,
        averageRiskScore,
        topPositions
      };

    } catch (error) {
      this.logger.error('Failed to get position metrics', error, { userId });
      throw error;
    }
  }

  /**
   * Generate rebalance actions
   */
  public async generateRebalanceActions(
    userId: string,
    targetAllocations: Record<string, number>
  ): Promise<RebalanceAction[]> {
    try {
      this.logger.logEnvio('PositionManager', 'generate_rebalance_actions', { userId });

      const positions = await this.getUserPositions(userId);
      const actions: RebalanceAction[] = [];

      for (const position of positions) {
        const targetAllocation = targetAllocations[position.token] || 0;
        const currentAllocation = position.allocation;
        const difference = targetAllocation - currentAllocation;

        if (Math.abs(difference) > 0.01) { // 1% threshold
          const action: RebalanceAction = {
            token: position.token,
            action: difference > 0 ? 'buy' : 'sell',
            currentAllocation,
            targetAllocation,
            amount: Math.abs(difference * position.value).toString(),
            priority: Math.abs(difference) > 0.1 ? 'high' : Math.abs(difference) > 0.05 ? 'medium' : 'low',
            reason: `Rebalance to ${(targetAllocation * 100).toFixed(1)}% target allocation`
          };

          actions.push(action);
        }
      }

      // Sort by priority
      actions.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      this.logger.logEnvio('PositionManager', 'rebalance_actions_generated', {
        userId,
        actionCount: actions.length
      });

      return actions;

    } catch (error) {
      this.logger.error('Failed to generate rebalance actions', error, { userId });
      throw error;
    }
  }

  /**
   * Execute rebalance
   */
  public async executeRebalance(
    userId: string,
    actions: RebalanceAction[],
    wallet: ethers.Wallet
  ): Promise<{
    success: boolean;
    executedActions: number;
    totalGasUsed: string;
    totalFees: string;
    error?: string;
  }> {
    try {
      this.logger.logEnvio('PositionManager', 'execute_rebalance', {
        userId,
        actionCount: actions.length
      });

      let executedActions = 0;
      let totalGasUsed = 0;
      let totalFees = 0;

      for (const action of actions) {
        try {
          // Execute individual rebalance action
          const result = await this.executeRebalanceAction(action, wallet);
          
          if (result.success) {
            executedActions++;
            totalGasUsed += parseFloat(result.gasUsed || '0');
            totalFees += parseFloat(result.fee || '0');
          }

        } catch (error) {
          this.logger.warn('Failed to execute rebalance action', error, { action });
        }
      }

      // Update last rebalanced timestamp
      await this.portfolioRepository.updateLastRebalanced(userId);

      this.logger.logEnvio('PositionManager', 'rebalance_executed', {
        userId,
        executedActions,
        totalGasUsed,
        totalFees
      });

      return {
        success: executedActions > 0,
        executedActions,
        totalGasUsed: totalGasUsed.toString(),
        totalFees: totalFees.toString()
      };

    } catch (error) {
      this.logger.error('Failed to execute rebalance', error, { userId });
      return {
        success: false,
        executedActions: 0,
        totalGasUsed: '0',
        totalFees: '0',
        error: error instanceof Error ? error.message : 'Rebalance execution failed'
      };
    }
  }

  /**
   * Get position history
   */
  public async getPositionHistory(
    userId: string,
    token: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    history: Array<{
      timestamp: Date;
      amount: string;
      value: string;
      price: number;
      action: string;
    }>;
    total: number;
  }> {
    try {
      this.logger.logEnvio('PositionManager', 'get_position_history', { userId, token, limit, offset });

      // Get transaction history for the token
      const result = await this.transactionRepository.findByUserId(
        userId,
        limit,
        offset,
        { tokenAddress: token }
      );

      const history = result.transactions.map(tx => ({
        timestamp: tx.executedAt || new Date(),
        amount: tx.amount || '0',
        value: tx.metadata?.value || '0',
        price: parseFloat(tx.metadata?.price || '0'),
        action: tx.type
      }));

      return {
        history,
        total: result.total
      };

    } catch (error) {
      this.logger.error('Failed to get position history', error, { userId, token });
      throw error;
    }
  }

  // Private helper methods
  private async executeRebalanceAction(
    action: RebalanceAction,
    wallet: ethers.Wallet
  ): Promise<{
    success: boolean;
    gasUsed?: string;
    fee?: string;
    error?: string;
  }> {
    try {
      // This would execute the actual rebalance action
      // For now, simulate the execution
      const gasUsed = '150000';
      const gasPrice = await this.monadClient.getGasPrice();
      const fee = (BigInt(gasUsed) * BigInt(gasPrice)).toString();

      return {
        success: true,
        gasUsed,
        fee
      };

    } catch (error) {
      this.logger.error('Failed to execute rebalance action', error, { action });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Action execution failed'
      };
    }
  }

  private getTokenSymbol(tokenAddress: string): string {
    const symbols: Record<string, string> = {
      '0x...USDC': 'USDC',
      '0x...USDT': 'USDT',
      '0x...ETH': 'ETH',
      '0x...BTC': 'BTC'
    };
    return symbols[tokenAddress] || 'UNKNOWN';
  }
}
