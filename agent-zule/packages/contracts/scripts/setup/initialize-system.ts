import { ethers } from "hardhat";

async function main() {
  console.log("🔧 Initializing Agent Zule System...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Initializing with account:", deployer.address);

  // Get contract addresses from deployment
  const portfolioAgentAddress = process.env.PORTFOLIO_AGENT_ADDRESS;
  const permissionManagerAddress = process.env.PERMISSION_MANAGER_ADDRESS;
  const votingEngineAddress = process.env.VOTING_ENGINE_ADDRESS;
  const executionEngineAddress = process.env.EXECUTION_ENGINE_ADDRESS;

  if (!portfolioAgentAddress || !permissionManagerAddress || !votingEngineAddress || !executionEngineAddress) {
    console.error("❌ Missing contract addresses in environment variables");
    console.log("Please set the following environment variables:");
    console.log("- PORTFOLIO_AGENT_ADDRESS");
    console.log("- PERMISSION_MANAGER_ADDRESS");
    console.log("- VOTING_ENGINE_ADDRESS");
    console.log("- EXECUTION_ENGINE_ADDRESS");
    process.exit(1);
  }

  try {
    // Get contract instances
    const PortfolioAgent = await ethers.getContractFactory("PortfolioAgent");
    const PermissionManager = await ethers.getContractFactory("PermissionManager");
    const VotingEngine = await ethers.getContractFactory("VotingEngine");
    const ExecutionEngine = await ethers.getContractFactory("ExecutionEngine");

    const portfolioAgent = PortfolioAgent.attach(portfolioAgentAddress);
    const permissionManager = PermissionManager.attach(permissionManagerAddress);
    const votingEngine = VotingEngine.attach(votingEngineAddress);
    const executionEngine = ExecutionEngine.attach(executionEngineAddress);

    console.log("📊 Setting up system parameters...");

    // 1. Configure risk parameters
    console.log("1. Configuring risk parameters...");
    await portfolioAgent.updateRiskParameters(5000, 3000); // 50% volatility, 30% drawdown
    console.log("✅ Risk parameters configured");

    // 2. Set up voting parameters
    console.log("2. Configuring voting parameters...");
    await votingEngine.updateVotingParameters(3000, 5000); // 30% quorum, 50% support required
    console.log("✅ Voting parameters configured");

    // 3. Register default strategies
    console.log("3. Registering default strategies...");
    
    // Register yield optimization strategy
    const yieldStrategyId = ethers.keccak256(ethers.toUtf8Bytes("YIELD_OPTIMIZATION"));
    const yieldStrategyConfig = {
      strategyId: yieldStrategyId,
      strategyContract: executionEngineAddress,
      isActive: true,
      maxGasLimit: 500000,
      maxSlippage: 1000, // 10%
      cooldownPeriod: 300 // 5 minutes
    };
    await executionEngine.registerStrategy(yieldStrategyId, executionEngineAddress, yieldStrategyConfig);
    console.log("✅ Yield optimization strategy registered");

    // Register DCA strategy
    const dcaStrategyId = ethers.keccak256(ethers.toUtf8Bytes("DCA_STRATEGY"));
    const dcaStrategyConfig = {
      strategyId: dcaStrategyId,
      strategyContract: executionEngineAddress,
      isActive: true,
      maxGasLimit: 300000,
      maxSlippage: 500, // 5%
      cooldownPeriod: 60 // 1 minute
    };
    await executionEngine.registerStrategy(dcaStrategyId, executionEngineAddress, dcaStrategyConfig);
    console.log("✅ DCA strategy registered");

    // 4. Add conditional rules
    console.log("4. Adding conditional rules...");
    
    // Volatility rule
    const volatilityRuleId = ethers.keccak256(ethers.toUtf8Bytes("VOLATILITY_RULE"));
    const volatilityRule = {
      ruleId: volatilityRuleId,
      condition: ethers.keccak256(ethers.toUtf8Bytes("VOLATILITY_GT_THRESHOLD")),
      threshold: 5000, // 50%
      autoRevoke: true,
      escalateToVoting: false,
      gracePeriod: 300 // 5 minutes
    };
    await permissionManager.addConditionalRule(volatilityRule);
    console.log("✅ Volatility rule added");

    // Drawdown rule
    const drawdownRuleId = ethers.keccak256(ethers.toUtf8Bytes("DRAWDOWN_RULE"));
    const drawdownRule = {
      ruleId: drawdownRuleId,
      condition: ethers.keccak256(ethers.toUtf8Bytes("DRAWDOWN_GT_THRESHOLD")),
      threshold: 3000, // 30%
      autoRevoke: true,
      escalateToVoting: true,
      gracePeriod: 600 // 10 minutes
    };
    await permissionManager.addConditionalRule(drawdownRule);
    console.log("✅ Drawdown rule added");

    // 5. Grant initial permissions
    console.log("5. Granting initial permissions...");
    
    // Grant rebalancing permission to deployer
    const rebalanceAction = ethers.keccak256(ethers.toUtf8Bytes("REBALANCE"));
    const rebalanceConfig = {
      user: deployer.address,
      action: rebalanceAction,
      threshold: 5000, // 50%
      cooldown: 3600, // 1 hour
      isActive: true,
      requiresVoting: false,
      maxAmount: ethers.parseEther("10000"), // 10,000 tokens
      riskTolerance: 500 // 50%
    };
    await permissionManager.grantPermission(rebalanceConfig);
    console.log("✅ Rebalancing permission granted");

    // Grant yield optimization permission
    const yieldAction = ethers.keccak256(ethers.toUtf8Bytes("YIELD_OPTIMIZE"));
    const yieldConfig = {
      user: deployer.address,
      action: yieldAction,
      threshold: 3000, // 30%
      cooldown: 1800, // 30 minutes
      isActive: true,
      requiresVoting: false,
      maxAmount: ethers.parseEther("5000"), // 5,000 tokens
      riskTolerance: 300 // 30%
    };
    await permissionManager.grantPermission(yieldConfig);
    console.log("✅ Yield optimization permission granted");

    // 6. Create initial vote
    console.log("6. Creating initial governance vote...");
    const voteDescription = "Initial system configuration vote";
    const voteActionType = ethers.keccak256(ethers.toUtf8Bytes("SYSTEM_CONFIG"));
    const voteData = ethers.toUtf8Bytes("Initial system setup");
    const voteDuration = 86400; // 24 hours

    await votingEngine.createVote(voteDescription, voteActionType, voteData, voteDuration);
    console.log("✅ Initial governance vote created");

    console.log("\n🎉 Agent Zule System Initialization Complete!");
    console.log("=====================================");
    console.log("System Status: ✅ Ready");
    console.log("Risk Parameters: ✅ Configured");
    console.log("Voting System: ✅ Active");
    console.log("Strategies: ✅ Registered");
    console.log("Permissions: ✅ Granted");
    console.log("Governance: ✅ Initialized");
    console.log("=====================================");

    console.log("\n🚀 Next Steps:");
    console.log("1. Test the system with sample transactions");
    console.log("2. Deploy to Monad testnet");
    console.log("3. Integrate with frontend and backend");
    console.log("4. Connect to Envio for real-time data");

  } catch (error) {
    console.error("❌ System initialization failed:", error);
    process.exit(1);
  }
}

// Execute initialization
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
