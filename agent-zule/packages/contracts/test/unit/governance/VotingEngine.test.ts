import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("VotingEngine", function () {
  let votingEngine: Contract;
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    const VotingEngine = await ethers.getContractFactory("VotingEngine");
    votingEngine = await VotingEngine.deploy(ethers.ZeroAddress); // Placeholder governance token
    await votingEngine.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      expect(await votingEngine.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await votingEngine.hasRole(await votingEngine.DEFAULT_ADMIN_ROLE(), deployer.address)).to.be.true;
    });

    it("Should have correct role assignments", async function () {
      const ADMIN_ROLE = await votingEngine.ADMIN_ROLE();
      const VOTER_ROLE = await votingEngine.VOTER_ROLE();

      expect(await votingEngine.hasRole(ADMIN_ROLE, deployer.address)).to.be.true;
      expect(await votingEngine.hasRole(VOTER_ROLE, deployer.address)).to.be.true;
    });
  });

  describe("Vote Management", function () {
    it("Should allow voters to create votes", async function () {
      const description = "Test vote for governance";
      const actionType = ethers.keccak256(ethers.toUtf8Bytes("TEST_ACTION"));
      const data = ethers.toUtf8Bytes("test data");
      const duration = 3600; // 1 hour

      await expect(votingEngine.createVote(description, actionType, data, duration))
        .to.emit(votingEngine, "VoteCreated")
        .withArgs(1, deployer.address, description, actionType, await votingEngine.getAddress(), await votingEngine.getAddress());

      const vote = await votingEngine.getVote(1);
      expect(vote.description).to.equal(description);
      expect(vote.proposer).to.equal(deployer.address);
    });

    it("Should allow voters to cast votes", async function () {
      const description = "Test vote for governance";
      const actionType = ethers.keccak256(ethers.toUtf8Bytes("TEST_ACTION"));
      const data = ethers.toUtf8Bytes("test data");
      const duration = 3600;

      await votingEngine.createVote(description, actionType, data, duration);

      await expect(votingEngine.castVote(1, true, "Supporting the test vote"))
        .to.emit(votingEngine, "VoteCast")
        .withArgs(1, deployer.address, true, await votingEngine.getAddress(), await votingEngine.getAddress());

      const result = await votingEngine.getVoteResult(1);
      expect(result.forVotes).to.be.greaterThan(0);
    });

    it("Should allow proposer to cancel vote", async function () {
      const description = "Test vote for governance";
      const actionType = ethers.keccak256(ethers.toUtf8Bytes("TEST_ACTION"));
      const data = ethers.toUtf8Bytes("test data");
      const duration = 3600;

      await votingEngine.createVote(description, actionType, data, duration);

      await expect(votingEngine.cancelVote(1, "Test cancellation"))
        .to.emit(votingEngine, "VoteCancelled")
        .withArgs(1, deployer.address, "Test cancellation", await votingEngine.getAddress());

      const vote = await votingEngine.getVote(1);
      expect(vote.cancelled).to.be.true;
    });
  });

  describe("Voting Power Management", function () {
    it("Should allow users to delegate voting power", async function () {
      const delegatee = user1.address;
      const amount = ethers.parseEther("1000");

      await expect(votingEngine.delegateVotingPower(delegatee, amount))
        .to.emit(votingEngine, "VotingPowerDelegated")
        .withArgs(deployer.address, delegatee, amount, await votingEngine.getAddress());
    });

    it("Should allow users to undelegate voting power", async function () {
      const delegatee = user1.address;
      const amount = ethers.parseEther("1000");

      // First delegate
      await votingEngine.delegateVotingPower(delegatee, amount);

      // Then undelegate
      await expect(votingEngine.undelegateVotingPower(delegatee, amount))
        .to.emit(votingEngine, "VotingPowerUndelegated")
        .withArgs(deployer.address, delegatee, amount, await votingEngine.getAddress());
    });
  });

  describe("View Functions", function () {
    it("Should return vote details", async function () {
      const description = "Test vote for governance";
      const actionType = ethers.keccak256(ethers.toUtf8Bytes("TEST_ACTION"));
      const data = ethers.toUtf8Bytes("test data");
      const duration = 3600;

      await votingEngine.createVote(description, actionType, data, duration);

      const vote = await votingEngine.getVote(1);
      expect(vote.description).to.equal(description);
      expect(vote.proposer).to.equal(deployer.address);
      expect(vote.actionType).to.equal(actionType);
    });

    it("Should return vote result", async function () {
      const description = "Test vote for governance";
      const actionType = ethers.keccak256(ethers.toUtf8Bytes("TEST_ACTION"));
      const data = ethers.toUtf8Bytes("test data");
      const duration = 3600;

      await votingEngine.createVote(description, actionType, data, duration);
      await votingEngine.castVote(1, true, "Supporting the test vote");

      const result = await votingEngine.getVoteResult(1);
      expect(result.forVotes).to.be.greaterThan(0);
      expect(result.totalVotes).to.be.greaterThan(0);
    });

    it("Should return voting power", async function () {
      const [power, delegatedTo] = await votingEngine.getVotingPower(deployer.address);
      expect(power).to.be.greaterThan(0);
      expect(delegatedTo).to.equal(ethers.ZeroAddress);
    });

    it("Should return active votes", async function () {
      const description = "Test vote for governance";
      const actionType = ethers.keccak256(ethers.toUtf8Bytes("TEST_ACTION"));
      const data = ethers.toUtf8Bytes("test data");
      const duration = 3600;

      await votingEngine.createVote(description, actionType, data, duration);

      const activeVotes = await votingEngine.getActiveVotes();
      expect(activeVotes.length).to.be.greaterThan(0);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to update voting parameters", async function () {
      const newQuorum = 4000; // 40%
      const newSupportRequired = 6000; // 60%

      await expect(votingEngine.updateVotingParameters(newQuorum, newSupportRequired))
        .to.emit(votingEngine, "QuorumUpdated")
        .withArgs(3000, newQuorum, await votingEngine.getAddress());

      await expect(votingEngine.updateVotingParameters(newQuorum, newSupportRequired))
        .to.emit(votingEngine, "SupportRequiredUpdated")
        .withArgs(5000, newSupportRequired, await votingEngine.getAddress());
    });

    it("Should allow admin to emergency pause", async function () {
      const reason = "Test emergency pause";
      
      await expect(votingEngine.emergencyPause(reason))
        .to.emit(votingEngine, "EmergencyPauseActivated")
        .withArgs(reason, await votingEngine.getAddress());

      expect(await votingEngine.emergencyPause()).to.be.true;
      expect(await votingEngine.emergencyReason()).to.equal(reason);
    });

    it("Should allow admin to resume voting", async function () {
      // First activate emergency pause
      await votingEngine.emergencyPause("Test");
      expect(await votingEngine.emergencyPause()).to.be.true;

      // Then resume
      await votingEngine.resumeVoting();
      expect(await votingEngine.emergencyPause()).to.be.false;
    });
  });

  describe("Error Handling", function () {
    it("Should revert when non-voter tries to create vote", async function () {
      const description = "Test vote for governance";
      const actionType = ethers.keccak256(ethers.toUtf8Bytes("TEST_ACTION"));
      const data = ethers.toUtf8Bytes("test data");
      const duration = 3600;

      await expect(votingEngine.connect(user1).createVote(description, actionType, data, duration))
        .to.be.revertedWith("VotingEngine: not a voter");
    });

    it("Should revert when non-voter tries to cast vote", async function () {
      const description = "Test vote for governance";
      const actionType = ethers.keccak256(ethers.toUtf8Bytes("TEST_ACTION"));
      const data = ethers.toUtf8Bytes("test data");
      const duration = 3600;

      await votingEngine.createVote(description, actionType, data, duration);

      await expect(votingEngine.connect(user1).castVote(1, true, "Supporting the test vote"))
        .to.be.revertedWith("VotingEngine: not a voter");
    });

    it("Should revert when trying to cast vote on non-existent vote", async function () {
      await expect(votingEngine.castVote(999, true, "Supporting the test vote"))
        .to.be.revertedWith("VotingEngine: invalid vote ID");
    });

    it("Should revert when trying to cast vote twice", async function () {
      const description = "Test vote for governance";
      const actionType = ethers.keccak256(ethers.toUtf8Bytes("TEST_ACTION"));
      const data = ethers.toUtf8Bytes("test data");
      const duration = 3600;

      await votingEngine.createVote(description, actionType, data, duration);
      await votingEngine.castVote(1, true, "Supporting the test vote");

      await expect(votingEngine.castVote(1, false, "Changing vote"))
        .to.be.revertedWith("VotingEngine: already voted");
    });

    it("Should revert when non-admin tries to update parameters", async function () {
      await expect(votingEngine.connect(user1).updateVotingParameters(4000, 6000))
        .to.be.revertedWith("VotingEngine: not admin");
    });
  });
});
