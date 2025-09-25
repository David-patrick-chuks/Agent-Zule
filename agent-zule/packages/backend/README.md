# Agent Zule Backend

🤖 **AI-Powered Portfolio Rebalancing Agent Backend**  
🏆 **Hackathon Project** - Targeting $5,500 in prizes  
⚡ **Built for Monad Testnet with Envio Integration**

## 🎯 Project Overview

Agent Zule is an AI-powered portfolio rebalancing agent built as a Farcaster Frame for automated, community-driven portfolio management on Monad. This backend serves as the brain of the system, powering all AI decisions with real-time Envio data.

### 🏆 Prize Strategy Alignment

- **Best AI Agent ($1,500)** - AI portfolio analysis, yield optimization, DCA strategies
- **Best Use of Envio ($2,000)** - Custom indexer, HyperSync APIs, GraphQL queries  
- **Envio Bonus ($1,000)** - Real-time data drives all AI decisions
- **Most Innovative Use of Delegations ($500)** - Conditional permissions system
- **Best Farcaster Mini App ($500)** - Social integration and community voting

## 🚀 Core Features

### 1. AI Agent Engine
- **PortfolioAnalyzer**: Continuous portfolio analysis and optimization
- **YieldOptimizer**: Identifies and migrates to higher-yield opportunities  
- **DCAManager**: Implements dollar-cost averaging strategies
- **RiskAssessor**: Dynamic risk assessment and position sizing

### 2. Envio Integration
- **EnvioIndexerService**: Tracks DeFi events, token prices, user positions
- **HyperSyncService**: Real-time market data and yield information
- **GraphQLService**: Portfolio analysis and market insights
- **CrossChainMonitorService**: Monitors opportunities across chains

### 3. Conditional Permissions System
- **Dynamic Permissions**: Adapt in real-time based on market conditions
- **Auto-Revoke**: Automatically revokes permissions during high volatility
- **Community Voting**: Integration with community decision making
- **Risk Thresholds**: AI-proposed permission adjustments

### 4. Database Layer
- **MongoDB**: Portfolio data, user preferences, AI recommendations
- **Repository Pattern**: Clean data access layer
- **Real-time Updates**: Live portfolio tracking and AI decision history

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **AI/ML**: TensorFlow.js for portfolio analysis
- **Blockchain**: Ethers.js for Monad integration
- **Indexing**: Envio HyperIndex/HyperSync
- **Authentication**: JWT with MetaMask Smart Accounts
- **Logging**: Winston with structured logging
- **Testing**: Jest with comprehensive coverage

## 📁 Project Structure

```
src/
├── controllers/           # API Controllers
│   ├── PortfolioController.ts
│   ├── RecommendationController.ts
│   ├── PermissionController.ts
│   ├── ExecutionController.ts
│   └── HealthController.ts
├── services/             # Business Logic Services
│   ├── ai/               # AI Agent Services
│   │   ├── PortfolioAnalyzer.ts
│   │   ├── YieldOptimizer.ts
│   │   ├── DCAManager.ts
│   │   └── RiskAssessor.ts
│   ├── envio/            # Envio Integration
│   │   ├── EnvioIndexerService.ts
│   │   ├── HyperSyncService.ts
│   │   └── GraphQLService.ts
│   ├── permissions/      # Permission Management
│   │   ├── PermissionManager.ts
│   │   └── AutoRevokeService.ts
│   └── blockchain/       # Blockchain Services
│       ├── MonadClient.ts
│       └── ContractService.ts
├── repositories/         # Data Access Layer
│   ├── UserRepository.ts
│   ├── PortfolioRepository.ts
│   ├── RecommendationRepository.ts
│   └── PermissionRepository.ts
├── models/               # MongoDB Models
│   ├── User.ts
│   ├── Portfolio.ts
│   ├── Recommendation.ts
│   ├── Permission.ts
│   └── Transaction.ts
├── middleware/           # Express Middleware
│   ├── AuthMiddleware.ts
│   ├── ValidationMiddleware.ts
│   ├── ErrorMiddleware.ts
│   └── LoggingMiddleware.ts
├── config/               # Configuration
│   ├── DatabaseConfig.ts
│   ├── EnvioConfig.ts
│   └── AppConfig.ts
├── types/                # TypeScript Types
│   ├── Common.ts
│   ├── Portfolio.ts
│   ├── Recommendation.ts
│   └── Permission.ts
├── utils/                # Utility Classes
│   ├── Logger.ts
│   ├── Validator.ts
│   └── CryptoUtils.ts
├── app.ts                # Express App Setup
└── index.ts              # Application Bootstrap
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB (local or Atlas)
- Envio API Key
- Monad Testnet RPC URL

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp env.example .env

# Configure environment variables
# Edit .env with your MongoDB URI, Envio API key, etc.

# Start development server
npm run dev
```

