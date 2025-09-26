# Agent Zule Envio Indexer

This is the Envio indexer for Agent Zule, an AI-powered portfolio rebalancing agent. The indexer monitors blockchain events and processes them for real-time portfolio management.

## Features

- **Portfolio Events**: Monitors portfolio rebalancing, creation, updates, and deletions
- **Permission Events**: Tracks permission changes, grants, revocations, and updates
- **Trade Events**: Monitors trade execution, failures, pending states, and completions
- **Cross-chain Events**: Tracks cross-chain transfers, completions, failures, and pending states
- **DEX Events**: Monitors liquidity additions/removals, swaps, and pool operations
- **Market Events**: Tracks market data updates, price changes, volume, and volatility
- **Health Events**: Monitors system health, status updates, errors, and performance
- **Stats Events**: Tracks statistics, metrics, performance, and health updates

## Project Structure

```
envio/
├── config.yaml          # Envio indexer configuration
├── schema.graphql        # GraphQL schema for queries
├── src/
│   ├── handlers/        # Event handlers for different event types
│   │   ├── portfolio.ts
│   │   ├── permissions.ts
│   │   ├── trades.ts
│   │   ├── crosschain.ts
│   │   ├── dex.ts
│   │   ├── market.ts
│   │   ├── health.ts
│   │   ├── stats.ts
│   │   └── index.ts
│   ├── services/        # Services for data processing
│   │   ├── PortfolioService.ts
│   │   ├── RecommendationService.ts
│   │   ├── TradeService.ts
│   │   ├── CrossChainService.ts
│   │   ├── DexService.ts
│   │   ├── MarketDataService.ts
│   │   ├── HealthService.ts
│   │   ├── StatsService.ts
│   │   └── index.ts
│   ├── generated/       # Generated types from contract ABI
│   │   ├── PortfolioAgent.ts
│   │   └── index.ts
│   └── index.ts         # Main entry point
├── package.json
├── tsconfig.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Envio CLI
- TypeScript

### Installation

```bash
npm install
```

### Configuration

1. Update `config.yaml` with your network and contract details
2. Configure your database connection
3. Set up your event handlers

### Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the indexer
npm start

# Run in development mode
npm run dev
```

### Testing

```bash
# Run tests
npm test

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

## Event Handlers

### Portfolio Handlers
- `handlePortfolioRebalanced`: Handles portfolio rebalancing events
- `handlePortfolioCreated`: Handles portfolio creation events
- `handlePortfolioUpdated`: Handles portfolio update events
- `handlePortfolioDeleted`: Handles portfolio deletion events

### Permission Handlers
- `handlePermissionChanged`: Handles permission change events
- `handlePermissionGranted`: Handles permission grant events
- `handlePermissionRevoked`: Handles permission revocation events
- `handlePermissionUpdated`: Handles permission update events

### Trade Handlers
- `handleTradeExecuted`: Handles trade execution events
- `handleTradeFailed`: Handles trade failure events
- `handleTradePending`: Handles trade pending events
- `handleTradeCompleted`: Handles trade completion events

### Cross-chain Handlers
- `handleCrossChainInitiated`: Handles cross-chain initiation events
- `handleCrossChainCompleted`: Handles cross-chain completion events
- `handleCrossChainFailed`: Handles cross-chain failure events
- `handleCrossChainPending`: Handles cross-chain pending events

### DEX Handlers
- `handleLiquidityAdded`: Handles liquidity addition events
- `handleLiquidityRemoved`: Handles liquidity removal events
- `handleSwapExecuted`: Handles swap execution events
- `handlePoolCreated`: Handles pool creation events
- `handlePoolUpdated`: Handles pool update events

### Market Handlers
- `handleMarketDataUpdated`: Handles market data update events
- `handlePriceUpdated`: Handles price update events
- `handleVolumeUpdated`: Handles volume update events
- `handleVolatilityUpdated`: Handles volatility update events

### Health Handlers
- `handleHealthCheck`: Handles health check events
- `handleStatusUpdate`: Handles status update events
- `handleErrorReport`: Handles error report events
- `handlePerformanceUpdate`: Handles performance update events

### Stats Handlers
- `handleStatsUpdated`: Handles stats update events
- `handleMetricsUpdated`: Handles metrics update events
- `handlePerformanceUpdated`: Handles performance update events
- `handleHealthUpdated`: Handles health update events

## Services

### PortfolioService
Handles portfolio-related operations and data processing.

### RecommendationService
Handles recommendation-related operations and data processing.

### TradeService
Handles trade-related operations and data processing.

### CrossChainService
Handles cross-chain-related operations and data processing.

### DexService
Handles DEX-related operations and data processing.

### MarketDataService
Handles market data-related operations and data processing.

### HealthService
Handles health-related operations and data processing.

### StatsService
Handles stats-related operations and data processing.

## GraphQL Schema

The indexer provides a comprehensive GraphQL schema for querying:

- Portfolio events and metrics
- Recommendation events and statistics
- Trade events and statistics
- Cross-chain events and statistics
- DEX events and liquidity pools
- Market data and price history
- Health status and system stats

## Real-time Updates

The indexer supports real-time updates via WebSocket connections for:

- Portfolio updates
- Recommendation alerts
- Trade notifications
- Cross-chain updates
- Market data updates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
