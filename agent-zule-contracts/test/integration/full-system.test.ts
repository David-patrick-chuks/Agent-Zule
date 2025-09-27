import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("Agent Zule Full System Integration", function () {
  let portfolioAgent: Contract;
  let permissionManager: Contract;
  let votingEngine: Contract;
  let executionEngine: Contract;
  let bridgeManager: Contract;
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    // Deploy all contracts in order
    console.log("🚀 Deploying Agent Zule system...");

    // 1. Deploy VotingEngine
    const VotingEngine = await ethers.getContractFactory("VotingEngine");
    votingEngine = await VotingEngine.deploy(ethers.ZeroAddress);
    await votingEngine.waitForDeployment();
    console.log("✅ VotingEngine deployed");

    // 2. Deploy PermissionManager
    const PermissionManager = await ethers.getContractFactory("PermissionManager");
    permissionManager = await PermissionManager.deploy(await votingEngine.getAddress());
    await permissionManager.waitForDeployment();
    console.log("✅ PermissionManager deployed");

    // 3. Deploy ExecutionEngine
    const ExecutionEngine = await ethers.getContractFactory("ExecutionEngine");
    executionEngine = await ExecutionEngine.deploy();
    await executionEngine.waitForDeployment();
    console.log("✅ ExecutionEngine deployed");

    // 4. Deploy BridgeManager
    const BridgeManager = await ethers.getContractFactory("BridgeManager");
    bridgeManager = await BridgeManager.deploy();
    await bridgeManager.waitForDeployment();
    console.log("✅ BridgeManager deployed");

    // 5. Deploy PortfolioAgent
    const PortfolioAgent = await ethers.getContractFactory("PortfolioAgent");
    portfolioAgent = await PortfolioAgent.deploy(
      await permissionManager.getAddress(),
      await votingEngine.getAddress(),
      await executionEngine.getAddress()
    );
    await portfolioAgent.waitForDeployment();
    console.log("✅ PortfolioAgent deployed");

    // Set up roles and permissions
    await _setupSystemRoles();
    console.log("✅ System roles configured");
  });

  async function _setupSystemRoles() {
    // Grant AI_AGENT_ROLE to PortfolioAgent
    const AI_AGENT_ROLE = await permissionManager.AI_AGENT_ROLE();
    await permissionManager.grantRole(AI_AGENT_ROLE, await portfolioAgent.getAddress());

    // Grant VOTER_ROLE to deployer
    const VOTER_ROLE = await votingEngine.VOTER_ROLE();
    await votingEngine.grantRole(VOTER_ROLE, deployer.address);

    // Grant EXECUTOR_ROLE to PortfolioAgent
    const EXECUTOR_ROLE = await executionEngine.EXECUTOR_ROLE();
    await executionEngine.grantRole(EXECUTOR_ROLE, await portfolioAgent.getAddress());

    // Grant BRIDGE_OPERATOR_ROLE to deployer
    const BRIDGE_OPERATOR_ROLE = await bridgeManager.BRIDGE_OPERATOR_ROLE();
    await bridgeManager.grantRole(BRIDGE_OPERATOR_ROLE, deployer.address);
  }

  describe("System Integration", function () {
    it("Should have all contracts properly connected", async function () {
      // Check PortfolioAgent connections
      expect(await portfolioAgent.permissionManager()).to.equal(await permissionManager.getAddress());
      expect(await portfolioAgent.votingEngine()).to.equal(await votingEngine.getAddress());
      expect(await portfolioAgent.executionEngine()).to.equal(await executionEngine.getAddress());

      // Check PermissionManager connection
      expect(await permissionManager.votingEngine()).to.equal(await votingEngine.getAddress());
    });

    it("Should allow end-to-end permission flow", async function () {
      const action = ethers.keccak256(ethers.toUtf8Bytes("REBALANCE"));
      
      // 1. Grant permission to user1
      const config = {
        user: user1.address,
        action: action,
        threshold: 5000, // 50%
        cooldown: 3600, // 1 hour
        isActive: true,
        requiresVoting: false,
        maxAmount: ethers.parseEther("1000"),
        riskTolerance: 500 // 50%
      };

      await permissionManager.grantPermission(config);

      // 2. Check permission
      const [hasPermission, requiresVoting] = await permissionManager.checkPermission(
        user1.address,
        action,
        ethers.parseEther("500")
      );

      expect(hasPermission).to.be.true;
      expect(requiresVoting).to.be.false;
    });

    it("Should allow end-to-end voting flow", async function () {
      // 1. Create a vote
      const description = "Test vote for system integration";
      const actionType = ethers.keccak256(ethers.toUtf8Bytes("TEST_ACTION"));
      const data = ethers.toUtf8Bytes("test data");
      const duration = 3600; // 1 hour

      const voteId = await votingEngine.createVote.staticCall(
        description,
        actionType,
        data,
        duration
      );

      await votingEngine.createVote(description, actionType, data, duration);

      // 2. Cast a vote
      await votingEngine.castVote(voteId, true, "Supporting the test vote");

      // 3. Check vote result
      const vote = await votingEngine.getVote(voteId);
      expect(vote.description).to.equal(description);
      expect(vote.proposer).to.equal(deployer.address);
    });

    it("Should allow end-to-end execution flow", async function () {
      // 1. Register a strategy
      const strategyId = ethers.keccak256(ethers.toUtf8Bytes("TEST_STRATEGY"));
      const strategyConfig = {
        strategyId: strategyId,
        strategyContract: await executionEngine.getAddress(),
        isActive: true,
        maxGasLimit: 500000,
        maxSlippage: 1000, // 10%
        cooldownPeriod: 60 // 1 minute
      };

      await executionEngine.registerStrategy(
        strategyId,
        await executionEngine.getAddress(),
        strategyConfig
      );

      // 2. Check strategy is available
      const [isAvailable, reason] = await executionEngine.isStrategyAvailable(strategyId);
      expect(isAvailable).to.be.true;
      expect(reason).to.equal("Available");
    });

    it("Should allow end-to-end bridge flow", async function () {
      // 1. Register a chain
      const chainId = 12345;
      const chainName = "Test Chain";
      const bridgeContract = await bridgeManager.getAddress();
      const bridgeConfig = {
        chainId: chainId,
        bridgeContract: bridgeContract,
        isActive: true,
        minAmount: ethers.parseEther("0.1"),
        maxAmount: ethers.parseEther("1000"),
        fee: 100, // 1%
        estimatedTime: 300 // 5 minutes
      };

      await bridgeManager.registerChain(chainId, chainName, bridgeContract, bridgeConfig);

      // 2. Check chain is supported
      const isSupported = await bridgeManager.isChainSupported(chainId);
      expect(isSupported).to.be.true;

      // 3. Get supported chains
      const chains = await bridgeManager.getSupportedChains();
      expect(chains.length).to.equal(1);
      expect(chains[0].chainId).to.equal(chainId);
      expect(chains[0].name).to.equal(chainName);
    });
  });

  describe("Emergency Scenarios", function () {
    it("Should handle emergency stop across all contracts", async function () {
      // 1. Activate emergency stop on PortfolioAgent
      await portfolioAgent.emergencyStop("System emergency test");
      expect(await portfolioAgent.emergencyStop()).to.be.true;

      // 2. Activate emergency pause on ExecutionEngine
      await executionEngine.emergencyPause("Execution emergency test");
      expect(await executionEngine.emergencyPause()).to.be.true;

      // 3. Activate emergency pause on BridgeManager
      await bridgeManager.emergencyPause("Bridge emergency test");
      expect(await bridgeManager.emergencyPause()).to.be.true;

      // 4. Resume operations
      await portfolioAgent.resumeOperations();
      await executionEngine.resumeExecutions();
      await bridgeManager.resumeOperations();

      expect(await portfolioAgent.emergencyStop()).to.be.false;
    });
  });

  describe("Role Management", function () {
    it("Should have proper role assignments", async function () {
      // Check PortfolioAgent roles
      expect(await portfolioAgent.hasRole(await portfolioAgent.ADMIN_ROLE(), deployer.address)).to.be.true;
      expect(await portfolioAgent.hasRole(await portfolioAgent.AI_AGENT_ROLE(), deployer.address)).to.be.true;
      expect(await portfolioAgent.hasRole(await portfolioAgent.RISK_MANAGER_ROLE(), deployer.address)).to.be.true;

      // Check PermissionManager roles
      expect(await permissionManager.hasRole(await permissionManager.ADMIN_ROLE(), deployer.address)).to.be.true;
      expect(await permissionManager.hasRole(await permissionManager.AI_AGENT_ROLE(), deployer.address)).to.be.true;
      expect(await permissionManager.hasRole(await permissionManager.RISK_MANAGER_ROLE(), deployer.address)).to.be.true;

      // Check VotingEngine roles
      expect(await votingEngine.hasRole(await votingEngine.ADMIN_ROLE(), deployer.address)).to.be.true;
      expect(await votingEngine.hasRole(await votingEngine.VOTER_ROLE(), deployer.address)).to.be.true;

      // Check ExecutionEngine roles
      expect(await executionEngine.hasRole(await executionEngine.ADMIN_ROLE(), deployer.address)).to.be.true;
      expect(await executionEngine.hasRole(await executionEngine.EXECUTOR_ROLE(), deployer.address)).to.be.true;
      expect(await executionEngine.hasRole(await executionEngine.STRATEGY_MANAGER_ROLE(), deployer.address)).to.be.true;

      // Check BridgeManager roles
      expect(await bridgeManager.hasRole(await bridgeManager.ADMIN_ROLE(), deployer.address)).to.be.true;
      expect(await bridgeManager.hasRole(await bridgeManager.BRIDGE_OPERATOR_ROLE(), deployer.address)).to.be.true;
      expect(await bridgeManager.hasRole(await bridgeManager.ARBITRAGE_ROLE(), deployer.address)).to.be.true;
    });
  });

  describe("System Health", function () {
    it("Should have all contracts in healthy state", async function () {
      // Check PortfolioAgent
      expect(await portfolioAgent.paused()).to.be.false;
      expect(await portfolioAgent.emergencyStop()).to.be.false;

      // Check PermissionManager
      expect(await permissionManager.paused()).to.be.false;
      expect(await permissionManager.emergencyStop()).to.be.false;

      // Check VotingEngine
      expect(await votingEngine.paused()).to.be.false;
      expect(await votingEngine.emergencyStop()).to.be.false;

      // Check ExecutionEngine
      expect(await executionEngine.paused()).to.be.false;
      expect(await executionEngine.emergencyPause()).to.be.false;

      // Check BridgeManager
      expect(await bridgeManager.paused()).to.be.false;
      expect(await bridgeManager.emergencyPause()).to.be.false;
    });
  });

  describe("Performance Metrics", function () {
    it("Should have reasonable gas costs for core operations", async function () {
      // Test permission granting gas cost
      const action = ethers.keccak256(ethers.toUtf8Bytes("REBALANCE"));
      const config = {
        user: user1.address,
        action: action,
        threshold: 5000,
        cooldown: 3600,
        isActive: true,
        requiresVoting: false,
        maxAmount: ethers.parseEther("1000"),
        riskTolerance: 500
      };

      const tx = await permissionManager.grantPermission(config);
      const receipt = await tx.wait();
      
      // Gas cost should be reasonable (less than 200k gas)
      expect(receipt?.gasUsed).to.be.lessThan(200000);
    });
  });
});
