import * as tf from '@tensorflow/tfjs-node';
import { Logger } from '../../utils/Logger';
import { EnvioIndexerService } from '../envio/EnvioIndexerService';

export interface MarketPrediction {
  token: string;
  symbol: string;
  currentPrice: number;
  predictedPrice: number;
  priceChange: number;
  priceChangePercentage: number;
  confidence: number;
  timeframe: '1h' | '4h' | '1d' | '1w';
  factors: {
    technical: number;
    sentiment: number;
    volume: number;
    volatility: number;
  };
  timestamp: Date;
}

export interface TrendAnalysis {
  trend: 'bullish' | 'bearish' | 'sideways';
  strength: number; // 0-1
  duration: number; // hours
  support: number;
  resistance: number;
  confidence: number;
}

export interface MarketSignal {
  type: 'buy' | 'sell' | 'hold';
  strength: 'weak' | 'medium' | 'strong';
  reasoning: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  timeframe: string;
}

export class MarketPredictor {
  private static instance: MarketPredictor;
  private logger = Logger.getInstance();
  private envioService: EnvioIndexerService;
  private model: tf.LayersModel | null = null;
  private isModelLoaded = false;

  private constructor() {
    this.envioService = EnvioIndexerService.getInstance();
  }

  public static getInstance(): MarketPredictor {
    if (!MarketPredictor.instance) {
      MarketPredictor.instance = new MarketPredictor();
    }
    return MarketPredictor.instance;
  }

  /**
   * Initialize the ML model for price prediction
   */
  public async initializeModel(): Promise<void> {
    try {
      this.logger.logAI('MarketPredictor', 'model_initialization_started', {});

      // Create a simple LSTM model for price prediction
      this.model = tf.sequential({
        layers: [
          tf.layers.lstm({
            units: 50,
            returnSequences: true,
            inputShape: [60, 1] // 60 time steps, 1 feature (price)
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.lstm({
            units: 50,
            returnSequences: false
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 25 }),
          tf.layers.dense({ units: 1 })
        ]
      });

      this.model.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError',
        metrics: ['meanAbsoluteError']
      });

      this.isModelLoaded = true;
      this.logger.logAI('MarketPredictor', 'model_initialized', {
        parameters: this.model.countParams()
      });

    } catch (error) {
      this.logger.error('Failed to initialize MarketPredictor model', error);
      throw error;
    }
  }

  /**
   * Predict price movements for multiple tokens
   */
  public async predictPriceMovements(
    tokens: string[],
    timeframe: '1h' | '4h' | '1d' | '1w' = '1d'
  ): Promise<MarketPrediction[]> {
    try {
      this.logger.logAI('MarketPredictor', 'prediction_started', {
        tokenCount: tokens.length,
        timeframe
      });

      if (!this.isModelLoaded) {
        await this.initializeModel();
      }

      const predictions: MarketPrediction[] = [];

      for (const token of tokens) {
        try {
          const prediction = await this.predictTokenPrice(token, timeframe);
          predictions.push(prediction);
        } catch (error) {
          this.logger.warn(`Failed to predict price for token ${token}`, error);
        }
      }

      this.logger.logAI('MarketPredictor', 'predictions_completed', {
        successfulPredictions: predictions.length,
        totalTokens: tokens.length
      });

      return predictions;

    } catch (error) {
      this.logger.error('Failed to predict price movements', error);
      throw error;
    }
  }

  /**
   * Analyze market trends for a token
   */
  public async analyzeTrend(
    token: string,
    timeframe: '1h' | '4h' | '1d' | '1w' = '1d'
  ): Promise<TrendAnalysis> {
    try {
      this.logger.logAI('MarketPredictor', 'trend_analysis_started', {
        token,
        timeframe
      });

      // Get historical data
      const historicalData = await this.getHistoricalData(token, timeframe);
      
      if (historicalData.length < 10) {
        throw new Error('Insufficient historical data for trend analysis');
      }

      // Calculate trend indicators
      const sma20 = this.calculateSMA(historicalData, 20);
      const sma50 = this.calculateSMA(historicalData, 50);
      const rsi = this.calculateRSI(historicalData);
      const macd = this.calculateMACD(historicalData);

      // Determine trend
      const currentPrice = historicalData[historicalData.length - 1].price;
      const trend = this.determineTrend(currentPrice, sma20, sma50, rsi, macd);
      
      // Calculate support and resistance
      const support = this.calculateSupport(historicalData);
      const resistance = this.calculateResistance(historicalData);

      // Calculate trend strength
      const strength = this.calculateTrendStrength(historicalData, trend.trend);

      const analysis: TrendAnalysis = {
        trend: trend.trend,
        strength,
        duration: this.calculateTrendDuration(historicalData, trend.trend),
        support,
        resistance,
        confidence: trend.confidence
      };

      this.logger.logAI('MarketPredictor', 'trend_analysis_completed', {
        token,
        trend: analysis.trend,
        strength: analysis.strength,
        confidence: analysis.confidence
      });

      return analysis;

    } catch (error) {
      this.logger.error('Failed to analyze trend', error, { token });
      throw error;
    }
  }

