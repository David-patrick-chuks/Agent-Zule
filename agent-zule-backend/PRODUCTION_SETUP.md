# 🚀 Agent Zule Backend - Production Setup Guide

## Overview
Agent Zule Backend is now production-ready with real blockchain data integration! No more mock data - this connects to actual APIs and blockchain networks.

## 🔧 Production Features

### ✅ Real Data Sources
- **CoinGecko API** - Live cryptocurrency prices and market data
- **Blockchain RPC** - Direct connection to Ethereum and Monad networks
- **DEXScreener API** - Real-time DEX trading data
- **Fear & Greed Index** - Market sentiment data
- **Envio Platform** - Professional blockchain indexing

### ✅ Production Services
- **Real-time Socket.io** - Live portfolio updates
- **Blockchain Indexer** - Monitors on-chain events
- **Price Feeds** - Live market data with caching
- **Health Monitoring** - Service status checks
- **Error Handling** - Graceful fallbacks

## 🌐 Required Environment Variables

### Core Configuration
```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/agent-zule-prod
JWT_SECRET=your-super-secure-jwt-secret-min-32-characters

# Server
PORT=3001
NODE_ENV=production
HOST=0.0.0.0
```

### Blockchain Networks
```bash
# Ethereum Mainnet (Alchemy/Infura recommended)
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETHEREUM_CHAIN_ID=1

# Monad Testnet
MONAD_RPC_URL=https://testnet.monad.xyz
MONAD_CHAIN_ID=123456789
```

### External APIs
```bash
# CoinGecko (Optional Pro API key for higher rate limits)
COINGECKO_API_KEY=your-coingecko-pro-api-key

# Envio Platform
ENVIO_API_KEY=your-envio-api-key
ENVIO_GRAPHQL_URL=https://api.envio.dev/graphql
```

### Security & Performance
```bash
# CORS
CORS_ORIGIN=https://your-frontend-domain.com
FRONTEND_URL=https://your-frontend-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🚀 Deployment Steps

### 1. Environment Setup
```bash
# Copy your existing .env and add production values
cp .env .env.production

# Update with real API keys and endpoints
nano .env.production
```

### 2. Install Dependencies
```bash
npm install --production
```

### 3. Build Application
```bash
npm run build
```

### 4. Start Production Server
```bash
npm start
```

## 📊 API Endpoints

### Health & Status
- `GET /health` - Basic health check
- `GET /api/v1/health` - Detailed health status
- `GET /api/v1/indexer/status` - Blockchain indexer status
- `POST /api/v1/indexer/trigger` - Manual indexing trigger

### Real-time Features
- **Socket.io** on same port as HTTP server
- **Live portfolio updates** every 10 seconds
- **Real-time price feeds** with 30-second caching
- **Market data updates** with live Fear & Greed index

## 🔍 Monitoring & Debugging

### Service Health Checks
The backend automatically monitors:
- ✅ CoinGecko API connectivity
- ✅ Ethereum RPC connection
- ✅ Monad RPC connection  
- ✅ Database connectivity
- ✅ Envio platform status

### Logging
- **Production logs** in `./logs/agent-zule.log`
- **Error tracking** with structured JSON logging
- **Performance metrics** for API calls
- **Real-time monitoring** via Socket.io stats

### Debug Endpoints
```bash
# Check service health
curl https://your-api.com/api/v1/health

# Check indexer status
curl https://your-api.com/api/v1/indexer/status

# Trigger manual data refresh
curl -X POST https://your-api.com/api/v1/indexer/trigger
```

## 🎯 Performance Optimizations

### Caching Strategy
- **Price data**: 30-second cache
- **Market data**: 30-second cache
- **Historical data**: 5-minute cache
- **Blockchain events**: Real-time with 10-second polling

### Rate Limiting
- **CoinGecko**: Respects API limits with fallbacks
- **Blockchain RPC**: Connection pooling
- **Socket.io**: Per-user rate limiting
- **API endpoints**: 100 requests per 15 minutes

## 🔐 Security Features

### Production Security
- **Helmet.js** - Security headers
- **CORS** - Configured for your frontend domain
- **Rate limiting** - Prevents API abuse
- **Input validation** - All endpoints validated
- **JWT authentication** - Secure user sessions

### Environment Security
- **No hardcoded secrets** - All via environment variables
- **Secure defaults** - Production-safe configurations
- **Error handling** - No sensitive data in error responses

## 🎉 Ready for Hackathon Judging!

Your Agent Zule Backend is now **production-ready** with:

✅ **Real blockchain data** from Ethereum and Monad  
✅ **Live cryptocurrency prices** from CoinGecko  
✅ **Real-time DEX data** from multiple sources  
✅ **Professional indexing** via Envio platform  
✅ **WebSocket real-time updates** for portfolio changes  
✅ **Comprehensive monitoring** and health checks  
✅ **Production security** and performance optimizations  

## 🏆 Hackathon Prize Alignment

This production setup targets:
- **Best Use of Envio ($2,000)** - Real Envio platform integration
- **Best AI Agent ($1,500)** - Production-ready AI with real data
- **Envio Bonus ($1,000)** - Live blockchain indexing
- **Most Innovative Use of Delegations ($500)** - Real permission system

**No more mock data - this is the real deal!** 🚀
