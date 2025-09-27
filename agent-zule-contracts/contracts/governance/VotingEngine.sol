// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IVotingEngine.sol";
import "../libraries/MathUtils.sol";
import "../libraries/SecurityUtils.sol";

/**
 * @title VotingEngine
 * @dev Community Voting System for Agent Zule
 * @notice Implements advanced voting with delegation and governance patterns
 */
contract VotingEngine is IVotingEngine, AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using MathUtils for uint256;
    
    // ============ Constants ============
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VOTER_ROLE = keccak256("VOTER_ROLE");
    
    uint256 public constant MIN_VOTE_DURATION = 3600; // 1 hour
    uint256 public constant MAX_VOTE_DURATION = 604800; // 7 days
    uint256 public constant MAX_ACTIVE_VOTES = 100;
    
    // ============ State Variables ============
    
    IERC20 public governanceToken;
    
    mapping(uint256 => Vote) public votes;
    mapping(uint256 => VoteResult) public voteResults;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => uint256)) public voteWeights;
    
    mapping(address => uint256) public votingPower;
    mapping(address => address) public delegatedTo;
    mapping(address => uint256) public delegatedFrom;
    mapping(address => Delegation[]) public userDelegations;
    
    uint256 public nextVoteId = 1;
    uint256 public quorum = 3000; // 30% in basis points
    uint256 public supportRequired = 5000; // 50% in basis points
    
    bool public emergencyStop;
    string public emergencyReason;
    
    // ============ Modifiers ============
    
    modifier onlyVoter() {
        require(hasRole(VOTER_ROLE, msg.sender), "VotingEngine: not a voter");
        _;
    }
    
    modifier validVoteId(uint256 voteId) {
        require(voteId > 0 && voteId < nextVoteId, "VotingEngine: invalid vote ID");
        _;
    }
    
    modifier notEmergencyStopped() {
        require(!emergencyStop, "VotingEngine: emergency stop active");
        _;
    }
    
    modifier validVoteDuration(uint256 duration) {
        require(duration >= MIN_VOTE_DURATION, "VotingEngine: duration too short");
        require(duration <= MAX_VOTE_DURATION, "VotingEngine: duration too long");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _governanceToken) {
        require(_governanceToken != address(0), "VotingEngine: zero governance token");
        
        governanceToken = IERC20(_governanceToken);
        
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        _setupRole(VOTER_ROLE, msg.sender);
    }
    
    // ============ Core Functions ============
    
    /**
     * @dev Create a new vote for community decision
     * @param description Human-readable description of the vote
     * @param actionType Type of action being voted on
     * @param data Encoded action data
     * @param duration Voting duration in seconds
     * @return voteId The ID of the created vote
     */
    function createVote(
        string calldata description,
        bytes32 actionType,
        bytes calldata data,
        uint256 duration
    ) 
        external 
        override 
        onlyVoter 
        nonReentrant 
        whenNotPaused 
        notEmergencyStopped 
        validVoteDuration(duration) 
        returns (uint256 voteId) 
    {
        require(bytes(description).length > 0, "VotingEngine: empty description");
        require(data.length > 0, "VotingEngine: empty data");
        
        voteId = nextVoteId++;
        
        Vote memory newVote = Vote({
            voteId: voteId,
            proposer: msg.sender,
            description: description,
            actionType: actionType,
            data: data,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            quorum: quorum,
            supportRequired: supportRequired,
            executed: false,
            cancelled: false
        });
        
        votes[voteId] = newVote;
        
        emit VoteCreated(voteId, msg.sender, description, actionType, block.timestamp, block.timestamp + duration);
    }
    
    /**
     * @dev Cast a vote on an active proposal
     * @param voteId The ID of the vote
     * @param support True for yes, false for no
     * @param reason Optional reason for the vote
     */
    function castVote(
        uint256 voteId,
        bool support,
        string calldata reason
    ) 
        external 
        override 
        onlyVoter 
        nonReentrant 
        whenNotPaused 
        notEmergencyStopped 
        validVoteId(voteId) 
    {
        Vote storage vote = votes[voteId];
        
        require(block.timestamp >= vote.startTime, "VotingEngine: vote not started");
        require(block.timestamp <= vote.endTime, "VotingEngine: vote ended");
        require(!vote.executed, "VotingEngine: vote already executed");
        require(!vote.cancelled, "VotingEngine: vote cancelled");
        require(!hasVoted[voteId][msg.sender], "VotingEngine: already voted");
        
        // Calculate voting power
        uint256 weight = _calculateVotingPower(msg.sender);
        require(weight > 0, "VotingEngine: no voting power");
        
        // Record vote
        hasVoted[voteId][msg.sender] = true;
        voteWeights[voteId][msg.sender] = weight;
        
        // Update vote result
        if (support) {
            voteResults[voteId].forVotes = voteResults[voteId].forVotes.safeAdd(weight);
        } else {
            voteResults[voteId].againstVotes = voteResults[voteId].againstVotes.safeAdd(weight);
        }
        
        voteResults[voteId].totalVotes = voteResults[voteId].totalVotes.safeAdd(weight);
        
        emit VoteCast(voteId, msg.sender, support, weight, block.timestamp);
    }
    
    /**
     * @dev Execute a passed vote
     * @param voteId The ID of the vote to execute
     * @return success True if execution was successful
     * @return returnData Return data from the executed action
     */
    function executeVote(uint256 voteId) 
        external 
        override 
        onlyVoter 
        nonReentrant 
        whenNotPaused 
        notEmergencyStopped 
        validVoteId(voteId) 
        returns (bool success, bytes memory returnData) 
    {
        Vote storage vote = votes[voteId];
        
        require(block.timestamp > vote.endTime, "VotingEngine: vote still active");
        require(!vote.executed, "VotingEngine: vote already executed");
        require(!vote.cancelled, "VotingEngine: vote cancelled");
        
        // Check if vote passed
        (bool canExecute, string memory reason) = canExecuteVote(voteId);
        require(canExecute, string(abi.encodePacked("VotingEngine: ", reason)));
        
        // Mark as executed
        vote.executed = true;
        
        // Execute the action (placeholder - would call appropriate contract)
        success = true;
        returnData = abi.encode("Vote executed successfully");
        
        emit VoteExecuted(voteId, success, returnData, block.timestamp);
    }
    
    /**
     * @dev Cancel an active vote (only proposer or admin)
     * @param voteId The ID of the vote to cancel
     * @param reason Reason for cancellation
     */
    function cancelVote(uint256 voteId, string calldata reason) 
        external 
        override 
        nonReentrant 
        whenNotPaused 
        validVoteId(voteId) 
    {
        Vote storage vote = votes[voteId];
        
        require(!vote.executed, "VotingEngine: vote already executed");
        require(!vote.cancelled, "VotingEngine: vote already cancelled");
        require(
            msg.sender == vote.proposer || hasRole(ADMIN_ROLE, msg.sender),
            "VotingEngine: not proposer or admin"
        );
        
        vote.cancelled = true;
        
        emit VoteCancelled(voteId, msg.sender, reason, block.timestamp);
    }
    
    /**
     * @dev Delegate voting power to another address
     * @param delegatee Address to delegate voting power to
     * @param amount Amount of voting power to delegate
     */
    function delegateVotingPower(address delegatee, uint256 amount) 
        external 
        override 
        onlyVoter 
        nonReentrant 
        whenNotPaused 
        notEmergencyStopped 
    {
        require(delegatee != address(0), "VotingEngine: zero delegatee address");
        require(delegatee != msg.sender, "VotingEngine: cannot delegate to self");
        require(amount > 0, "VotingEngine: zero amount");
        require(amount <= votingPower[msg.sender], "VotingEngine: insufficient voting power");
        
        // Update delegation
        delegatedTo[msg.sender] = delegatee;
        delegatedFrom[delegatee] = delegatedFrom[delegatee].safeAdd(amount);
        
        // Update voting power
        votingPower[msg.sender] = votingPower[msg.sender].safeSub(amount);
        votingPower[delegatee] = votingPower[delegatee].safeAdd(amount);
        
        // Record delegation
        userDelegations[msg.sender].push(Delegation({
            from: msg.sender,
            to: delegatee,
            amount: amount,
            timestamp: block.timestamp,
            isActive: true
        }));
        
        emit VotingPowerDelegated(msg.sender, delegatee, amount, block.timestamp);
    }
    
    /**
     * @dev Undelegate voting power from a delegatee
     * @param delegatee Address to undelegate from
     * @param amount Amount of voting power to undelegate
     */
    function undelegateVotingPower(address delegatee, uint256 amount) 
        external 
        override 
        onlyVoter 
        nonReentrant 
        whenNotPaused 
        notEmergencyStopped 
    {
        require(delegatee != address(0), "VotingEngine: zero delegatee address");
        require(amount > 0, "VotingEngine: zero amount");
        require(amount <= delegatedFrom[delegatee], "VotingEngine: insufficient delegated amount");
        
        // Update delegation
        delegatedFrom[delegatee] = delegatedFrom[delegatee].safeSub(amount);
        
        // Update voting power
        votingPower[delegatee] = votingPower[delegatee].safeSub(amount);
        votingPower[msg.sender] = votingPower[msg.sender].safeAdd(amount);
        
        // Update delegation record
        _updateDelegationRecord(msg.sender, delegatee, amount, false);
        
        emit VotingPowerUndelegated(msg.sender, delegatee, amount, block.timestamp);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get vote details
     * @param voteId The ID of the vote
     * @return vote Vote struct with all details
     */
    function getVote(uint256 voteId) external view override validVoteId(voteId) returns (Vote memory vote) {
        return votes[voteId];
    }
    
    /**
     * @dev Get current vote result
     * @param voteId The ID of the vote
     * @return result Vote result with tallies and status
     */
    function getVoteResult(uint256 voteId) external view override validVoteId(voteId) returns (VoteResult memory result) {
        return voteResults[voteId];
    }
    
    /**
     * @dev Get voting power for an address
     * @param voter Address to check voting power for
     * @return power Current voting power
     * @return delegatedTo Address that voting power is delegated to
     */
    function getVotingPower(address voter) external view override returns (uint256 power, address delegatedTo) {
        return (votingPower[voter], delegatedTo[voter]);
    }
    
    /**
     * @dev Check if a vote can be executed
     * @param voteId The ID of the vote
     * @return canExecute True if vote can be executed
     * @return reason Reason if cannot execute
     */
    function canExecuteVote(uint256 voteId) public view override validVoteId(voteId) returns (bool canExecute, string memory reason) {
        Vote memory vote = votes[voteId];
        VoteResult memory result = voteResults[voteId];
        
        if (vote.executed) {
            return (false, "already executed");
        }
        
        if (vote.cancelled) {
            return (false, "vote cancelled");
        }
        
        if (block.timestamp <= vote.endTime) {
            return (false, "vote still active");
        }
        
        // Check quorum
        uint256 totalSupply = governanceToken.totalSupply();
        uint256 quorumThreshold = totalSupply.safeMul(vote.quorum).safeDiv(10000);
        
        if (result.totalVotes < quorumThreshold) {
            return (false, "quorum not reached");
        }
        
        // Check support required
        uint256 supportThreshold = result.totalVotes.safeMul(vote.supportRequired).safeDiv(10000);
        
        if (result.forVotes < supportThreshold) {
            return (false, "support threshold not met");
        }
        
        return (true, "can execute");
    }
    
    /**
     * @dev Get all active votes
     * @return activeVotes Array of active vote IDs
     */
    function getActiveVotes() external view override returns (uint256[] memory activeVotes) {
        uint256[] memory temp = new uint256[](MAX_ACTIVE_VOTES);
        uint256 count = 0;
        
        for (uint256 i = 1; i < nextVoteId; i++) {
            Vote memory vote = votes[i];
            if (block.timestamp >= vote.startTime && block.timestamp <= vote.endTime && !vote.executed && !vote.cancelled) {
                temp[count] = i;
                count++;
            }
        }
        
        activeVotes = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            activeVotes[i] = temp[i];
        }
    }
    
    /**
     * @dev Get votes for a specific user
     * @param user User address
     * @param includeExecuted Include executed votes
     * @return userVotes Array of vote IDs
     */
    function getUserVotes(address user, bool includeExecuted) external view override returns (uint256[] memory userVotes) {
        uint256[] memory temp = new uint256[](MAX_ACTIVE_VOTES);
        uint256 count = 0;
        
        for (uint256 i = 1; i < nextVoteId; i++) {
            Vote memory vote = votes[i];
            if (vote.proposer == user) {
                if (includeExecuted || (!vote.executed && !vote.cancelled)) {
                    temp[count] = i;
                    count++;
                }
            }
        }
        
        userVotes = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            userVotes[i] = temp[i];
        }
    }
    
    /**
     * @dev Get delegation information
     * @param delegator Address that delegated
     * @param delegatee Address that received delegation
     * @return delegation Delegation details
     */
    function getDelegation(address delegator, address delegatee) external view override returns (Delegation memory delegation) {
        Delegation[] memory delegations = userDelegations[delegator];
        
        for (uint256 i = 0; i < delegations.length; i++) {
            if (delegations[i].to == delegatee && delegations[i].isActive) {
                return delegations[i];
            }
        }
        
        // Return empty delegation if not found
        return Delegation({
            from: address(0),
            to: address(0),
            amount: 0,
            timestamp: 0,
            isActive: false
        });
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev Update voting parameters (only admin)
     * @param newQuorum New quorum requirement in basis points
     * @param newSupportRequired New support required in basis points
     */
    function updateVotingParameters(uint256 newQuorum, uint256 newSupportRequired) 
        external 
        override 
        onlyRole(ADMIN_ROLE) 
        nonReentrant 
        whenNotPaused 
    {
        require(newQuorum <= 10000, "VotingEngine: invalid quorum");
        require(newSupportRequired <= 10000, "VotingEngine: invalid support required");
        
        uint256 oldQuorum = quorum;
        uint256 oldSupport = supportRequired;
        
        quorum = newQuorum;
        supportRequired = newSupportRequired;
        
        emit QuorumUpdated(oldQuorum, newQuorum, block.timestamp);
        emit SupportRequiredUpdated(oldSupport, newSupportRequired, block.timestamp);
    }
    
    /**
     * @dev Emergency pause all voting
     * @param reason Reason for emergency pause
     */
    function emergencyPause(string calldata reason) external onlyRole(ADMIN_ROLE) {
        emergencyStop = true;
        emergencyReason = reason;
    }
    
    /**
     * @dev Resume voting after emergency pause
     */
    function resumeVoting() external onlyRole(ADMIN_ROLE) {
        emergencyStop = false;
        emergencyReason = "";
    }
    
    // ============ Internal Functions ============
    
    function _calculateVotingPower(address voter) internal view returns (uint256) {
        return votingPower[voter];
    }
    
    function _updateDelegationRecord(
        address delegator,
        address delegatee,
        uint256 amount,
        bool isActive
    ) internal {
        Delegation[] storage delegations = userDelegations[delegator];
        
        for (uint256 i = 0; i < delegations.length; i++) {
            if (delegations[i].to == delegatee) {
                delegations[i].amount = amount;
                delegations[i].isActive = isActive;
                return;
            }
        }
        
        // Add new delegation record
        delegations.push(Delegation({
            from: delegator,
            to: delegatee,
            amount: amount,
            timestamp: block.timestamp,
            isActive: isActive
        }));
    }
}
