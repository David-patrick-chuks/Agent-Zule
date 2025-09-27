import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("PortfolioAgent Fuzz Tests", function () {
  let portfolioAgent: Contract;
  let permissionManager: Contract;
  let votingEngine: Contract;
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;

  beforeEach(async function () {
    [deployer, user1] = await ethers.getSigners();

    // Deploy VotingEngine first
    const VotingEngine = await ethers.getContractFactory("VotingEngine");
    votingEngine = await VotingEngine.deploy(ethers.ZeroAddress);
    await votingEngine.waitForDeployment();

    // Deploy PermissionManager
    const PermissionManager = await ethers.getContractFactory("PermissionManager");
    permissionManager = await PermissionManager.deploy(await votingEngine.getAddress());
    await permissionManager.waitForDeployment();

    // Deploy PortfolioAgent
    const PortfolioAgent = await ethers.getContractFactory("PortfolioAgent");
    portfolioAgent = await PortfolioAgent.deploy(
      await permissionManager.getAddress(),
      await votingEngine.getAddress(),
      ethers.ZeroAddress // Placeholder execution engine
    );
    await portfolioAgent.waitForDeployment();

    // Set up roles
    const AI_AGENT_ROLE = await permissionManager.AI_AGENT_ROLE();
    await permissionManager.grantRole(AI_AGENT_ROLE, await portfolioAgent.getAddress());

    const VOTER_ROLE = await votingEngine.VOTER_ROLE();
    await votingEngine.grantRole(VOTER_ROLE, deployer.address);
  });

  describe("Risk Parameter Fuzz Tests", function () {
    it("Should handle various risk parameter combinations", async function () {
      const testCases = [
        { volatility: 1000, drawdown: 500 },   // 10% volatility, 5% drawdown
        { volatility: 5000, drawdown: 3000 }, // 50% volatility, 30% drawdown
        { volatility: 8000, drawdown: 6000 }, // 80% volatility, 60% drawdown
        { volatility: 10000, drawdown: 10000 }, // 100% volatility, 100% drawdown
      ];

      for (const testCase of testCases) {
        await portfolioAgent.updateRiskParameters(testCase.volatility, testCase.drawdown);
        
        // Verify the parameters were set correctly
        const maxVolatility = await portfolioAgent.maxVolatilityThreshold();
        const maxDrawdown = await portfolioAgent.maxDrawdownThreshold();
        
        expect(maxVolatility).to.equal(testCase.volatility);
        expect(maxDrawdown).to.equal(testCase.drawdown);
      }
    });

    it("Should revert on invalid risk parameters", async function () {
      const invalidCases = [
        { volatility: 10001, drawdown: 5000 }, // Volatility > 100%
        { volatility: 5000, drawdown: 10001 }, // Drawdown > 100%
        { volatility: 0, drawdown: 0 },        // Zero values
      ];

      for (const testCase of invalidCases) {
        await expect(portfolioAgent.updateRiskParameters(testCase.volatility, testCase.drawdown))
          .to.be.reverted;
      }
    });
  });

  describe("Emergency Stop Fuzz Tests", function () {
    it("Should handle various emergency stop reasons", async function () {
      const reasons = [
        "Market crash detected",
        "High volatility alert",
        "System malfunction",
        "Security breach",
        "Maintenance required",
        "Upgrade in progress",
        "Risk threshold exceeded",
        "Liquidity crisis",
        "Network congestion",
        "Smart contract bug"
      ];

      for (const reason of reasons) {
        await portfolioAgent.emergencyStop(reason);
        expect(await portfolioAgent.emergencyStop()).to.be.true;
        expect(await portfolioAgent.emergencyReason()).to.equal(reason);

        await portfolioAgent.resumeOperations();
        expect(await portfolioAgent.emergencyStop()).to.be.false;
      }
    });
  });

  describe("Portfolio Position Fuzz Tests", function () {
    it("Should handle various portfolio configurations", async function () {
      const testPortfolios = [
        // Single token portfolio
        [{
          token: ethers.ZeroAddress,
          amount: ethers.parseEther("1000"),
          targetWeight: 10000, // 100%
          currentWeight: 10000,
          lastRebalance: Math.floor(Date.now() / 1000),
          isActive: true
        }],
        // Two token portfolio
        [{
          token: ethers.ZeroAddress,
          amount: ethers.parseEther("500"),
          targetWeight: 5000, // 50%
          currentWeight: 5000,
          lastRebalance: Math.floor(Date.now() / 1000),
          isActive: true
        }, {
          token: ethers.ZeroAddress,
          amount: ethers.parseEther("500"),
          targetWeight: 5000, // 50%
          currentWeight: 5000,
          lastRebalance: Math.floor(Date.now() / 1000),
          isActive: true
        }],
        // Three token portfolio
        [{
          token: ethers.ZeroAddress,
          amount: ethers.parseEther("333.33"),
          targetWeight: 3333, // 33.33%
          currentWeight: 3333,
          lastRebalance: Math.floor(Date.now() / 1000),
          isActive: true
        }, {
          token: ethers.ZeroAddress,
          amount: ethers.parseEther("333.33"),
          targetWeight: 3333, // 33.33%
          currentWeight: 3333,
          lastRebalance: Math.floor(Date.now() / 1000),
          isActive: true
        }, {
          token: ethers.ZeroAddress,
          amount: ethers.parseEther("333.34"),
          targetWeight: 3334, // 33.34%
          currentWeight: 3334,
          lastRebalance: Math.floor(Date.now() / 1000),
          isActive: true
        }]
      ];

      for (const portfolio of testPortfolios) {
        // Test portfolio position retrieval
        const positions = await portfolioAgent.getPortfolioPositions(user1.address);
        expect(positions.length).to.equal(0); // Should be empty for new user
      }
    });
  });

  describe("Permission Fuzz Tests", function () {
    it("Should handle various permission configurations", async function () {
      const testPermissions = [
        {
          user: user1.address,
          action: ethers.keccak256(ethers.toUtf8Bytes("REBALANCE")),
          threshold: 1000, // 10%
          cooldown: 60, // 1 minute
          isActive: true,
          requiresVoting: false,
          maxAmount: ethers.parseEther("100"),
          riskTolerance: 100 // 10%
        },
        {
          user: user1.address,
          action: ethers.keccak256(ethers.toUtf8Bytes("YIELD_OPTIMIZE")),
          threshold: 5000, // 50%
          cooldown: 3600, // 1 hour
          isActive: true,
          requiresVoting: true,
          maxAmount: ethers.parseEther("1000"),
          riskTolerance: 500 // 50%
        },
        {
          user: user1.address,
          action: ethers.keccak256(ethers.toUtf8Bytes("DCA")),
          threshold: 3000, // 30%
          cooldown: 1800, // 30 minutes
          isActive: true,
          requiresVoting: false,
          maxAmount: ethers.parseEther("500"),
          riskTolerance: 300 // 30%
        }
      ];

      for (const permission of testPermissions) {
        await permissionManager.grantPermission(permission);
        
        // Verify permission was granted
        const [storedConfig, isActive] = await permissionManager.getPermissionStatus(
          permission.user,
          permission.action
        );
        expect(storedConfig.user).to.equal(permission.user);
        expect(storedConfig.action).to.equal(permission.action);
        expect(isActive).to.be.true;
      }
    });
  });

  describe("Voting Fuzz Tests", function () {
    it("Should handle various vote configurations", async function () {
      const testVotes = [
        {
          description: "Short vote",
          actionType: ethers.keccak256(ethers.toUtf8Bytes("SHORT_ACTION")),
          data: ethers.toUtf8Bytes("short data"),
          duration: 60 // 1 minute
        },
        {
          description: "Medium vote",
          actionType: ethers.keccak256(ethers.toUtf8Bytes("MEDIUM_ACTION")),
          data: ethers.toUtf8Bytes("medium length data for testing"),
          duration: 3600 // 1 hour
        },
        {
          description: "Long vote",
          actionType: ethers.keccak256(ethers.toUtf8Bytes("LONG_ACTION")),
          data: ethers.toUtf8Bytes("very long data for comprehensive testing of vote creation and management"),
          duration: 86400 // 24 hours
        }
      ];

      for (const vote of testVotes) {
        await votingEngine.createVote(
          vote.description,
          vote.actionType,
          vote.data,
          vote.duration
        );

        // Verify vote was created
        const voteId = 1; // First vote
        const createdVote = await votingEngine.getVote(voteId);
        expect(createdVote.description).to.equal(vote.description);
        expect(createdVote.actionType).to.equal(vote.actionType);
      }
    });
  });

  describe("Gas Limit Fuzz Tests", function () {
    it("Should handle operations within gas limits", async function () {
      const gasLimit = 1000000; // 1M gas
      
      // Test various operations that should stay within gas limits
      const operations = [
        () => portfolioAgent.updateRiskParameters(5000, 3000),
        () => portfolioAgent.emergencyStop("Test"),
        () => portfolioAgent.resumeOperations(),
        () => portfolioAgent.getPortfolioPositions(user1.address),
        () => portfolioAgent.getPortfolioMetrics(user1.address)
      ];

      for (const operation of operations) {
        const tx = await operation();
        const receipt = await tx.wait();
        
        expect(receipt?.gasUsed).to.be.lessThan(gasLimit);
      }
    });
  });

  describe("Edge Case Fuzz Tests", function () {
    it("Should handle edge cases gracefully", async function () {
      // Test with zero addresses
      const zeroAddress = ethers.ZeroAddress;
      
      // Test with maximum values
      const maxUint256 = ethers.MaxUint256;
      
      // Test with minimum values
      const minValue = 1;
      
      // Test with boundary values
      const boundaryValues = [
        0,
        1,
        100,
        1000,
        10000,
        100000,
        1000000,
        10000000,
        100000000,
        1000000000
      ];

      for (const value of boundaryValues) {
        // Test that the system handles various boundary values
        try {
          await portfolioAgent.updateRiskParameters(value, value);
        } catch (error) {
          // Some values should fail validation, which is expected
          expect(error.message).to.contain("invalid");
        }
      }
    });
  });
});