  /**
   * Generate trading signals based on technical analysis
   */
  public async generateSignals(
    token: string,
    timeframe: '1h' | '4h' | '1d' | '1w' = '1d'
  ): Promise<MarketSignal[]> {
    try {
      this.logger.logAI('MarketPredictor', 'signal_generation_started', {
        token,
        timeframe
      });

      const signals: MarketSignal[] = [];

      // Get trend analysis
      const trendAnalysis = await this.analyzeTrend(token, timeframe);
      
      // Get price prediction
      const pricePrediction = await this.predictTokenPrice(token, timeframe);

      // Generate buy signal
      if (trendAnalysis.trend === 'bullish' && 
          trendAnalysis.strength > 0.6 && 
          pricePrediction.priceChangePercentage > 5) {
        signals.push({
          type: 'buy',
          strength: trendAnalysis.strength > 0.8 ? 'strong' : 'medium',
          reasoning: `Bullish trend detected with ${(trendAnalysis.strength * 100).toFixed(1)}% strength and predicted ${pricePrediction.priceChangePercentage.toFixed(2)}% price increase`,
          confidence: Math.min(trendAnalysis.confidence * pricePrediction.confidence, 0.95),
          riskLevel: pricePrediction.priceChangePercentage > 20 ? 'high' : 'medium',
          timeframe
        });
      }

      // Generate sell signal
      if (trendAnalysis.trend === 'bearish' && 
          trendAnalysis.strength > 0.6 && 
          pricePrediction.priceChangePercentage < -5) {
        signals.push({
          type: 'sell',
          strength: trendAnalysis.strength > 0.8 ? 'strong' : 'medium',
          reasoning: `Bearish trend detected with ${(trendAnalysis.strength * 100).toFixed(1)}% strength and predicted ${pricePrediction.priceChangePercentage.toFixed(2)}% price decrease`,
          confidence: Math.min(trendAnalysis.confidence * pricePrediction.confidence, 0.95),
          riskLevel: pricePrediction.priceChangePercentage < -20 ? 'high' : 'medium',
          timeframe
        });
      }

      // Generate hold signal if no clear trend
      if (signals.length === 0) {
        signals.push({
          type: 'hold',
          strength: 'weak',
          reasoning: `No clear trend detected. Market appears ${trendAnalysis.trend} with ${(trendAnalysis.strength * 100).toFixed(1)}% strength`,
          confidence: 0.5,
          riskLevel: 'low',
          timeframe
        });
      }

      this.logger.logAI('MarketPredictor', 'signals_generated', {
        token,
        signalCount: signals.length,
        signals: signals.map(s => ({ type: s.type, strength: s.strength }))
      });

      return signals;

    } catch (error) {
      this.logger.error('Failed to generate signals', error, { token });
      throw error;
    }
  }

  /**
   * Predict market volatility
   */
  public async predictVolatility(
    token: string,
    timeframe: '1h' | '4h' | '1d' | '1w' = '1d'
  ): Promise<{
    currentVolatility: number;
    predictedVolatility: number;
    volatilityTrend: 'increasing' | 'decreasing' | 'stable';
    confidence: number;
  }> {
    try {
      const historicalData = await this.getHistoricalData(token, timeframe);
      
      if (historicalData.length < 20) {
        throw new Error('Insufficient data for volatility prediction');
      }

      // Calculate current volatility (20-period rolling standard deviation)
      const returns = this.calculateReturns(historicalData);
      const currentVolatility = this.calculateVolatility(returns.slice(-20));

      // Predict future volatility using GARCH-like model
      const predictedVolatility = this.predictFutureVolatility(returns);

      const volatilityTrend = predictedVolatility > currentVolatility * 1.1 ? 'increasing' :
                             predictedVolatility < currentVolatility * 0.9 ? 'decreasing' : 'stable';

      return {
        currentVolatility,
        predictedVolatility,
        volatilityTrend,
        confidence: this.calculatePredictionConfidence(historicalData, currentVolatility, predictedVolatility)
      };

    } catch (error) {
      this.logger.error('Failed to predict volatility', error, { token });
      throw error;
    }
  }

