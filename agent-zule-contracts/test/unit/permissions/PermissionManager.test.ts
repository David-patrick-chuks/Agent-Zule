import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("PermissionManager", function () {
  let permissionManager: Contract;
  let votingEngine: Contract;
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    // Deploy VotingEngine first
    const VotingEngine = await ethers.getContractFactory("VotingEngine");
    votingEngine = await VotingEngine.deploy(ethers.ZeroAddress);
    await votingEngine.waitForDeployment();

    // Deploy PermissionManager
    const PermissionManager = await ethers.getContractFactory("PermissionManager");
    permissionManager = await PermissionManager.deploy(await votingEngine.getAddress());
    await permissionManager.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      expect(await permissionManager.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await permissionManager.hasRole(await permissionManager.DEFAULT_ADMIN_ROLE(), deployer.address)).to.be.true;
    });

    it("Should have correct role assignments", async function () {
      const ADMIN_ROLE = await permissionManager.ADMIN_ROLE();
      const AI_AGENT_ROLE = await permissionManager.AI_AGENT_ROLE();
      const RISK_MANAGER_ROLE = await permissionManager.RISK_MANAGER_ROLE();

      expect(await permissionManager.hasRole(ADMIN_ROLE, deployer.address)).to.be.true;
      expect(await permissionManager.hasRole(AI_AGENT_ROLE, deployer.address)).to.be.true;
      expect(await permissionManager.hasRole(RISK_MANAGER_ROLE, deployer.address)).to.be.true;
    });
  });

  describe("Permission Management", function () {
    it("Should allow AI agent to grant permissions", async function () {
      const action = ethers.keccak256(ethers.toUtf8Bytes("REBALANCE"));
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

      await expect(permissionManager.grantPermission(config))
        .to.emit(permissionManager, "PermissionGranted")
        .withArgs(user1.address, action, config, await permissionManager.getAddress());
    });

    it("Should allow AI agent to revoke permissions", async function () {
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

      // Grant permission first
      await permissionManager.grantPermission(config);

      // Then revoke
      await expect(permissionManager.revokePermission(user1.address, action, "Test revocation"))
        .to.emit(permissionManager, "PermissionRevoked")
        .withArgs(user1.address, action, "Test revocation", await permissionManager.getAddress());
    });

    it("Should check permissions correctly", async function () {
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

      // Grant permission
      await permissionManager.grantPermission(config);

      // Check permission
      const [hasPermission, requiresVoting] = await permissionManager.checkPermission(
        user1.address,
        action,
        ethers.parseEther("500")
      );

      expect(hasPermission).to.be.true;
      expect(requiresVoting).to.be.false;
    });
  });

  describe("Conditional Rules", function () {
    it("Should allow risk manager to add conditional rules", async function () {
      const ruleId = ethers.keccak256(ethers.toUtf8Bytes("VOLATILITY_RULE"));
      const rule = {
        ruleId: ruleId,
        condition: ethers.keccak256(ethers.toUtf8Bytes("VOLATILITY_GT_THRESHOLD")),
        threshold: 5000, // 50%
        autoRevoke: true,
        escalateToVoting: false,
        gracePeriod: 300 // 5 minutes
      };

      await expect(permissionManager.addConditionalRule(rule))
        .to.emit(permissionManager, "ConditionalRuleAdded")
        .withArgs(ruleId, rule, await permissionManager.getAddress());
    });
  });

  describe("Risk Metrics", function () {
    it("Should allow AI agent to update risk metrics", async function () {
      const metrics = {
        volatility: 3000, // 30%
        drawdown: 2000, // 20%
        correlation: 500, // 50%
        liquidity: 800, // 80%
        lastUpdated: Math.floor(Date.now() / 1000)
      };

      await permissionManager.updateRiskMetrics(user1.address, metrics);
      
      const storedMetrics = await permissionManager.userRiskMetrics(user1.address);
      expect(storedMetrics.volatility).to.equal(3000);
      expect(storedMetrics.drawdown).to.equal(2000);
    });
  });

  describe("Error Handling", function () {
    it("Should revert when non-AI agent tries to grant permission", async function () {
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

      await expect(permissionManager.connect(user1).grantPermission(config))
        .to.be.revertedWith("PermissionManager: not AI agent");
    });

    it("Should revert when non-risk manager tries to add rule", async function () {
      const ruleId = ethers.keccak256(ethers.toUtf8Bytes("VOLATILITY_RULE"));
      const rule = {
        ruleId: ruleId,
        condition: ethers.keccak256(ethers.toUtf8Bytes("VOLATILITY_GT_THRESHOLD")),
        threshold: 5000,
        autoRevoke: true,
        escalateToVoting: false,
        gracePeriod: 300
      };

      await expect(permissionManager.connect(user1).addConditionalRule(rule))
        .to.be.revertedWith("PermissionManager: not risk manager");
    });
  });

  describe("View Functions", function () {
    it("Should return user permissions", async function () {
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

      const permissions = await permissionManager.getUserPermissions(user1.address);
      expect(permissions.length).to.equal(1);
      expect(permissions[0].user).to.equal(user1.address);
      expect(permissions[0].action).to.equal(action);
    });

    it("Should return permission status", async function () {
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

      const [storedConfig, isActive] = await permissionManager.getPermissionStatus(user1.address, action);
      expect(storedConfig.user).to.equal(user1.address);
      expect(storedConfig.action).to.equal(action);
      expect(isActive).to.be.true;
    });
  });
});
