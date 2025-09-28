// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IPortfolioAgent.sol";
import "../interfaces/IPermissionManager.sol";
import "../interfaces/IVotingEngine.sol";
import "../interfaces/IExecutionEngine.sol";
import "../libraries/MathUtils.sol";
import "../libraries/SecurityUtils.sol";

/**
 * @title PortfolioAgent
 * @dev Main orchestrator contract for Agent Zule's portfolio management
 * @notice Implements AI-powered portfolio rebalancing with conditional permissions
 */
contract PortfolioAgent is IPortfolioAgent, AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using MathUtils for uint256;
    
    // ============ Constants ============
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant AI_AGENT_ROLE = keccak256("AI_AGENT_ROLE");
    bytes32 public constant RISK_MANAGER_ROLE = keccak256("RISK_MANAGER_ROLE");
    
    uint256 public constant MAX_POSITIONS = 50;
    uint256 public constant MIN_REBALANCE_INTERVAL = 3600; // 1 hour
    uint256 public constant MAX_SLIPPAGE = 5000; // 50%
    
    // ============ State Variables ============
    
    IPermissionManager public permissionManager;
    IVotingEngine public votingEngine;
    IExecutionEngine public executionEngine;
    
    mapping(address => Position[]) public userPositions;
    mapping(address => uint256) public lastRebalance;
    mapping(address => uint256) public totalPortfolioValue;
    mapping(address => RiskMetrics) public userRiskMetrics;
    
    uint256 public maxVolatilityThreshold = 5000; // 50%
    uint256 public maxDrawdownThreshold = 3000; // 30%
    uint256 public rebalanceThreshold = 500; // 5%
    
    bool public isEmergencyStopped;
    string public emergencyReason;
    
    // ============ Structs ============
    
    struct RiskMetrics {
        uint256 volatility;
        uint256 drawdown;
        uint256 correlation;
        uint256 liquidity;
        uint256 lastUpdated;
    }
    
    // ============ Events ============
    
    
    // ============ Modifiers ============
    
    modifier onlyAiAgent() {
        require(hasRole(AI_AGENT_ROLE, msg.sender), "PortfolioAgent: not AI agent");
        _;
    }
    
    modifier onlyRiskManager() {
        require(hasRole(RISK_MANAGER_ROLE, msg.sender), "PortfolioAgent: not risk manager");
        _;
    }
    
    modifier notEmergencyStopped() {
        require(!isEmergencyStopped, "PortfolioAgent: emergency stop active");
        _;
    }
    
    modifier validPositions(Position[] memory positions) {
        require(positions.length <= MAX_POSITIONS, "PortfolioAgent: too many positions");
        require(positions.length > 0, "PortfolioAgent: no positions");
        
        uint256 totalWeight = 0;
        for (uint256 i = 0; i < positions.length; i++) {
            require(positions[i].token != address(0), "PortfolioAgent: zero token address");
            require(positions[i].targetWeight <= 10000, "PortfolioAgent: invalid weight");
            totalWeight = totalWeight.safeAdd(positions[i].targetWeight);
        }
        require(totalWeight == 10000, "PortfolioAgent: weights must sum to 100%");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address _permissionManager,
        address _votingEngine,
        address _executionEngine
    ) {
        require(_permissionManager != address(0), "PortfolioAgent: zero permission manager");
        require(_votingEngine != address(0), "PortfolioAgent: zero voting engine");
        require(_executionEngine != address(0), "PortfolioAgent: zero execution engine");
        
        permissionManager = IPermissionManager(_permissionManager);
        votingEngine = IVotingEngine(_votingEngine);
        executionEngine = IExecutionEngine(_executionEngine);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(AI_AGENT_ROLE, msg.sender);
        _grantRole(RISK_MANAGER_ROLE, msg.sender);
    }
    
    // ============ Core Functions ============
    
    /**
     * @dev Execute portfolio rebalancing based on AI recommendations
     * @param params Rebalancing parameters including new positions and slippage limits
     */
    function executeRebalancing(RebalanceParams calldata params) 
        external 
        override 
        onlyAiAgent 
        nonReentrant 
        whenNotPaused 
        notEmergencyStopped 
        validPositions(params.newPositions) 
    {
        address user = msg.sender;
        
        // Check permissions
        (bool userHasPermission, bool requiresVoting) = permissionManager.checkPermission(
            user, 
            keccak256("REBALANCE"), 
            _calculateTotalValue(params.newPositions)
        );
        
        require(userHasPermission, "PortfolioAgent: insufficient permissions");
        
        // Check cooldown
        SecurityUtils.checkCooldown(lastRebalance[user], MIN_REBALANCE_INTERVAL);
        
        // Validate slippage
        SecurityUtils.validateSlippage(params.maxSlippage);
        SecurityUtils.validateDeadline(params.deadline);
        
        // Store old positions
        Position[] memory oldPositions = userPositions[user];
        
        // Update positions
        _updateUserPositions(user, params.newPositions);
        
        // Execute rebalancing if not requiring voting
        if (!requiresVoting || params.executeImmediately) {
            _executeRebalancing(user, oldPositions, params.newPositions, params.maxSlippage, params.deadline);
        } else {
            // Escalate to community voting
            _escalateToVoting(user, "REBALANCE", abi.encode(params));
        }
        
        // Update last rebalance time
        lastRebalance[user] = block.timestamp;
        
        emit PortfolioRebalanced(user, oldPositions, params.newPositions, block.timestamp);
    }
    
    /**
     * @dev Execute yield optimization by moving funds to higher-yielding pools
     * @param opportunity The yield opportunity to execute
     * @param amount Amount to move to the new pool
     */
    function executeYieldOptimization(
        YieldOpportunity calldata opportunity,
        uint256 amount
    ) 
        external 
        override 
        onlyAiAgent 
        nonReentrant 
        whenNotPaused 
        notEmergencyStopped 
    {
        address user = msg.sender;
        
        // Validate opportunity
        require(opportunity.pool != address(0), "PortfolioAgent: zero pool address");
        require(opportunity.token != address(0), "PortfolioAgent: zero token address");
        require(amount > 0, "PortfolioAgent: zero amount");
        require(opportunity.riskScore <= 1000, "PortfolioAgent: invalid risk score");
        
        // Check permissions
        (bool userHasPermission, bool requiresVoting) = permissionManager.checkPermission(
            user, 
            keccak256("YIELD_OPTIMIZE"), 
            amount
        );
        
        require(userHasPermission, "PortfolioAgent: insufficient permissions");
        
        // Check risk tolerance
        require(opportunity.riskScore <= userRiskMetrics[user].volatility, "PortfolioAgent: risk too high");
        
        if (requiresVoting) {
            // Escalate to community voting
            _escalateToVoting(user, "YIELD_OPTIMIZE", abi.encode(opportunity, amount));
            return;
        }
        
        // Execute yield optimization
        _executeYieldOptimization(user, opportunity, amount);
        
        emit YieldOptimized(user, address(0), opportunity.pool, amount, opportunity.expectedApy);
    }
    
    /**
     * @dev Execute dollar-cost averaging strategy
     * @param params DCA parameters including token, amount, and frequency
     */
    function executeDca(DcaParams calldata params) 
        external 
        override 
        onlyAiAgent 
        nonReentrant 
        whenNotPaused 
        notEmergencyStopped 
    {
        address user = msg.sender;
        
        // Validate parameters
        require(params.token != address(0), "PortfolioAgent: zero token address");
        require(params.amount > 0, "PortfolioAgent: zero amount");
        require(params.frequency > 0, "PortfolioAgent: zero frequency");
        require(params.duration > 0, "PortfolioAgent: zero duration");
        SecurityUtils.validateSlippage(params.maxSlippage);
        
        // Check permissions
        (bool userHasPermission, bool requiresVoting) = permissionManager.checkPermission(
            user, 
            keccak256("DCA"), 
            params.amount
        );
        
        require(userHasPermission, "PortfolioAgent: insufficient permissions");
        
        if (requiresVoting) {
            // Escalate to community voting
            _escalateToVoting(user, "DCA", abi.encode(params));
            return;
        }
        
        // Execute DCA
        _executeDca(user, params);
        
        emit DCAExecuted(user, params.token, params.amount, params.duration / params.frequency);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get current portfolio positions for a user
     * @param user User address
     * @return positions Array of current positions
     */
    function getPortfolioPositions(address user) external view override returns (Position[] memory positions) {
        return userPositions[user];
    }
    
    /**
     * @dev Get portfolio performance metrics
     * @param user User address
     * @return totalValue Total portfolio value in USD
     * @return totalReturn Total return percentage
     * @return sharpeRatio Risk-adjusted return metric
     */
    function getPortfolioMetrics(address user) external view override returns (
        uint256 totalValue,
        int256 totalReturn,
        uint256 sharpeRatio
    ) {
        totalValue = totalPortfolioValue[user];
        // Implementation would calculate actual returns and Sharpe ratio
        // For now, returning placeholder values
        totalReturn = 0;
        sharpeRatio = 0;
    }
    
    /**
     * @dev Check if user has sufficient permissions for action
     * @param user User address
     * @param action Action type identifier
     * @return userHasPermission True if user can execute the action
     */
    function hasPermission(address user, bytes32 action) external view override returns (bool userHasPermission) {
        (userHasPermission,) = permissionManager.checkPermission(user, action, 0);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev Update risk management parameters
     * @param maxVolatility Maximum allowed volatility threshold
     * @param maxDrawdown Maximum allowed drawdown threshold
     */
    function updateRiskParameters(uint256 maxVolatility, uint256 maxDrawdown) external override onlyRiskManager {
        require(maxVolatility <= 10000, "PortfolioAgent: invalid volatility threshold");
        require(maxDrawdown <= 10000, "PortfolioAgent: invalid drawdown threshold");
        
        uint256 oldVolatility = maxVolatilityThreshold;
        // uint256 oldDrawdown = maxDrawdownThreshold;
        
        maxVolatilityThreshold = maxVolatility;
        maxDrawdownThreshold = maxDrawdown;
        
        emit RiskThresholdUpdated(msg.sender, oldVolatility, maxVolatility);
    }
    
    /**
     * @dev Emergency stop function to halt all automated actions
     * @param reason Reason for emergency stop
     */
    function emergencyStop(string calldata reason) external override onlyRole(ADMIN_ROLE) {
        isEmergencyStopped = true;
        emergencyReason = reason;
        emit EmergencyStopActivated(msg.sender, reason);
    }
    
    /**
     * @dev Resume operations after emergency stop
     */
    function resumeOperations() external override onlyRole(ADMIN_ROLE) {
        isEmergencyStopped = false;
        emergencyReason = "";
    }
    
    // ============ Internal Functions ============
    
    function _updateUserPositions(address user, Position[] memory newPositions) internal {
        delete userPositions[user];
        for (uint256 i = 0; i < newPositions.length; i++) {
            userPositions[user].push(newPositions[i]);
        }
    }
    
    function _calculateTotalValue(Position[] memory positions) internal pure returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < positions.length; i++) {
            total = total.safeAdd(positions[i].amount);
        }
        return total;
    }
    
    function _executeRebalancing(
        address user,
        Position[] memory oldPositions,
        Position[] memory newPositions,
        uint256 maxSlippage,
        uint256 deadline
    ) internal {
        // Implementation would execute actual rebalancing trades
        // This is a placeholder for the actual execution logic
    }
    
    function _executeYieldOptimization(
        address user,
        YieldOpportunity calldata opportunity,
        uint256 amount
    ) internal {
        // Implementation would execute yield optimization
        // This is a placeholder for the actual execution logic
    }
    
    function _executeDca(address user, DcaParams calldata params) internal {
        // Implementation would execute DCA strategy
        // This is a placeholder for the actual execution logic
    }
    
    function _escalateToVoting(address /* user */, bytes32 /* actionType */, bytes memory /* data */) internal {
        string memory description = "Escalated action";
        votingEngine.createVote(description, bytes32(0), "", 86400); // 24 hours
    }
}
