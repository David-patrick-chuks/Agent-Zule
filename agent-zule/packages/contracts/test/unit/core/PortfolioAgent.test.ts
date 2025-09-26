import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("PortfolioAgent", function () {
  let portfolioAgent: Contract;
  let permissionManager: Contract;
  let votingEngine: Contract;
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    // Deploy VotingEngine first
    const VotingEngine = await ethers.getContractFactory("VotingEngine");
    votingEngine = await VotingEngine.deploy(ethers.ZeroAddress); // Placeholder governance token
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

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      expect(await portfolioAgent.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await portfolioAgent.hasRole(await portfolioAgent.DEFAULT_ADMIN_ROLE(), deployer.address)).to.be.true;
    });

    it("Should have correct role assignments", async function () {
      const ADMIN_ROLE = await portfolioAgent.ADMIN_ROLE();
      const AI_AGENT_ROLE = await portfolioAgent.AI_AGENT_ROLE();
      const RISK_MANAGER_ROLE = await portfolioAgent.RISK_MANAGER_ROLE();

      expect(await portfolioAgent.hasRole(ADMIN_ROLE, deployer.address)).to.be.true;
      expect(await portfolioAgent.hasRole(AI_AGENT_ROLE, deployer.address)).to.be.true;
      expect(await portfolioAgent.hasRole(RISK_MANAGER_ROLE, deployer.address)).to.be.true;
    });
  });

  describe("Access Control", function () {
    it("Should allow AI agent to execute functions", async function () {
      // This would test AI agent functions when implemented
      expect(await portfolioAgent.hasRole(await portfolioAgent.AI_AGENT_ROLE(), deployer.address)).to.be.true;
    });

    it("Should allow risk manager to update parameters", async function () {
      const maxVolatility = 6000; // 60%
      const maxDrawdown = 4000; // 40%

      await expect(portfolioAgent.updateRiskParameters(maxVolatility, maxDrawdown))
        .to.emit(portfolioAgent, "RiskThresholdUpdated")
        .withArgs(deployer.address, 5000, maxVolatility);
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow admin to activate emergency stop", async function () {
      const reason = "Test emergency stop";
      
      await expect(portfolioAgent.emergencyStop(reason))
        .to.emit(portfolioAgent, "EmergencyStopActivated")
        .withArgs(deployer.address, reason);

      expect(await portfolioAgent.emergencyStop()).to.be.true;
      expect(await portfolioAgent.emergencyReason()).to.equal(reason);
    });

    it("Should allow admin to resume operations", async function () {
      // First activate emergency stop
      await portfolioAgent.emergencyStop("Test");
      expect(await portfolioAgent.emergencyStop()).to.be.true;

      // Then resume
      await portfolioAgent.resumeOperations();
      expect(await portfolioAgent.emergencyStop()).to.be.false;
    });
  });

  describe("View Functions", function () {
    it("Should return empty portfolio for new user", async function () {
      const positions = await portfolioAgent.getPortfolioPositions(user1.address);
      expect(positions.length).to.equal(0);
    });

    it("Should return zero metrics for new user", async function () {
      const [totalValue, totalReturn, sharpeRatio] = await portfolioAgent.getPortfolioMetrics(user1.address);
      expect(totalValue).to.equal(0);
      expect(totalReturn).to.equal(0);
      expect(sharpeRatio).to.equal(0);
    });
  });

  describe("Integration", function () {
    it("Should integrate with PermissionManager", async function () {
      const permissionManagerAddress = await portfolioAgent.permissionManager();
      expect(permissionManagerAddress).to.equal(await permissionManager.getAddress());
    });

    it("Should integrate with VotingEngine", async function () {
      const votingEngineAddress = await portfolioAgent.votingEngine();
      expect(votingEngineAddress).to.equal(await votingEngine.getAddress());
    });
  });

  describe("Error Handling", function () {
    it("Should revert when non-admin tries to update risk parameters", async function () {
      await expect(portfolioAgent.connect(user1).updateRiskParameters(6000, 4000))
        .to.be.revertedWith("PortfolioAgent: not risk manager");
    });

    it("Should revert when non-admin tries emergency stop", async function () {
      await expect(portfolioAgent.connect(user1).emergencyStop("Test"))
        .to.be.revertedWith("AccessControl: account " + user1.address.toLowerCase() + " is missing role " + await portfolioAgent.ADMIN_ROLE());
    });
  });
});
