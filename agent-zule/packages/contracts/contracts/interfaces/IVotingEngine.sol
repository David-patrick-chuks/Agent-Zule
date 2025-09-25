// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IVotingEngine
 * @dev Interface for the Community Voting System
 * @notice This interface defines the governance and voting mechanisms for Agent Zule
 */
interface IVotingEngine {
    // ============ Structs ============
    
    struct Vote {
        uint256 voteId;
        address proposer;
        string description;
        bytes32 actionType;
        bytes data; // encoded action data
        uint256 startTime;
        uint256 endTime;
        uint256 quorum; // in basis points
        uint256 supportRequired; // in basis points
        bool executed;
        bool cancelled;
    }
    
    struct VoteResult {
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        uint256 totalVotes;
        bool passed;
        bool quorumReached;
    }
    
    struct VotingPower {
        address voter;
        uint256 power;
        uint256 delegatedFrom; // address that delegated to this voter
        uint256 lastDelegationUpdate;
    }
    
    struct Delegation {
        address from;
        address to;
        uint256 amount;
        uint256 timestamp;
        bool isActive;
    }
    
    // ============ Events ============
    
    event VoteCreated(
        uint256 indexed voteId,
        address indexed proposer,
        string description,
        bytes32 indexed actionType,
        uint256 startTime,
        uint256 endTime
    );
    
    event VoteCast(
        uint256 indexed voteId,
        address indexed voter,
        bool support,
        uint256 weight,
        uint256 timestamp
    );
    
    event VoteExecuted(
        uint256 indexed voteId,
        bool success,
        bytes returnData,
        uint256 timestamp
    );
    
    event VoteCancelled(
        uint256 indexed voteId,
        address indexed canceller,
        string reason,
        uint256 timestamp
    );
    
    event VotingPowerDelegated(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );
    
    event VotingPowerUndelegated(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );
    
    event QuorumUpdated(uint256 oldQuorum, uint256 newQuorum, uint256 timestamp);
    event SupportRequiredUpdated(uint256 oldSupport, uint256 newSupport, uint256 timestamp);
    
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
    ) external returns (uint256 voteId);
    
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
    ) external;
    
    /**
     * @dev Execute a passed vote
     * @param voteId The ID of the vote to execute
     * @return success True if execution was successful
     * @return returnData Return data from the executed action
     */
    function executeVote(uint256 voteId) external returns (bool success, bytes memory returnData);
    
    /**
     * @dev Cancel an active vote (only proposer or admin)
     * @param voteId The ID of the vote to cancel
     * @param reason Reason for cancellation
     */
    function cancelVote(uint256 voteId, string calldata reason) external;
    
    /**
     * @dev Delegate voting power to another address
     * @param delegatee Address to delegate voting power to
     * @param amount Amount of voting power to delegate
     */
    function delegateVotingPower(address delegatee, uint256 amount) external;
    
    /**
     * @dev Undelegate voting power from a delegatee
     * @param delegatee Address to undelegate from
     * @param amount Amount of voting power to undelegate
     */
    function undelegateVotingPower(address delegatee, uint256 amount) external;
    
    /**
     * @dev Get vote details
     * @param voteId The ID of the vote
     * @return vote Vote struct with all details
     */
    function getVote(uint256 voteId) external view returns (Vote memory vote);
    
    /**
     * @dev Get current vote result
     * @param voteId The ID of the vote
     * @return result Vote result with tallies and status
     */
    function getVoteResult(uint256 voteId) external view returns (VoteResult memory result);
    
    /**
     * @dev Get voting power for an address
     * @param voter Address to check voting power for
     * @return power Current voting power
     * @return delegatedTo Address that voting power is delegated to
     */
    function getVotingPower(address voter) external view returns (uint256 power, address delegatedTo);
    
    /**
     * @dev Check if a vote can be executed
     * @param voteId The ID of the vote
     * @return canExecute True if vote can be executed
     * @return reason Reason if cannot execute
     */
    function canExecuteVote(uint256 voteId) external view returns (bool canExecute, string memory reason);
    
    /**
     * @dev Get all active votes
     * @return activeVotes Array of active vote IDs
     */
    function getActiveVotes() external view returns (uint256[] memory activeVotes);
    
    /**
     * @dev Get votes for a specific user
     * @param user User address
     * @param includeExecuted Include executed votes
     * @return userVotes Array of vote IDs
     */
    function getUserVotes(address user, bool includeExecuted) external view returns (uint256[] memory userVotes);
    
    /**
     * @dev Update voting parameters (only admin)
     * @param newQuorum New quorum requirement in basis points
     * @param newSupportRequired New support required in basis points
     */
    function updateVotingParameters(uint256 newQuorum, uint256 newSupportRequired) external;
    
    /**
     * @dev Get delegation information
     * @param delegator Address that delegated
     * @param delegatee Address that received delegation
     * @return delegation Delegation details
     */
    function getDelegation(address delegator, address delegatee) external view returns (Delegation memory delegation);
}
