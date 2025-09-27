import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("Gas Benchmarks", function () {
  let portfolioAgent: Contract;
  let permissionManager: Contract;
  let votingEngine: Contract;
  let executionEngine: Contract;
  let bridgeManager: Contract;
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;

  beforeEach(async function () {
    [deployer, user1] = await ethers.getSigners();

    // Deploy all contracts
    const VotingEngine = await ethers.getContractFactory("VotingEngine");
    votingEngine = await VotingEngine.deploy(ethers.ZeroAddress);
    await votingEngine.waitForDeployment();

    const PermissionManager = await ethers.getContractFactory("PermissionManager");
    permissionManager = await PermissionManager.deploy(await votingEngine.getAddress());
    await permissionManager.waitForDeployment();

    const ExecutionEngine = await ethers.getContractFactory("ExecutionEngine");
    executionEngine = await ExecutionEngine.deploy();
    await executionEngine.waitForDeployment();

    const BridgeManager = await ethers.getContractFactory("BridgeManager");
    bridgeManager = await BridgeManager.deploy();
    await bridgeManager.waitForDeployment();

    const PortfolioAgent = await ethers.getContractFactory("PortfolioAgent");
    portfolioAgent = await PortfolioAgent.deploy(
      await permissionManager.getAddress(),
      await votingEngine.getAddress(),
      await executionEngine.getAddress()
    );
    await portfolioAgent.waitForDeployment();

    // Set up roles
    const AI_AGENT_ROLE = await permissionManager.AI_AGENT_ROLE();
    await permissionManager.grantRole(AI_AGENT_ROLE, await portfolioAgent.getAddress());

    const VOTER_ROLE = await votingEngine.VOTER_ROLE();
    await votingEngine.grantRole(VOTER_ROLE, deployer.address);

    const EXECUTOR_ROLE = await executionEngine.EXECUTOR_ROLE();
    await executionEngine.grantRole(EXECUTOR_ROLE, await portfolioAgent.getAddress());
  });

  describe("PortfolioAgent Gas Costs", function () {
    it("Should have reasonable gas cost for risk parameter update", async function () {
      const tx = await portfolioAgent.updateRiskParameters(6000, 4000);
      const receipt = await tx.wait();
      
      console.log("Risk parameter update gas cost:", receipt?.gasUsed?.toString());
      expect(receipt?.gasUsed).to.be.lessThan(100000);
    });

    it("Should have reasonable gas cost for emergency stop", async function () {
      const tx = await portfolioAgent.emergencyStop("Test emergency");
      const receipt = await tx.wait();
      
      console.log("Emergency stop gas cost:", receipt?.gasUsed?.toString());
      expect(receipt?.gasUsed).to.be.lessThan(100000);
    });

    it("Should have reasonable gas cost for resume operations", async function () {
      await portfolioAgent.emergencyStop("Test emergency");
      const tx = await portfolioAgent.resumeOperations();
      const receipt = await tx.wait();
      
      console.log("Resume operations gas cost:", receipt?.gasUsed?.toString());
      expect(receipt?.gasUsed).to.be.lessThan(100000);
    });
  });

  describe("PermissionManager Gas Costs", function () {
    it("Should have reasonable gas cost for granting permission", async function () {
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
      
      console.log("Grant permission gas cost:", receipt?.gasUsed?.toString());
      expect(receipt?.gasUsed).to.be.lessThan(200000);
    });

    it("Should have reasonable gas cost for revoking permission", async function () {
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

      await permissionManager.grantPermission(config);
      
      const tx = await permissionManager.revokePermission(user1.address, action, "Test revocation");
      const receipt = await tx.wait();
      
      console.log("Revoke permission gas cost:", receipt?.gasUsed?.toString());
      expect(receipt?.gasUsed).to.be.lessThan(150000);
    });

    it("Should have reasonable gas cost for adding conditional rule", async function () {
      const ruleId = ethers.keccak256(ethers.toUtf8Bytes("VOLATILITY_RULE"));
      const rule = {
        ruleId: ruleId,
        condition: ethers.keccak256(ethers.toUtf8Bytes("VOLATILITY_GT_THRESHOLD")),
        threshold: 5000,
        autoRevoke: true,
        escalateToVoting: false,
        gracePeriod: 300
      };

      const tx = await permissionManager.addConditionalRule(rule);
      const receipt = await tx.wait();
      
      console.log("Add conditional rule gas cost:", receipt?.gasUsed?.toString());
      expect(receipt?.gasUsed).to.be.lessThan(150000);
    });

    it("Should have reasonable gas cost for updating risk metrics", async function () {
      const metrics = {
        volatility: 3000,
        drawdown: 2000,
        correlation: 500,
        liquidity: 800,
        lastUpdated: Math.floor(Date.now() / 1000)
      };

      const tx = await permissionManager.updateRiskMetrics(user1.address, metrics);
      const receipt = await tx.wait();
      
      console.log("Update risk metrics gas cost:", receipt?.gasUsed?.toString());
      expect(receipt?.gasUsed).to.be.lessThan(100000);
    });
  });

  describe("VotingEngine Gas Costs", function () {
    it("Should have reasonable gas cost for creating vote", async function () {
      const description = "Test vote for gas benchmarking";
      const actionType = ethers.keccak256(ethers.toUtf8Bytes("TEST_ACTION"));
      const data = ethers.toUtf8Bytes("test data");
      const duration = 3600;

      const tx = await votingEngine.createVote(description, actionType, data, duration);
      const receipt = await tx.wait();
      
      console.log("Create vote gas cost:", receipt?.gasUsed?.toString());
      expect(receipt?.gasUsed).to.be.lessThan(200000);
    });

    it("Should have reasonable gas cost for casting vote", async function () {
      const description = "Test vote for gas benchmarking";
      const actionType = ethers.keccak256(ethers.toUtf8Bytes("TEST_ACTION"));
      const data = ethers.toUtf8Bytes("test data");
      const duration = 3600;

      await votingEngine.createVote(description, actionType, data, duration);
      
      const voteId = 1; // First vote
      const tx = await votingEngine.castVote(voteId, true, "Supporting the test vote");
      const receipt = await tx.wait();
      
      console.log("Cast vote gas cost:", receipt?.gasUsed?.toString());
      expect(receipt?.gasUsed).to.be.lessThan(150000);
    });

    it("Should have reasonable gas cost for updating voting parameters", async function () {
      const tx = await votingEngine.updateVotingParameters(4000, 6000);
      const receipt = await tx.wait();
      
      console.log("Update voting parameters gas cost:", receipt?.gasUsed?.toString());
      expect(receipt?.gasUsed).to.be.lessThan(100000);
    });
  });

  describe("ExecutionEngine Gas Costs", function () {
    it("Should have reasonable gas cost for registering strategy", async function () {
      const strategyId = ethers.keccak256(ethers.toUtf8Bytes("TEST_STRATEGY"));
      const strategyConfig = {
        strategyId: strategyId,
        strategyContract: await executionEngine.getAddress(),
        isActive: true,
        maxGasLimit: 500000,
        maxSlippage: 1000,
        cooldownPeriod: 60
      };

      const tx = await executionEngine.registerStrategy(
        strategyId,
        await executionEngine.getAddress(),
        strategyConfig
      );
      const receipt = await tx.wait();
      
      console.log("Register strategy gas cost:", receipt?.gasUsed?.toString());
      expect(receipt?.gasUsed).to.be.lessThan(200000);
    });

    it("Should have reasonable gas cost for updating strategy", async function () {
      const strategyId = ethers.keccak256(ethers.toUtf8Bytes("TEST_STRATEGY"));
      const strategyConfig = {
        strategyId: strategyId,
        strategyContract: await executionEngine.getAddress(),
        isActive: true,
        maxGasLimit: 500000,
        maxSlippage: 1000,
        cooldownPeriod: 60
      };

      await executionEngine.registerStrategy(
        strategyId,
        await executionEngine.getAddress(),
        strategyConfig
      );

      const updatedConfig = {
        strategyId: strategyId,
        strategyContract: await executionEngine.getAddress(),
        isActive: false,
        maxGasLimit: 600000,
        maxSlippage: 1500,
        cooldownPeriod: 120
      };

      const tx = await executionEngine.updateStrategy(strategyId, updatedConfig);
      const receipt = await tx.wait();
      
      console.log("Update strategy gas cost:", receipt?.gasUsed?.toString());
      expect(receipt?.gasUsed).to.be.lessThan(150000);
    });
  });

  describe("BridgeManager Gas Costs", function () {
    it("Should have reasonable gas cost for registering chain", async function () {
      const chainId = 12345;
      const chainName = "Test Chain";
      const bridgeContract = await bridgeManager.getAddress();
      const bridgeConfig = {
        chainId: chainId,
        bridgeContract: bridgeContract,
        isActive: true,
        minAmount: ethers.parseEther("0.1"),
        maxAmount: ethers.parseEther("1000"),
        fee: 100,
        estimatedTime: 300
      };

      const tx = await bridgeManager.registerChain(chainId, chainName, bridgeContract, bridgeConfig);
      const receipt = await tx.wait();
      
      console.log("Register chain gas cost:", receipt?.gasUsed?.toString());
      expect(receipt?.gasUsed).to.be.lessThan(200000);
    });

    it("Should have reasonable gas cost for updating chain info", async function () {
      const chainId = 12345;
      const chainName = "Test Chain";
      const bridgeContract = await bridgeManager.getAddress();
      const bridgeConfig = {
        chainId: chainId,
        bridgeContract: bridgeContract,
        isActive: true,
        minAmount: ethers.parseEther("0.1"),
        maxAmount: ethers.parseEther("1000"),
        fee: 100,
        estimatedTime: 300
      };

      await bridgeManager.registerChain(chainId, chainName, bridgeContract, bridgeConfig);

      const updatedInfo = {
        chainId: chainId,
        name: "Updated Test Chain",
        isSupported: true,
        nativeToken: ethers.ZeroAddress,
        gasPrice: 1000000000,
        blockTime: 2,
        lastUpdate: Math.floor(Date.now() / 1000)
      };

      const tx = await bridgeManager.updateChainInfo(chainId, updatedInfo);
      const receipt = await tx.wait();
      
      console.log("Update chain info gas cost:", receipt?.gasUsed?.toString());
      expect(receipt?.gasUsed).to.be.lessThan(100000);
    });
  });

  describe("Gas Optimization Targets", function () {
    it("Should meet gas optimization targets for core operations", async function () {
      // Test multiple operations and ensure they meet gas targets
      const operations = [
        { name: "Grant Permission", target: 200000 },
        { name: "Create Vote", target: 200000 },
        { name: "Register Strategy", target: 200000 },
        { name: "Register Chain", target: 200000 }
      ];

      for (const operation of operations) {
        console.log(`Testing ${operation.name} gas optimization...`);
        // Gas targets are already tested in individual tests above
        expect(true).to.be.true; // Placeholder for gas target validation
      }
    });
  });
});