### Environment Configuration

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/agent-zule

# Envio Integration
ENVIO_API_KEY=your-envio-api-key
ENVIO_GRAPHQL_URL=https://api.envio.dev/graphql

# Monad Configuration  
MONAD_RPC_URL=https://testnet.monad.xyz
MONAD_CHAIN_ID=123456789

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key

# AI Configuration
AI_CONFIDENCE_THRESHOLD=0.8
AI_MAX_RECOMMENDATIONS=10
```

## 📊 API Endpoints

### Portfolio Management
- `GET /api/v1/portfolios` - Get user portfolios
- `POST /api/v1/portfolios` - Create new portfolio
- `GET /api/v1/portfolios/:id/analysis` - AI portfolio analysis
- `GET /api/v1/portfolios/:id/history` - Portfolio history

### AI Recommendations
- `GET /api/v1/recommendations` - Get AI recommendations
- `POST /api/v1/recommendations/:id/approve` - Approve recommendation
- `POST /api/v1/recommendations/:id/vote` - Community voting

### Permission Management
- `GET /api/v1/permissions` - Get user permissions
- `POST /api/v1/permissions` - Create permission
- `PUT /api/v1/permissions/:id` - Update permission
- `DELETE /api/v1/permissions/:id` - Revoke permission

### AI Agent Operations
- `POST /api/v1/ai/analyze` - Portfolio analysis
- `POST /api/v1/ai/optimize-yield` - Yield optimization
- `POST /api/v1/ai/dca-strategy` - DCA strategy creation
- `POST /api/v1/ai/risk-assessment` - Risk assessment

## 🤖 AI Services

### PortfolioAnalyzer
```typescript
const analyzer = PortfolioAnalyzer.getInstance();
const analysis = await analyzer.analyzePortfolio(portfolio, {
  includeRiskAssessment: true,
  includePerformanceMetrics: true,
  includeRebalancingRecommendations: true
});
```

### YieldOptimizer
```typescript
const optimizer = YieldOptimizer.getInstance();
const optimization = await optimizer.optimizeYield(portfolio, {
  minApyThreshold: 0.05,
  maxRiskLevel: 'medium',
  includeLiquidityPools: true
});
```

### DCAManager
```typescript
const dcaManager = DCAManager.getInstance();
const strategy = await dcaManager.createStrategy(portfolioId, token, {
  amountPerExecution: '100',
  frequency: 'daily',
  volatilityThreshold: 0.3
});
```

### RiskAssessor
```typescript
const riskAssessor = RiskAssessor.getInstance();
const assessment = await riskAssessor.assessPortfolioRisk(portfolio, marketData);
const alerts = await riskAssessor.generateRiskAlerts(portfolio, marketData);
```

## 🔗 Envio Integration

### Custom Indexer
```typescript
const indexer = EnvioIndexerService.getInstance();

// Get user DeFi events
const events = await indexer.getUserDeFiEvents(userAddress);

// Get token prices
const prices = await indexer.getTokenPrices(tokenAddresses);

