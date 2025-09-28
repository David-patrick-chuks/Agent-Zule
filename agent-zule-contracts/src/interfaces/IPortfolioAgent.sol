// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IPortfolioAgent
 * @dev Interface for the main Portfolio Agent contract
 * @notice This interface defines the core functionality for Agent Zule's portfolio management
 */
interface IPortfolioAgent {
    // ============ Structs ============
    
    struct Position {
        address token;
        uint256 amount;
        uint256 targetWeight; // in basis points (10000 = 100%)
        uint256 currentWeight;
        uint256 lastRebalance;
        bool isActive;
    }
    
    struct RebalanceParams {
        Position[] newPositions;
        uint256 maxSlippage; // in basis points
        uint256 deadline;
        bool executeImmediately;
    }
    
    struct YieldOpportunity {
        address pool;
        address token;
        uint256 expectedApy;
        uint256 minAmount;
        uint256 maxAmount;
        uint256 riskScore; // 0-1000
    }
    
    struct DcaParams {
        address token;
        uint256 amount;
        uint256 frequency; // seconds between purchases
        uint256 duration; // total duration in seconds
        uint256 maxSlippage;
    }
    
    // ============ Events ============
    
    event PortfolioRebalanced(
        address indexed user,
        Position[] oldPositions,
        Position[] newPositions,
        uint256 timestamp
    );
    
    event YieldOptimized(
        address indexed user,
        address indexed oldPool,
        address indexed newPool,
        uint256 amount,
        uint256 expectedGain
    );
    
    event DCAExecuted(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 remainingExecutions
    );
    
    event RiskThresholdUpdated(
        address indexed user,
        uint256 oldThreshold,
        uint256 newThreshold
    );
    
    event EmergencyStopActivated(address indexed user, string reason);
    
    // ============ Core Functions ============
    
    /**
     * @dev Execute portfolio rebalancing based on AI recommendations
     * @param params Rebalancing parameters including new positions and slippage limits
     */
    function executeRebalancing(RebalanceParams calldata params) external;
    
    /**
     * @dev Execute yield optimization by moving funds to higher-yielding pools
     * @param opportunity The yield opportunity to execute
     * @param amount Amount to move to the new pool
     */
    function executeYieldOptimization(
        YieldOpportunity calldata opportunity,
        uint256 amount
    ) external;
    
    /**
     * @dev Execute dollar-cost averaging strategy
     * @param params DCA parameters including token, amount, and frequency
     */
    function executeDca(DcaParams calldata params) external;
    
    /**
     * @dev Get current portfolio positions for a user
     * @param user User address
     * @return positions Array of current positions
     */
    function getPortfolioPositions(address user) external view returns (Position[] memory positions);
    
    /**
     * @dev Get portfolio performance metrics
     * @param user User address
     * @return totalValue Total portfolio value in USD
     * @return totalReturn Total return percentage
     * @return sharpeRatio Risk-adjusted return metric
     */
    function getPortfolioMetrics(address user) external view returns (
        uint256 totalValue,
        int256 totalReturn,
        uint256 sharpeRatio
    );
    
    /**
     * @dev Check if user has sufficient permissions for action
     * @param user User address
     * @param action Action type identifier
     * @return hasPermission True if user can execute the action
     */
    function hasPermission(address user, bytes32 action) external view returns (bool hasPermission);
    
    /**
     * @dev Update risk management parameters
     * @param maxVolatility Maximum allowed volatility threshold
     * @param maxDrawdown Maximum allowed drawdown threshold
     */
    function updateRiskParameters(uint256 maxVolatility, uint256 maxDrawdown) external;
    
    /**
     * @dev Emergency stop function to halt all automated actions
     * @param reason Reason for emergency stop
     */
    function emergencyStop(string calldata reason) external;
    
    /**
     * @dev Resume operations after emergency stop
     */
    function resumeOperations() external;
}
