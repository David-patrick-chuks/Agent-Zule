import mongoose from 'mongoose';
import { Logger } from '../utils/Logger';

export class DatabaseConfig {
  private static instance: DatabaseConfig;
  private logger = Logger.getInstance();
  private isConnected = false;

  private constructor() {}

  public static getInstance(): DatabaseConfig {
    if (!DatabaseConfig.instance) {
      DatabaseConfig.instance = new DatabaseConfig();
    }
    return DatabaseConfig.instance;
  }

  public async connect(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not set');
      }

      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        bufferMaxEntries: 0,
        retryWrites: true,
        retryReads: true,
      };

      await mongoose.connect(mongoUri, options);

      this.isConnected = true;
      this.logger.info('Successfully connected to MongoDB');

      // Set up connection event listeners
      mongoose.connection.on('error', (error) => {
        this.logger.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        this.logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        this.logger.info('MongoDB reconnected');
        this.isConnected = true;
      });

      mongoose.connection.on('close', () => {
        this.logger.warn('MongoDB connection closed');
        this.isConnected = false;
      });

    } catch (error) {
      this.logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      this.isConnected = false;
      this.logger.info('Disconnected from MongoDB');
    } catch (error) {
      this.logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public isConnectionActive(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  public getConnectionState(): string {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[mongoose.connection.readyState as keyof typeof states] || 'unknown';
  }

  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    connectionState: string;
    isConnected: boolean;
    uptime: number;
  }> {
    try {
      // Ping the database
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        connectionState: this.getConnectionState(),
        isConnected: this.isConnectionActive(),
        uptime: process.uptime()
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        connectionState: this.getConnectionState(),
        isConnected: false,
        uptime: process.uptime()
      };
    }
  }

  public async createIndexes(): Promise<void> {
    try {
      // Import all models to ensure indexes are created
      await import('../models/User');
      await import('../models/Portfolio');
      await import('../models/Recommendation');
      await import('../models/Permission');
      await import('../models/Transaction');

      this.logger.info('Database indexes created successfully');
    } catch (error) {
      this.logger.error('Failed to create database indexes:', error);
      throw error;
    }
  }

  public async dropDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot drop database in production environment');
    }

    try {
      await mongoose.connection.db.dropDatabase();
      this.logger.info('Database dropped successfully');
    } catch (error) {
      this.logger.error('Failed to drop database:', error);
      throw error;
    }
  }

  public async seedDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot seed database in production environment');
    }

    try {
      // Import seed data
      const { seedUsers } = await import('../seeds/UserSeed');
      const { seedPortfolios } = await import('../seeds/PortfolioSeed');
      const { seedPermissions } = await import('../seeds/PermissionSeed');

      await seedUsers();
      await seedPortfolios();
      await seedPermissions();

      this.logger.info('Database seeded successfully');
    } catch (error) {
      this.logger.error('Failed to seed database:', error);
      throw error;
    }
  }
}