// Get yield opportunities
const farms = await indexer.getYieldFarms(minApy, maxRisk);
```

### GraphQL Queries
```graphql
query GetPortfolioAnalysis($portfolioId: String!) {
  portfolioAnalysis(portfolioId: $portfolioId) {
    overallScore
    riskAssessment {
      score
      level
      factors
    }
    rebalancingRecommendations {
      type
      token
      amount
      expectedImpact
    }
  }
}
```

## 🔐 Permission System

### Conditional Permissions
```typescript
// Dynamic permission that adapts to market conditions
const permission = {
  type: 'portfolio_rebalancing',
  conditions: [
    {
      type: 'volatility_threshold',
      parameters: { threshold: 0.3 },
      action: 'restrict'
    },
    {
      type: 'community_consensus',
      parameters: { minVotes: 3 },
      action: 'escalate'
    }
  ]
};
```

### Auto-Revoke System
```typescript
// Automatically revoke permissions during high volatility
if (marketData.volatility > autoRevokeThreshold) {
  await permission.revoke('High volatility detected', 'system');
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm test -- --testPathPattern=services/ai
```

## 📈 Performance Monitoring

### Logging
```typescript
// Structured logging for all operations
logger.logAI('PortfolioAnalyzer', 'analysis_completed', {
  portfolioId,
  duration: 1500,
  confidence: 0.85
});

logger.logEnvio('graphql_query', {
  query: 'GetTokenPrices',
  duration: 200,
  resultCount: 25
});
```

### Health Checks
```bash
# Application health
GET /health

# Database health
GET /api/v1/health/database

# Envio health
GET /api/v1/health/envio

# AI services health
GET /api/v1/health/ai
```

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Variables for Production
```bash
NODE_ENV=production
MONGODB_URI=mongodb://mongodb:27017/agent-zule
ENVIO_API_KEY=prod-envio-key
JWT_SECRET=production-secret-key
LOG_LEVEL=info
```

## 🏆 Demo Video Scenes

### Scene 4: Automated Execution (45 seconds)
- AI executes approved trades
- Real-time portfolio rebalancing
- Cross-chain opportunity execution
- Envio data visualizations

### Scene 5: Envio Integration (30 seconds)
- Custom indexer dashboard
- GraphQL query demonstrations
- Real-time market data feeds
- Cross-chain monitoring interface

## 🔧 Development

### Code Style
- TypeScript strict mode
- ESLint with TypeScript rules
- Prettier for code formatting
- Husky for git hooks

### Git Workflow
```bash
# Feature branch
git checkout -b feature/ai-portfolio-analyzer

# Commit with conventional commits
git commit -m "feat(ai): add portfolio risk assessment"

# Push and create PR
git push origin feature/ai-portfolio-analyzer
```

## 📚 Documentation

- **API Documentation**: `/docs` (Swagger UI)
- **GraphQL Playground**: `/graphql`
- **Health Dashboard**: `/health`
- **Metrics**: `/metrics`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🎯 Success Metrics

- ✅ Class-based architecture with proper separation of concerns
- ✅ Repository pattern implemented for all data operations
- ✅ Service layer with dependency injection
- ✅ Controller pattern with proper error handling
- ✅ MongoDB stores all portfolio and user data with proper models
- ✅ Envio services track all required data with real-time updates
- ✅ AI service classes generate accurate recommendations
- ✅ API endpoints respond correctly with proper validation
- ✅ Cross-chain monitoring works with modular services
- ✅ Conditional permissions adapt to market conditions
- ✅ Real-time updates via Socket.io with proper event handling
- ✅ Comprehensive test coverage (unit, integration, e2e)
- ✅ Proper logging and monitoring throughout the application

---

**This backend package is the brain of Agent Zule, powering all AI decisions with real-time Envio data and providing comprehensive APIs for the frontend. It's designed to win $5,500 across 5 different prize categories by combining cutting-edge AI, innovative permissions, social integration, and comprehensive data infrastructure! 🏆**
