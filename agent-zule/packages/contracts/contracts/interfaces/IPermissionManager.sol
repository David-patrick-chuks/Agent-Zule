// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IPermissionManager
 * @dev Interface for the Conditional Permissions System
 * @notice This interface defines the innovative conditional permissions for Agent Zule
 */
interface IPermissionManager {
    // ============ Structs ============
    
    struct PermissionConfig {
        address user;
        bytes32 action;
        uint256 threshold; // in basis points
        uint256 cooldown; // seconds
        bool isActive;
        bool requiresVoting;
        uint256 maxAmount; // maximum amount for this permission
        uint256 riskTolerance; // 0-1000
    }
    
    struct ConditionalRule {
        bytes32 ruleId;
        bytes32 condition; // e.g., "VOLATILITY_GT_50", "PRICE_DROP_GT_10"
        uint256 threshold;
        bool autoRevoke;
        bool escalateToVoting;
        uint256 gracePeriod; // seconds before auto-revoke
    }
    
    struct RiskMetrics {
        uint256 volatility; // in basis points
        uint256 drawdown; // in basis points
        uint256 correlation; // correlation with market
        uint256 liquidity; // liquidity score 0-1000
        uint256 lastUpdated;
    }
    
    // ============ Events ============
    
    event PermissionGranted(
        address indexed user,
        bytes32 indexed action,
        PermissionConfig config,
        uint256 timestamp
    );
    
    event PermissionRevoked(
        address indexed user,
        bytes32 indexed action,
        string reason,
        uint256 timestamp
    );
    
    event ConditionalRuleAdded(
        bytes32 indexed ruleId,
        ConditionalRule rule,
        uint256 timestamp
    );
    
    event AutoRevokeTriggered(
        address indexed user,
        bytes32 indexed action,
        bytes32 indexed ruleId,
        uint256 timestamp
    );
    
    event RiskThresholdExceeded(
        address indexed user,
        bytes32 indexed action,
        RiskMetrics metrics,
        uint256 timestamp
    );
    
    event PermissionEscalated(
        address indexed user,
        bytes32 indexed action,
        uint256 voteId,
        uint256 timestamp
    );
    
    // ============ Core Functions ============
    
    /**
     * @dev Grant conditional permission to a user
     * @param config Permission configuration including thresholds and conditions
     */
    function grantPermission(PermissionConfig calldata config) external;
    
    /**
     * @dev Revoke permission for a user
     * @param user User address
     * @param action Action type
     * @param reason Reason for revocation
     */
    function revokePermission(
        address user,
        bytes32 action,
        string calldata reason
    ) external;
    
    /**
     * @dev Check if user has permission for action with current market conditions
     * @param user User address
     * @param action Action type
     * @param amount Amount being requested
     * @return hasPermission True if permission is granted
     * @return requiresVoting True if action requires community voting
     */
    function checkPermission(
        address user,
        bytes32 action,
        uint256 amount
    ) external view returns (bool hasPermission, bool requiresVoting);
    
    /**
     * @dev Add conditional rule for automatic permission management
     * @param rule Conditional rule configuration
     */
    function addConditionalRule(ConditionalRule calldata rule) external;
    
    /**
     * @dev Update risk metrics for permission evaluation
     * @param user User address
     * @param metrics Current risk metrics
     */
    function updateRiskMetrics(address user, RiskMetrics calldata metrics) external;
    
    /**
     * @dev Auto-revoke permissions based on market conditions
     * @param user User address
     * @param action Action type
     * @return wasRevoked True if permission was auto-revoked
     */
    function autoRevokeOnCondition(address user, bytes32 action) external returns (bool wasRevoked);
    
    /**
     * @dev Get current permission status for user
     * @param user User address
     * @param action Action type
     * @return config Current permission configuration
     * @return isActive True if permission is currently active
     */
    function getPermissionStatus(
        address user,
        bytes32 action
    ) external view returns (PermissionConfig memory config, bool isActive);
    
    /**
     * @dev Get all active permissions for a user
     * @param user User address
     * @return permissions Array of active permission configurations
     */
    function getUserPermissions(address user) external view returns (PermissionConfig[] memory permissions);
    
    /**
     * @dev Check if action should be escalated to community voting
     * @param user User address
     * @param action Action type
     * @param amount Amount being requested
     * @return shouldEscalate True if action should go to voting
     * @return voteId Vote ID if escalation is needed
     */
    function shouldEscalateToVoting(
        address user,
        bytes32 action,
        uint256 amount
    ) external view returns (bool shouldEscalate, uint256 voteId);
    
    /**
     * @dev Update permission after community vote
     * @param user User address
     * @param action Action type
     * @param approved True if community approved the action
     */
    function updatePermissionAfterVote(
        address user,
        bytes32 action,
        bool approved
    ) external;
}
