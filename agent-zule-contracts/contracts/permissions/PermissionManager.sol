// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../interfaces/IPermissionManager.sol";
import "../interfaces/IVotingEngine.sol";
import "../libraries/MathUtils.sol";
import "../libraries/SecurityUtils.sol";

/**
 * @title PermissionManager
 * @dev Conditional Permissions System for Agent Zule
 * @notice Implements innovative conditional permissions with auto-revoke and escalation
 */
contract PermissionManager is IPermissionManager, AccessControl, ReentrancyGuard, Pausable {
    using MathUtils for uint256;
    
    // ============ Constants ============
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant RISK_MANAGER_ROLE = keccak256("RISK_MANAGER_ROLE");
    bytes32 public constant AI_AGENT_ROLE = keccak256("AI_AGENT_ROLE");
    
    uint256 public constant MAX_PERMISSIONS_PER_USER = 20;
    uint256 public constant MAX_CONDITIONAL_RULES = 50;
    uint256 public constant MAX_RISK_TOLERANCE = 1000;
    
    // ============ State Variables ============
    
    IVotingEngine public votingEngine;
    
    mapping(address => mapping(bytes32 => PermissionConfig)) public userPermissions;
    mapping(address => bytes32[]) public userPermissionList;
    mapping(bytes32 => ConditionalRule) public conditionalRules;
    mapping(address => RiskMetrics) public userRiskMetrics;
    mapping(address => uint256) public lastPermissionUpdate;
    
    bytes32[] public activeRules;
    uint256 public totalRules;
    
    bool public emergencyStop;
    string public emergencyReason;
    
    // ============ Modifiers ============
    
    modifier onlyAIAgent() {
        require(hasRole(AI_AGENT_ROLE, msg.sender), "PermissionManager: not AI agent");
        _;
    }
    
    modifier onlyRiskManager() {
        require(hasRole(RISK_MANAGER_ROLE, msg.sender), "PermissionManager: not risk manager");
        _;
    }
    
    modifier notEmergencyStopped() {
        require(!emergencyStop, "PermissionManager: emergency stop active");
        _;
    }
    
    modifier validPermissionConfig(PermissionConfig calldata config) {
        require(config.user != address(0), "PermissionManager: zero user address");
        require(config.threshold <= 10000, "PermissionManager: invalid threshold");
        require(config.riskTolerance <= MAX_RISK_TOLERANCE, "PermissionManager: invalid risk tolerance");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _votingEngine) {
        require(_votingEngine != address(0), "PermissionManager: zero voting engine");
        
        votingEngine = IVotingEngine(_votingEngine);
        
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        _setupRole(RISK_MANAGER_ROLE, msg.sender);
        _setupRole(AI_AGENT_ROLE, msg.sender);
    }
    
    // ============ Core Functions ============
    
    /**
     * @dev Grant conditional permission to a user
     * @param config Permission configuration including thresholds and conditions
     */
    function grantPermission(PermissionConfig calldata config) 
        external 
        override 
        onlyAIAgent 
        nonReentrant 
        whenNotPaused 
        notEmergencyStopped 
        validPermissionConfig(config) 
    {
        address user = config.user;
        bytes32 action = config.action;
        
        // Check if user already has max permissions
        require(userPermissionList[user].length < MAX_PERMISSIONS_PER_USER, "PermissionManager: max permissions reached");
        
        // Check if permission already exists
        require(!userPermissions[user][action].isActive, "PermissionManager: permission already exists");
        
        // Store permission
        userPermissions[user][action] = config;
        userPermissionList[user].push(action);
        
        // Update last permission update
        lastPermissionUpdate[user] = block.timestamp;
        
        emit PermissionGranted(user, action, config, block.timestamp);
    }
    
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
    ) 
        external 
        override 
        onlyAIAgent 
        nonReentrant 
        whenNotPaused 
    {
        require(userPermissions[user][action].isActive, "PermissionManager: permission not found");
        
        // Deactivate permission
        userPermissions[user][action].isActive = false;
        
        // Remove from user permission list
        _removeFromPermissionList(user, action);
        
        emit PermissionRevoked(user, action, reason, block.timestamp);
    }
    
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
    ) 
        external 
        view 
        override 
        returns (bool hasPermission, bool requiresVoting) 
    {
        PermissionConfig memory config = userPermissions[user][action];
        
        // Check if permission exists and is active
        if (!config.isActive) {
            return (false, false);
        }
        
        // Check cooldown
        if (block.timestamp < lastPermissionUpdate[user] + config.cooldown) {
            return (false, false);
        }
        
        // Check amount threshold
        if (amount > config.maxAmount) {
            return (false, false);
        }
        
        // Check risk tolerance
        RiskMetrics memory riskMetrics = userRiskMetrics[user];
        if (riskMetrics.volatility > config.riskTolerance) {
            return (false, false);
        }
        
        // Check conditional rules
        bool shouldAutoRevoke = _checkConditionalRules(user, action, riskMetrics);
        if (shouldAutoRevoke) {
            return (false, false);
        }
        
        // Check if escalation is required
        (bool shouldEscalate, uint256 voteId) = shouldEscalateToVoting(user, action, amount);
        if (shouldEscalate) {
            return (true, true);
        }
        
        return (true, false);
    }
    
    /**
     * @dev Add conditional rule for automatic permission management
     * @param rule Conditional rule configuration
     */
    function addConditionalRule(ConditionalRule calldata rule) 
        external 
        override 
        onlyRiskManager 
        nonReentrant 
        whenNotPaused 
    {
        require(totalRules < MAX_CONDITIONAL_RULES, "PermissionManager: max rules reached");
        require(rule.ruleId != bytes32(0), "PermissionManager: zero rule ID");
        require(rule.threshold <= 10000, "PermissionManager: invalid threshold");
        
        conditionalRules[rule.ruleId] = rule;
        activeRules.push(rule.ruleId);
        totalRules++;
        
        emit ConditionalRuleAdded(rule.ruleId, rule, block.timestamp);
    }
    
    /**
     * @dev Update risk metrics for permission evaluation
     * @param user User address
     * @param metrics Current risk metrics
     */
    function updateRiskMetrics(address user, RiskMetrics calldata metrics) 
        external 
        override 
        onlyAIAgent 
        nonReentrant 
        whenNotPaused 
    {
        require(user != address(0), "PermissionManager: zero user address");
        require(metrics.volatility <= 10000, "PermissionManager: invalid volatility");
        require(metrics.drawdown <= 10000, "PermissionManager: invalid drawdown");
        require(metrics.liquidity <= 1000, "PermissionManager: invalid liquidity");
        
        userRiskMetrics[user] = metrics;
        
        // Check if any permissions should be auto-revoked
        _checkAutoRevokeConditions(user);
    }
    
    /**
     * @dev Auto-revoke permissions based on market conditions
     * @param user User address
     * @param action Action type
     * @return wasRevoked True if permission was auto-revoked
     */
    function autoRevokeOnCondition(address user, bytes32 action) 
        external 
        override 
        onlyAIAgent 
        nonReentrant 
        whenNotPaused 
        returns (bool wasRevoked) 
    {
        RiskMetrics memory riskMetrics = userRiskMetrics[user];
        bool shouldRevoke = _checkConditionalRules(user, action, riskMetrics);
        
        if (shouldRevoke) {
            _revokePermission(user, action, "Auto-revoke: condition met");
            wasRevoked = true;
        }
    }
    
    // ============ View Functions ============
    
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
    ) 
        external 
        view 
        override 
        returns (PermissionConfig memory config, bool isActive) 
    {
        config = userPermissions[user][action];
        isActive = config.isActive;
    }
    
    /**
     * @dev Get all active permissions for a user
     * @param user User address
     * @return permissions Array of active permission configurations
     */
    function getUserPermissions(address user) 
        external 
        view 
        override 
        returns (PermissionConfig[] memory permissions) 
    {
        bytes32[] memory userActions = userPermissionList[user];
        permissions = new PermissionConfig[](userActions.length);
        
        for (uint256 i = 0; i < userActions.length; i++) {
            permissions[i] = userPermissions[user][userActions[i]];
        }
    }
    
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
    ) 
        public 
        view 
        override 
        returns (bool shouldEscalate, uint256 voteId) 
    {
        PermissionConfig memory config = userPermissions[user][action];
        
        if (!config.isActive) {
            return (false, 0);
        }
        
        // Check if escalation is required based on amount or risk
        RiskMetrics memory riskMetrics = userRiskMetrics[user];
        
        // Escalate if amount exceeds threshold or risk is high
        if (amount > config.maxAmount * 2 || riskMetrics.volatility > config.riskTolerance * 2) {
            return (true, 0); // Vote ID would be generated when creating the vote
        }
        
        return (false, 0);
    }
    
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
    ) 
        external 
        override 
        onlyAIAgent 
        nonReentrant 
        whenNotPaused 
    {
        require(userPermissions[user][action].isActive, "PermissionManager: permission not found");
        
        if (approved) {
            // Permission remains active
            emit PermissionGranted(user, action, userPermissions[user][action], block.timestamp);
        } else {
            // Revoke permission
            _revokePermission(user, action, "Community vote rejected");
        }
    }
    
    // ============ Internal Functions ============
    
    function _checkConditionalRules(
        address user,
        bytes32 action,
        RiskMetrics memory riskMetrics
    ) internal view returns (bool shouldAutoRevoke) {
        for (uint256 i = 0; i < activeRules.length; i++) {
            ConditionalRule memory rule = conditionalRules[activeRules[i]];
            
            if (rule.autoRevoke) {
                bool conditionMet = _evaluateCondition(rule.condition, rule.threshold, riskMetrics);
                if (conditionMet) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    function _evaluateCondition(
        bytes32 condition,
        uint256 threshold,
        RiskMetrics memory riskMetrics
    ) internal pure returns (bool) {
        if (condition == keccak256("VOLATILITY_GT_THRESHOLD")) {
            return riskMetrics.volatility > threshold;
        } else if (condition == keccak256("DRAWDOWN_GT_THRESHOLD")) {
            return riskMetrics.drawdown > threshold;
        } else if (condition == keccak256("LIQUIDITY_LT_THRESHOLD")) {
            return riskMetrics.liquidity < threshold;
        }
        
        return false;
    }
    
    function _checkAutoRevokeConditions(address user) internal {
        bytes32[] memory userActions = userPermissionList[user];
        
        for (uint256 i = 0; i < userActions.length; i++) {
            bytes32 action = userActions[i];
            PermissionConfig memory config = userPermissions[user][action];
            
            if (config.isActive) {
                RiskMetrics memory riskMetrics = userRiskMetrics[user];
                bool shouldRevoke = _checkConditionalRules(user, action, riskMetrics);
                
                if (shouldRevoke) {
                    _revokePermission(user, action, "Auto-revoke: risk conditions met");
                }
            }
        }
    }
    
    function _revokePermission(address user, bytes32 action, string memory reason) internal {
        userPermissions[user][action].isActive = false;
        _removeFromPermissionList(user, action);
        
        emit PermissionRevoked(user, action, reason, block.timestamp);
    }
    
    function _removeFromPermissionList(address user, bytes32 action) internal {
        bytes32[] storage userActions = userPermissionList[user];
        
        for (uint256 i = 0; i < userActions.length; i++) {
            if (userActions[i] == action) {
                userActions[i] = userActions[userActions.length - 1];
                userActions.pop();
                break;
            }
        }
    }
}
