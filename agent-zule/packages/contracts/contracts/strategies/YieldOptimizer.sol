// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../libraries/MathUtils.sol";
import "../libraries/SecurityUtils.sol";

/**
 * @title YieldOptimizer
 * @dev Yield optimization strategy for Agent Zule
 * @notice Implements automated yield farming with slippage protection
 */
contract YieldOptimizer is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using MathUtils for uint256;
    
    // ============ Constants ============
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant STRATEGY_ROLE = keccak256("STRATEGY_ROLE");
    
    uint256 public constant MAX_SLIPPAGE = 5000; // 50%
    uint256 public constant MIN_AMOUNT = 1e6; // 0.000001 tokens
    
    // ============ State Variables ============
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userRewards;
    mapping(address => bool) public activeStrategies;
    
    uint256 public totalDeposits;
    uint256 public totalRewards;
    uint256 public lastHarvest;
    
    bool public emergencyStop;
    string public emergencyReason;
    
    // ============ Events ============
    
    event StrategyActivated(address indexed user, uint256 amount, uint256 timestamp);
    event StrategyDeactivated(address indexed user, uint256 amount, uint256 timestamp);
    event RewardsHarvested(address indexed user, uint256 amount, uint256 timestamp);
    event EmergencyStopActivated(string reason, uint256 timestamp);
    
    // ============ Constructor ============
    
    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        _setupRole(STRATEGY_ROLE, msg.sender);
    }
    
    // ============ Core Functions ============
    
    /**
     * @dev Activate yield optimization strategy
     * @param amount Amount to deposit
     * @param maxSlippage Maximum slippage tolerance
     */
    function activateStrategy(uint256 amount, uint256 maxSlippage) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(amount >= MIN_AMOUNT, "YieldOptimizer: amount too small");
        require(maxSlippage <= MAX_SLIPPAGE, "YieldOptimizer: slippage too high");
        require(!activeStrategies[msg.sender], "YieldOptimizer: strategy already active");
        
        // Update user deposits
        userDeposits[msg.sender] = userDeposits[msg.sender].safeAdd(amount);
        totalDeposits = totalDeposits.safeAdd(amount);
        activeStrategies[msg.sender] = true;
        
        emit StrategyActivated(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev Deactivate yield optimization strategy
     * @param amount Amount to withdraw
     * @param minAmountOut Minimum amount to receive
     */
    function deactivateStrategy(uint256 amount, uint256 minAmountOut) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(activeStrategies[msg.sender], "YieldOptimizer: strategy not active");
        require(amount <= userDeposits[msg.sender], "YieldOptimizer: insufficient balance");
        
        // Update user deposits
        userDeposits[msg.sender] = userDeposits[msg.sender].safeSub(amount);
        totalDeposits = totalDeposits.safeSub(amount);
        
        if (userDeposits[msg.sender] == 0) {
            activeStrategies[msg.sender] = false;
        }
        
        emit StrategyDeactivated(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev Harvest rewards from yield strategy
     */
    function harvestRewards() external nonReentrant whenNotPaused {
        require(activeStrategies[msg.sender], "YieldOptimizer: strategy not active");
        
        uint256 rewards = _calculateRewards(msg.sender);
        require(rewards > 0, "YieldOptimizer: no rewards to harvest");
        
        userRewards[msg.sender] = userRewards[msg.sender].safeAdd(rewards);
        totalRewards = totalRewards.safeAdd(rewards);
        lastHarvest = block.timestamp;
        
        emit RewardsHarvested(msg.sender, rewards, block.timestamp);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get user's current strategy status
     * @param user User address
     * @return isActive Whether strategy is active
     * @return depositAmount Current deposit amount
     * @return pendingRewards Pending rewards
     */
    function getUserStrategy(address user) external view returns (
        bool isActive,
        uint256 depositAmount,
        uint256 pendingRewards
    ) {
        isActive = activeStrategies[user];
        depositAmount = userDeposits[user];
        pendingRewards = _calculateRewards(user);
    }
    
    /**
     * @dev Get strategy performance metrics
     * @return totalDeposits Total deposits across all users
     * @return totalRewards Total rewards generated
     * @return apy Current APY percentage
     */
    function getStrategyMetrics() external view returns (
        uint256 totalDeposits,
        uint256 totalRewards,
        uint256 apy
    ) {
        totalDeposits = totalDeposits;
        totalRewards = totalRewards;
        apy = _calculateAPY();
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev Emergency stop the strategy
     * @param reason Reason for emergency stop
     */
    function emergencyStop(string calldata reason) external onlyRole(ADMIN_ROLE) {
        emergencyStop = true;
        emergencyReason = reason;
        emit EmergencyStopActivated(reason, block.timestamp);
    }
    
    /**
     * @dev Resume strategy after emergency stop
     */
    function resumeStrategy() external onlyRole(ADMIN_ROLE) {
        emergencyStop = false;
        emergencyReason = "";
    }
    
    // ============ Internal Functions ============
    
    function _calculateRewards(address user) internal view returns (uint256) {
        if (!activeStrategies[user] || userDeposits[user] == 0) {
            return 0;
        }
        
        // Placeholder calculation - in real implementation would use actual yield data
        uint256 timeElapsed = block.timestamp - lastHarvest;
        uint256 apy = _calculateAPY();
        uint256 rewards = (userDeposits[user] * apy * timeElapsed) / (365 * 24 * 3600 * 10000);
        
        return rewards;
    }
    
    function _calculateAPY() internal view returns (uint256) {
        // Placeholder APY calculation - in real implementation would use market data
        return 1000; // 10% APY
    }
    
    modifier whenNotPaused() {
        require(!emergencyStop, "YieldOptimizer: emergency stop active");
        _;
    }
}
