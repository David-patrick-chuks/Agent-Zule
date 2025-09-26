import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("YieldOptimizer", function () {
  let yieldOptimizer: Contract;
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    const YieldOptimizer = await ethers.getContractFactory("YieldOptimizer");
    yieldOptimizer = await YieldOptimizer.deploy();
    await yieldOptimizer.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      expect(await yieldOptimizer.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await yieldOptimizer.hasRole(await yieldOptimizer.DEFAULT_ADMIN_ROLE(), deployer.address)).to.be.true;
    });

    it("Should have correct role assignments", async function () {
      const ADMIN_ROLE = await yieldOptimizer.ADMIN_ROLE();
      const STRATEGY_ROLE = await yieldOptimizer.STRATEGY_ROLE();

      expect(await yieldOptimizer.hasRole(ADMIN_ROLE, deployer.address)).to.be.true;
      expect(await yieldOptimizer.hasRole(STRATEGY_ROLE, deployer.address)).to.be.true;
    });
  });

  describe("Strategy Management", function () {
    it("Should allow users to activate strategy", async function () {
      const amount = ethers.parseEther("1000");
      const maxSlippage = 1000; // 10%

      await expect(yieldOptimizer.connect(user1).activateStrategy(amount, maxSlippage))
        .to.emit(yieldOptimizer, "StrategyActivated")
        .withArgs(user1.address, amount, await yieldOptimizer.getAddress());

      expect(await yieldOptimizer.activeStrategies(user1.address)).to.be.true;
      expect(await yieldOptimizer.userDeposits(user1.address)).to.equal(amount);
    });

    it("Should allow users to deactivate strategy", async function () {
      const amount = ethers.parseEther("1000");
      const maxSlippage = 1000;

      // Activate strategy first
      await yieldOptimizer.connect(user1).activateStrategy(amount, maxSlippage);

      // Deactivate strategy
      await expect(yieldOptimizer.connect(user1).deactivateStrategy(amount, amount))
        .to.emit(yieldOptimizer, "StrategyDeactivated")
        .withArgs(user1.address, amount, await yieldOptimizer.getAddress());

      expect(await yieldOptimizer.activeStrategies(user1.address)).to.be.false;
      expect(await yieldOptimizer.userDeposits(user1.address)).to.equal(0);
    });

    it("Should allow users to harvest rewards", async function () {
      const amount = ethers.parseEther("1000");
      const maxSlippage = 1000;

      // Activate strategy
      await yieldOptimizer.connect(user1).activateStrategy(amount, maxSlippage);

      // Harvest rewards
      await expect(yieldOptimizer.connect(user1).harvestRewards())
        .to.emit(yieldOptimizer, "RewardsHarvested")
        .withArgs(user1.address, await yieldOptimizer.getAddress(), await yieldOptimizer.getAddress());
    });
  });

  describe("View Functions", function () {
    it("Should return user strategy status", async function () {
      const amount = ethers.parseEther("1000");
      const maxSlippage = 1000;

      await yieldOptimizer.connect(user1).activateStrategy(amount, maxSlippage);

      const [isActive, depositAmount, pendingRewards] = await yieldOptimizer.getUserStrategy(user1.address);
      
      expect(isActive).to.be.true;
      expect(depositAmount).to.equal(amount);
      expect(pendingRewards).to.be.greaterThan(0);
    });

    it("Should return strategy metrics", async function () {
      const [totalDeposits, totalRewards, apy] = await yieldOptimizer.getStrategyMetrics();
      
      expect(totalDeposits).to.be.greaterThan(0);
      expect(totalRewards).to.be.greaterThan(0);
      expect(apy).to.be.greaterThan(0);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to emergency stop", async function () {
      const reason = "Test emergency stop";
      
      await expect(yieldOptimizer.emergencyStop(reason))
        .to.emit(yieldOptimizer, "EmergencyStopActivated")
        .withArgs(reason, await yieldOptimizer.getAddress());

      expect(await yieldOptimizer.emergencyStop()).to.be.true;
      expect(await yieldOptimizer.emergencyReason()).to.equal(reason);
    });

    it("Should allow admin to resume strategy", async function () {
      // First activate emergency stop
      await yieldOptimizer.emergencyStop("Test");
      expect(await yieldOptimizer.emergencyStop()).to.be.true;

      // Then resume
      await yieldOptimizer.resumeStrategy();
      expect(await yieldOptimizer.emergencyStop()).to.be.false;
    });
  });

  describe("Error Handling", function () {
    it("Should revert when amount is too small", async function () {
      const amount = ethers.parseEther("0.0000001"); // Too small
      const maxSlippage = 1000;

      await expect(yieldOptimizer.connect(user1).activateStrategy(amount, maxSlippage))
        .to.be.revertedWith("YieldOptimizer: amount too small");
    });

    it("Should revert when slippage is too high", async function () {
      const amount = ethers.parseEther("1000");
      const maxSlippage = 6000; // 60% - too high

      await expect(yieldOptimizer.connect(user1).activateStrategy(amount, maxSlippage))
        .to.be.revertedWith("YieldOptimizer: slippage too high");
    });

    it("Should revert when strategy is already active", async function () {
      const amount = ethers.parseEther("1000");
      const maxSlippage = 1000;

      await yieldOptimizer.connect(user1).activateStrategy(amount, maxSlippage);

      await expect(yieldOptimizer.connect(user1).activateStrategy(amount, maxSlippage))
        .to.be.revertedWith("YieldOptimizer: strategy already active");
    });

    it("Should revert when strategy is not active", async function () {
      const amount = ethers.parseEther("1000");

      await expect(yieldOptimizer.connect(user1).deactivateStrategy(amount, amount))
        .to.be.revertedWith("YieldOptimizer: strategy not active");
    });

    it("Should revert when insufficient balance", async function () {
      const amount = ethers.parseEther("1000");
      const maxSlippage = 1000;

      await yieldOptimizer.connect(user1).activateStrategy(amount, maxSlippage);

      const withdrawAmount = ethers.parseEther("2000"); // More than deposited

      await expect(yieldOptimizer.connect(user1).deactivateStrategy(withdrawAmount, withdrawAmount))
        .to.be.revertedWith("YieldOptimizer: insufficient balance");
    });
  });
});