  // Private helper methods
  private async predictTokenPrice(
    token: string,
    timeframe: '1h' | '4h' | '1d' | '1w'
  ): Promise<MarketPrediction> {
    try {
      // Get current price
      const currentPrices = await this.envioService.getTokenPrices([token]);
      const currentPrice = currentPrices[0]?.price || 0;
      
      // Get historical data
      const historicalData = await this.getHistoricalData(token, timeframe);
      
      if (historicalData.length < 60) {
        throw new Error('Insufficient historical data for prediction');
      }

      // Prepare data for model
      const prices = historicalData.map(d => d.price);
      const normalizedPrices = this.normalizeData(prices);
      
      // Create input tensor
      const inputData = normalizedPrices.slice(-60); // Last 60 data points
      const inputTensor = tf.tensor3d([inputData.map(x => [x])], [1, 60, 1]);

      // Make prediction
      const prediction = this.model!.predict(inputTensor) as tf.Tensor;
      const predictedValue = await prediction.data();
      
      // Denormalize prediction
      const predictedPrice = this.denormalizeData([predictedValue[0]], prices)[0];
      
      // Calculate confidence based on model performance
      const confidence = this.calculatePredictionConfidence(historicalData, predictedPrice);

      // Clean up tensors
      inputTensor.dispose();
      prediction.dispose();

      return {
        token,
        symbol: token, // Would get from token metadata
        currentPrice,
        predictedPrice,
        priceChange: predictedPrice - currentPrice,
        priceChangePercentage: ((predictedPrice - currentPrice) / currentPrice) * 100,
        confidence,
        timeframe,
        factors: {
          technical: 0.7,
          sentiment: 0.5,
          volume: 0.6,
          volatility: 0.4
        },
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to predict token price', error, { token });
      throw error;
    }
  }

  private async getHistoricalData(
    token: string,
    timeframe: '1h' | '4h' | '1d' | '1w'
  ): Promise<Array<{ price: number; timestamp: Date; volume: number }>> {
    // Get historical prices from Envio
    const days = timeframe === '1h' ? 7 : timeframe === '4h' ? 30 : timeframe === '1d' ? 90 : 365;
    const tokenPrices = await this.envioService.getHistoricalPrices(token, days);
    return tokenPrices.map(p => ({
      price: p.price,
      timestamp: p.timestamp,
      volume: p.volume24h
    }));
  }

  private calculateSMA(data: Array<{ price: number }>, period: number): number {
    if (data.length < period) return data[data.length - 1].price;
    
    const recentPrices = data.slice(-period).map(d => d.price);
    return recentPrices.reduce((sum, price) => sum + price, 0) / period;
  }

  private calculateRSI(data: Array<{ price: number }>, period: number = 14): number {
    if (data.length < period + 1) return 50;

    const prices = data.map(d => d.price);
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(data: Array<{ price: number }>): { macd: number; signal: number; histogram: number } {
    const prices = data.map(d => d.price);
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    const signal = this.calculateEMA([macd], 9);
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    if (prices.length === 1) return prices[0];

    const multiplier = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  private determineTrend(
    currentPrice: number,
    sma20: number,
    sma50: number,
    rsi: number,
    macd: { macd: number; signal: number }
  ): { trend: 'bullish' | 'bearish' | 'sideways'; confidence: number } {
    let bullishSignals = 0;
    let bearishSignals = 0;

    // SMA signals
    if (currentPrice > sma20) bullishSignals++;
    else bearishSignals++;

    if (sma20 > sma50) bullishSignals++;
    else bearishSignals++;

    // RSI signals
    if (rsi > 50 && rsi < 70) bullishSignals++;
    else if (rsi < 50 && rsi > 30) bearishSignals++;

    // MACD signals
    if (macd.macd > macd.signal) bullishSignals++;
    else bearishSignals++;

    const totalSignals = bullishSignals + bearishSignals;
    const confidence = Math.abs(bullishSignals - bearishSignals) / totalSignals;

    if (bullishSignals > bearishSignals) {
      return { trend: 'bullish', confidence };
    } else if (bearishSignals > bullishSignals) {
      return { trend: 'bearish', confidence };
    } else {
      return { trend: 'sideways', confidence: 0.3 };
    }
  }

  private calculateSupport(data: Array<{ price: number }>): number {
    const prices = data.map(d => d.price);
    return Math.min(...prices.slice(-20));
  }

  private calculateResistance(data: Array<{ price: number }>): number {
    const prices = data.map(d => d.price);
    return Math.max(...prices.slice(-20));
  }

  private calculateTrendStrength(data: Array<{ price: number }>, trend: string): number {
    const prices = data.map(d => d.price);
    const recentPrices = prices.slice(-10);
    
    let consistentDirection = 0;
    for (let i = 1; i < recentPrices.length; i++) {
      const change = recentPrices[i] - recentPrices[i - 1];
      if ((trend === 'bullish' && change > 0) || 
          (trend === 'bearish' && change < 0)) {
        consistentDirection++;
      }
    }

    return consistentDirection / (recentPrices.length - 1);
  }

  private calculateTrendDuration(data: Array<{ price: number; timestamp: Date }>, trend: string): number {
    if (data.length < 2) return 0;
    
    // Calculate actual trend duration based on data
    let trendStart = 0;
    let currentTrend = trend;
    
    for (let i = 1; i < data.length; i++) {
      const priceChange = data[i].price - data[i-1].price;
      const currentDirection = priceChange > 0 ? 'bullish' : priceChange < 0 ? 'bearish' : 'sideways';
      
      if (currentDirection !== currentTrend) {
        break;
      }
      trendStart = i;
    }
    
    // Convert to hours (assuming hourly data)
    return data.length - trendStart;
  }

  private calculateReturns(data: Array<{ price: number }>): number[] {
    const returns: number[] = [];
    for (let i = 1; i < data.length; i++) {
      returns.push((data[i].price - data[i - 1].price) / data[i - 1].price);
    }
    return returns;
  }

  private calculatePredictionConfidence(
    data: Array<{ price: number; timestamp: Date }>,
    currentVolatility: number,
    predictedVolatility: number
  ): number;
  private calculatePredictionConfidence(
    data: Array<{ price: number; timestamp: Date }>,
    predictedPrice: number
  ): number;
  private calculatePredictionConfidence(
    data: Array<{ price: number; timestamp: Date }>,
    currentVolatilityOrPredictedPrice: number,
    predictedVolatility?: number
  ): number {
    if (data.length < 10) return 0.3; // Low confidence with little data
    
    if (predictedVolatility !== undefined) {
      // Volatility prediction case
      const dataQuality = Math.min(data.length / 100, 1); // More data = higher confidence
      const volatilityConsistency = 1 - Math.abs(currentVolatilityOrPredictedPrice - predictedVolatility) / currentVolatilityOrPredictedPrice;
      const trendConsistency = this.calculateTrendConsistency(data);
      
      // Weighted average of confidence factors
      const confidence = (dataQuality * 0.4 + volatilityConsistency * 0.4 + trendConsistency * 0.2);
      
      return Math.max(0.1, Math.min(0.95, confidence)); // Cap between 10% and 95%
    } else {
      // Price prediction case
      const recentPrices = data.slice(-10).map(d => d.price);
      const avgPrice = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
      const priceDeviation = Math.abs(currentVolatilityOrPredictedPrice - avgPrice) / avgPrice;
      
      // Lower deviation = higher confidence
      return Math.max(0.3, Math.min(0.95, 1 - priceDeviation));
    }
  }

  private calculateTrendConsistency(data: Array<{ price: number; timestamp: Date }>): number {
    if (data.length < 3) return 0.5;
    
    let consistentMoves = 0;
    let totalMoves = 0;
    
    for (let i = 1; i < data.length; i++) {
      const priceChange = data[i].price - data[i-1].price;
      if (Math.abs(priceChange) > 0.001) { // Only count significant moves
        totalMoves++;
        
        // Check if move is consistent with recent trend
        if (i > 1) {
          const prevChange = data[i-1].price - data[i-2].price;
          if ((priceChange > 0 && prevChange > 0) || (priceChange < 0 && prevChange < 0)) {
            consistentMoves++;
          }
        }
      }
    }
    
    return totalMoves > 0 ? consistentMoves / totalMoves : 0.5;
  }

  private calculateVolatility(returns: number[]): number {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private predictFutureVolatility(returns: number[]): number {
    // Simple volatility prediction using recent volatility
    const recentVolatility = this.calculateVolatility(returns.slice(-10));
    return recentVolatility * (1 + Math.random() * 0.2 - 0.1); // Add some randomness
  }

  private normalizeData(data: number[]): number[] {
    const min = Math.min(...data);
    const max = Math.max(...data);
    return data.map(value => (value - min) / (max - min));
  }

  private denormalizeData(normalizedData: number[], originalData: number[]): number[] {
    const min = Math.min(...originalData);
    const max = Math.max(...originalData);
    return normalizedData.map(value => value * (max - min) + min);
  }

}
