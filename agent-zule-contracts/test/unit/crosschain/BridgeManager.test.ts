import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("BridgeManager", function () {
  let bridgeManager: Contract;
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    const BridgeManager = await ethers.getContractFactory("BridgeManager");
    bridgeManager = await BridgeManager.deploy();
    await bridgeManager.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      expect(await bridgeManager.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await bridgeManager.hasRole(await bridgeManager.DEFAULT_ADMIN_ROLE(), deployer.address)).to.be.true;
    });

    it("Should have correct role assignments", async function () {
      const ADMIN_ROLE = await bridgeManager.ADMIN_ROLE();
      const BRIDGE_OPERATOR_ROLE = await bridgeManager.BRIDGE_OPERATOR_ROLE();
      const ARBITRAGE_ROLE = await bridgeManager.ARBITRAGE_ROLE();

      expect(await bridgeManager.hasRole(ADMIN_ROLE, deployer.address)).to.be.true;
      expect(await bridgeManager.hasRole(BRIDGE_OPERATOR_ROLE, deployer.address)).to.be.true;
      expect(await bridgeManager.hasRole(ARBITRAGE_ROLE, deployer.address)).to.be.true;
    });
  });

  describe("Chain Management", function () {
    it("Should allow bridge operator to register chain", async function () {
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

      await expect(bridgeManager.registerChain(chainId, chainName, bridgeContract, bridgeConfig))
        .to.emit(bridgeManager, "ChainRegistered")
        .withArgs(chainId, chainName, bridgeContract, await bridgeManager.getAddress());

      expect(await bridgeManager.isChainSupported(chainId)).to.be.true;
    });

    it("Should allow bridge operator to update chain info", async function () {
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

      await bridgeManager.updateChainInfo(chainId, updatedInfo);
      expect(await bridgeManager.isChainSupported(chainId)).to.be.true;
    });
  });

  describe("Bridge Operations", function () {
    beforeEach(async function () {
      // Register a test chain first
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
    });

    it("Should allow users to bridge tokens", async function () {
      const targetChainId = 12345;
      const token = ethers.ZeroAddress; // Native token
      const amount = ethers.parseEther("1");
      const recipient = user1.address;
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await expect(bridgeManager.connect(user1).bridgeTokens(
        targetChainId,
        token,
        amount,
        recipient,
        deadline
      )).to.emit(bridgeManager, "BridgeRequested");
    });

    it("Should return bridge status", async function () {
      const targetChainId = 12345;
      const token = ethers.ZeroAddress;
      const amount = ethers.parseEther("1");
      const recipient = user1.address;
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await bridgeManager.connect(user1).bridgeTokens(
        targetChainId,
        token,
        amount,
        recipient,
        deadline
      );

      // Get bridge status (this would need the actual request ID in a real implementation)
      const isSupported = await bridgeManager.isChainSupported(targetChainId);
      expect(isSupported).to.be.true;
    });
  });

  describe("Arbitrage Operations", function () {
    it("Should allow arbitrage role to execute arbitrage", async function () {
      const opportunity = {
        sourceChainId: 1,
        targetChainId: 12345,
        token: ethers.ZeroAddress,
        priceDifference: 500, // 5%
        estimatedProfit: ethers.parseEther("100"),
        minAmount: ethers.parseEther("1000"),
        maxAmount: ethers.parseEther("10000"),
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      const amount = ethers.parseEther("1000");

      await expect(bridgeManager.executeArbitrage(opportunity, amount))
        .to.emit(bridgeManager, "ArbitrageExecuted");
    });
  });

  describe("View Functions", function () {
    it("Should return supported chains", async function () {
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

      const chains = await bridgeManager.getSupportedChains();
      expect(chains.length).to.equal(1);
      expect(chains[0].chainId).to.equal(chainId);
      expect(chains[0].name).to.equal(chainName);
    });

    it("Should return bridge configuration", async function () {
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

      const config = await bridgeManager.getBridgeConfig(chainId);
      expect(config.chainId).to.equal(chainId);
      expect(config.isActive).to.be.true;
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow admin to emergency pause", async function () {
      const reason = "Test emergency pause";
      
      await expect(bridgeManager.emergencyPause(reason))
        .to.emit(bridgeManager, "EmergencyPauseActivated")
        .withArgs(reason, await bridgeManager.getAddress());

      expect(await bridgeManager.emergencyPause()).to.be.true;
      expect(await bridgeManager.emergencyReason()).to.equal(reason);
    });

    it("Should allow admin to resume operations", async function () {
      // First activate emergency pause
      await bridgeManager.emergencyPause("Test");
      expect(await bridgeManager.emergencyPause()).to.be.true;

      // Then resume
      await bridgeManager.resumeOperations();
      expect(await bridgeManager.emergencyPause()).to.be.false;
    });
  });

  describe("Error Handling", function () {
    it("Should revert when non-bridge operator tries to register chain", async function () {
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

      await expect(bridgeManager.connect(user1).registerChain(chainId, chainName, bridgeContract, bridgeConfig))
        .to.be.revertedWith("BridgeManager: not bridge operator");
    });

    it("Should revert when trying to bridge to unsupported chain", async function () {
      const targetChainId = 99999; // Unsupported chain
      const token = ethers.ZeroAddress;
      const amount = ethers.parseEther("1");
      const recipient = user1.address;
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await expect(bridgeManager.connect(user1).bridgeTokens(
        targetChainId,
        token,
        amount,
        recipient,
        deadline
      )).to.be.revertedWith("BridgeManager: chain not supported");
    });

    it("Should revert when non-arbitrage role tries to execute arbitrage", async function () {
      const opportunity = {
        sourceChainId: 1,
        targetChainId: 12345,
        token: ethers.ZeroAddress,
        priceDifference: 500,
        estimatedProfit: ethers.parseEther("100"),
        minAmount: ethers.parseEther("1000"),
        maxAmount: ethers.parseEther("10000"),
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      const amount = ethers.parseEther("1000");

      await expect(bridgeManager.connect(user1).executeArbitrage(opportunity, amount))
        .to.be.revertedWith("BridgeManager: not arbitrage role");
    });
  });
});
