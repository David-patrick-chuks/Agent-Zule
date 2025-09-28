# Agent Zule Smart Contracts - Testing Guide

This guide covers testing and deployment of the Agent Zule smart contracts.

## 🏗️ Contract Architecture

### Core Contracts
- **PortfolioAgent** - Main orchestrator for AI portfolio management
- **PermissionManager** - Manages conditional permissions and delegations
- **VotingEngine** - Handles community voting on recommendations
- **ExecutionEngine** - Executes trades and portfolio operations

### Supporting Contracts
- **YieldOptimizer** - AI-powered yield optimization strategies
- **BridgeManager** - Cross-chain asset management

## 🧪 Testing Commands

### Run All Tests
```bash
npm run test
```

### Run Specific Contract Tests
```bash
# Test PortfolioAgent contract
npm run test:portfolio

# Test PermissionManager contract
npm run test:permissions

# Run all contract tests
npm run test:all
```

### Verbose Testing
```bash
# Detailed test output
npm run test:verbose

# Gas usage report
npm run test:gas

# Test coverage report
npm run test:coverage
```

## 🔧 Contract Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Contracts
```bash
npm run build
```

### 3. Environment Setup
Create `.env` file:
```env
PRIVATE_KEY=your-private-key-for-testing
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
ETHERSCAN_API_KEY=your-etherscan-api-key
```

## 🚀 Deployment Commands

### Deploy to Local Network
```bash
npm run deploy:local
```

### Deploy to Monad Testnet
```bash
npm run deploy:testnet
```

### Deploy to Monad Mainnet
```bash
npm run deploy:mainnet
```

## 📋 Test Coverage

### PortfolioAgent Tests
- ✅ Contract initialization
- ✅ Portfolio position management
- ✅ Portfolio metrics calculation
- ✅ Permission checking
- ✅ Risk parameter updates
- ✅ Emergency stop functionality
- ✅ Portfolio rebalancing execution
- ✅ Yield optimization execution
- ✅ DCA strategy execution
- ✅ Cooldown mechanisms
- ✅ Parameter validation
- ✅ Role-based access control

### PermissionManager Tests
- ✅ Permission granting and revocation
- ✅ Permission expiration
- ✅ Amount limits
- ✅ Condition management
- ✅ Voting requirements
- ✅ Auto-revoke on high volatility
- ✅ Emergency operations
- ✅ Batch operations
- ✅ Permission history

## 🔍 Key Test Scenarios

### 1. Portfolio Management Flow
```solidity
// Test complete portfolio management workflow
function testCompletePortfolioFlow() public {
    // 1. Grant permissions to AI agent
    // 2. Create portfolio positions
    // 3. Execute rebalancing
    // 4. Verify position updates
    // 5. Check portfolio metrics
}
```

### 2. Permission Delegation Flow
```solidity
// Test permission delegation workflow
function testPermissionDelegationFlow() public {
    // 1. Grant permissions with conditions
    // 2. Test permission validation
    // 3. Test automatic revocation
    // 4. Test permission renewal
}
```

### 3. Emergency Scenarios
```solidity
// Test emergency response mechanisms
function testEmergencyScenarios() public {
    // 1. Activate emergency stop
    // 2. Verify all operations are halted
    // 3. Test emergency permission revocation
    // 4. Test recovery procedures
}
```

## 🛠️ Development Workflow

### 1. Write Tests First (TDD)
```bash
# Create new test file
touch test/NewContract.t.sol

# Write tests
# Run tests
npm run test:verbose
```

### 2. Implement Contracts
```bash
# Create contract file
touch src/new/NewContract.sol

# Implement functionality
# Run tests
npm run test
```

### 3. Deploy and Verify
```bash
# Deploy to testnet
npm run deploy:testnet

# Verify contracts
npm run verify
```

## 📊 Gas Optimization

### Check Contract Sizes
```bash
npm run size
```

### Gas Usage Analysis
```bash
npm run test:gas
```

### Optimization Tips
- Use `uint256` for calculations
- Pack structs efficiently
- Minimize storage operations
- Use events for off-chain data

## 🔒 Security Testing

### Common Vulnerabilities to Test
- ✅ Reentrancy attacks
- ✅ Integer overflow/underflow
- ✅ Access control bypass
- ✅ Front-running attacks
- ✅ Oracle manipulation
- ✅ Emergency stop bypass

### Security Best Practices
- Use OpenZeppelin contracts
- Implement proper access controls
- Add emergency stop mechanisms
- Validate all inputs
- Use safe math operations

## 🐛 Debugging Tests

### Verbose Output
```bash
forge test -vvv
```

### Debug Specific Test
```bash
forge test --match-test testSpecificFunction -vvv
```

### Gas Traces
```bash
forge test --gas-report
```

## 📝 Test Data Management

### Mock Data Setup
```solidity
function setUp() public {
    // Create test accounts
    owner = makeAddr("owner");
    user = makeAddr("user");
    
    // Deploy contracts
    // Setup initial state
}
```

### Test Utilities
```solidity
// Helper functions for testing
function createMockToken() internal returns (address) {
    return makeAddr("mockToken");
}

function createMockPool() internal returns (address) {
    return makeAddr("mockPool");
}
```

## 🚨 Common Issues and Solutions

### Issue: Tests Failing
**Solutions:**
- Check contract compilation
- Verify test setup
- Check for missing dependencies
- Review test logic

### Issue: Deployment Failing
**Solutions:**
- Check RPC URL
- Verify private key
- Ensure sufficient balance
- Check network connectivity

### Issue: Gas Estimation Failing
**Solutions:**
- Optimize contract code
- Reduce contract size
- Use libraries for common functions
- Implement efficient data structures

## 📈 Performance Monitoring

### Test Execution Time
```bash
time npm run test
```

### Memory Usage
```bash
npm run test:coverage
```

### Contract Size Monitoring
```bash
npm run size
```

## 🔄 Continuous Integration

### GitHub Actions Setup
```yaml
name: Contract Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1
      - name: Run Tests
        run: npm run test:all
```

## 📚 Additional Resources

- [Foundry Documentation](https://book.getfoundry.sh/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Solidity Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [Gas Optimization Guide](https://ethereum.org/en/developers/docs/gas/)

---

## 🎯 Next Steps

1. **Run Tests**: `npm run test:all`
2. **Deploy to Testnet**: `npm run deploy:testnet`
3. **Update Frontend**: Use deployed addresses
4. **Integration Testing**: Test with frontend/backend
5. **Security Audit**: Professional audit recommended
6. **Mainnet Deployment**: After thorough testing

Happy testing! 🚀
