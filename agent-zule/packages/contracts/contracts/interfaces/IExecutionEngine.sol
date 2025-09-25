// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IExecutionEngine
 * @dev Interface for the Execution Engine with Strategy Pattern
 * @notice This interface defines the modular execution system for Agent Zule
 */
interface IExecutionEngine {
    // ============ Structs ============
    
    struct ExecutionRequest {
        bytes32 requestId;
        address user;
        bytes32 strategyType;
        bytes data; // encoded strategy parameters
        uint256 maxSlippage; // in basis points
        uint256 deadline;
        bool requiresApproval;
        uint256 priority; // 0 = highest priority
    }
    
    struct ExecutionResult {
        bytes32 requestId;
        bool success;
        bytes returnData;
        uint256 gasUsed;
        uint256 actualSlippage; // in basis points
        uint256 timestamp;
        string errorMessage;
    }
    
    struct StrategyConfig {
        bytes32 strategyId;
        address strategyContract;
        bool isActive;
        uint256 maxGasLimit;
        uint256 maxSlippage;
        uint256 cooldownPeriod; // seconds
        uint256 lastExecution;
    }
    
    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        address[] path;
        uint256 deadline;
    }
    
    struct LiquidityParams {
        address tokenA;
        address tokenB;
        uint256 amountA;
        uint256 amountB;
        uint256 minAmountA;
        uint256 minAmountB;
        uint256 deadline;
    }
    
    // ============ Events ============
    
    event ExecutionRequested(
        bytes32 indexed requestId,
        address indexed user,
        bytes32 indexed strategyType,
        uint256 timestamp
    );
    
    event ExecutionCompleted(
        bytes32 indexed requestId,
        bool success,
        uint256 gasUsed,
        uint256 actualSlippage,
        uint256 timestamp
    );
    
    event StrategyRegistered(
        bytes32 indexed strategyId,
        address indexed strategyContract,
        StrategyConfig config,
        uint256 timestamp
    );
    
    event StrategyUpdated(
        bytes32 indexed strategyId,
        StrategyConfig oldConfig,
        StrategyConfig newConfig,
        uint256 timestamp
    );
    
    event ExecutionFailed(
        bytes32 indexed requestId,
        string reason,
        uint256 gasUsed,
        uint256 timestamp
    );
    
    event SlippageExceeded(
        bytes32 indexed requestId,
        uint256 expectedSlippage,
        uint256 actualSlippage,
        uint256 timestamp
    );
    
    // ============ Core Functions ============
    
    /**
     * @dev Execute a strategy with the given parameters
     * @param request Execution request with all necessary parameters
     * @return result Execution result with success status and data
     */
    function executeStrategy(ExecutionRequest calldata request) external returns (ExecutionResult memory result);
    
    /**
     * @dev Register a new strategy contract
     * @param strategyId Unique identifier for the strategy
     * @param strategyContract Address of the strategy contract
     * @param config Strategy configuration parameters
     */
    function registerStrategy(
        bytes32 strategyId,
        address strategyContract,
        StrategyConfig calldata config
    ) external;
    
    /**
     * @dev Update strategy configuration
     * @param strategyId Strategy identifier
     * @param config New configuration parameters
     */
    function updateStrategy(bytes32 strategyId, StrategyConfig calldata config) external;
    
    /**
     * @dev Execute a token swap
     * @param params Swap parameters including tokens and amounts
     * @return amountOut Actual amount of tokens received
     */
    function executeSwap(SwapParams calldata params) external returns (uint256 amountOut);
    
    /**
     * @dev Add liquidity to a pool
     * @param params Liquidity parameters including tokens and amounts
     * @return liquidity Amount of liquidity tokens received
     */
    function addLiquidity(LiquidityParams calldata params) external returns (uint256 liquidity);
    
    /**
     * @dev Remove liquidity from a pool
     * @param liquidityToken Address of the liquidity token
     * @param amount Amount of liquidity tokens to burn
     * @param minAmountA Minimum amount of token A to receive
     * @param minAmountB Minimum amount of token B to receive
     * @param deadline Deadline for the transaction
     * @return amountA Amount of token A received
     * @return amountB Amount of token B received
     */
    function removeLiquidity(
        address liquidityToken,
        uint256 amount,
        uint256 minAmountA,
        uint256 minAmountB,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);
    
    /**
     * @dev Get execution status for a request
     * @param requestId Request identifier
     * @return status Current execution status
     * @return result Execution result if completed
     */
    function getExecutionStatus(bytes32 requestId) external view returns (
        string memory status,
        ExecutionResult memory result
    );
    
    /**
     * @dev Get all registered strategies
     * @return strategies Array of strategy configurations
     */
    function getRegisteredStrategies() external view returns (StrategyConfig[] memory strategies);
    
    /**
     * @dev Check if a strategy is available for execution
     * @param strategyId Strategy identifier
     * @return isAvailable True if strategy can be executed
     * @return reason Reason if not available
     */
    function isStrategyAvailable(bytes32 strategyId) external view returns (bool isAvailable, string memory reason);
    
    /**
     * @dev Get execution history for a user
     * @param user User address
     * @param limit Maximum number of results to return
     * @return executions Array of execution results
     */
    function getUserExecutions(address user, uint256 limit) external view returns (ExecutionResult[] memory executions);
    
    /**
     * @dev Estimate gas cost for strategy execution
     * @param strategyId Strategy identifier
     * @param data Encoded strategy parameters
     * @return gasEstimate Estimated gas cost
     */
    function estimateGasCost(bytes32 strategyId, bytes calldata data) external view returns (uint256 gasEstimate);
    
    /**
     * @dev Cancel a pending execution request
     * @param requestId Request identifier
     * @param reason Reason for cancellation
     */
    function cancelExecution(bytes32 requestId, string calldata reason) external;
    
    /**
     * @dev Emergency pause all executions
     * @param reason Reason for emergency pause
     */
    function emergencyPause(string calldata reason) external;
    
    /**
     * @dev Resume executions after emergency pause
     */
    function resumeExecutions() external;
}
