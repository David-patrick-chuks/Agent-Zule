// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IExecutionEngine.sol";
import "../interfaces/IPortfolioAgent.sol";
import "../libraries/MathUtils.sol";
import "../libraries/SecurityUtils.sol";

/**
 * @title ExecutionEngine
 * @dev Modular Execution System for Agent Zule
 * @notice Implements strategy pattern for executing AI recommendations
 */
contract ExecutionEngine is IExecutionEngine, AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using MathUtils for uint256;
    
    // ============ Constants ============
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant STRATEGY_MANAGER_ROLE = keccak256("STRATEGY_MANAGER_ROLE");
    
    uint256 public constant MAX_STRATEGIES = 50;
    uint256 public constant MAX_GAS_LIMIT = 1000000;
    uint256 public constant MAX_SLIPPAGE = 5000; // 50%
    uint256 public constant MIN_COOLDOWN = 60; // 1 minute
    
    // ============ State Variables ============
    
    mapping(bytes32 => StrategyConfig) public strategies;
    mapping(bytes32 => ExecutionRequest) public executionRequests;
    mapping(bytes32 => ExecutionResult) public executionResults;
    mapping(address => bytes32[]) public userExecutions;
    
    bytes32[] public registeredStrategies;
    uint256 public nextRequestId = 1;
    
    bool public isEmergencyPaused;
    string public emergencyReason;
    
    // ============ Modifiers ============
    
    modifier onlyExecutor() {
        require(hasRole(EXECUTOR_ROLE, msg.sender), "ExecutionEngine: not executor");
        _;
    }
    
    modifier onlyStrategyManager() {
        require(hasRole(STRATEGY_MANAGER_ROLE, msg.sender), "ExecutionEngine: not strategy manager");
        _;
    }
    
    modifier notEmergencyPaused() {
        require(!isEmergencyPaused, "ExecutionEngine: emergency pause active");
        _;
    }
    
    modifier validStrategyId(bytes32 strategyId) {
        require(strategies[strategyId].isActive, "ExecutionEngine: strategy not found");
        _;
    }
    
    modifier validRequestId(bytes32 requestId) {
        require(executionRequests[requestId].user != address(0), "ExecutionEngine: invalid request ID");
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(EXECUTOR_ROLE, msg.sender);
        _grantRole(STRATEGY_MANAGER_ROLE, msg.sender);
    }
    
    // ============ Core Functions ============
    
    /**
     * @dev Execute a strategy with the given parameters
     * @param request Execution request with all necessary parameters
     * @return result Execution result with success status and data
     */
    function executeStrategy(ExecutionRequest calldata request) 
        external 
        override 
        onlyExecutor 
        nonReentrant 
        whenNotPaused 
        notEmergencyPaused 
        validStrategyId(request.strategyType) 
        returns (ExecutionResult memory result) 
    {
        // Validate request
        _validateExecutionRequest(request);
        
        // Check cooldown
        StrategyConfig memory strategy = strategies[request.strategyType];
        SecurityUtils.checkCooldown(strategy.lastExecution, strategy.cooldownPeriod);
        
        // Generate request ID
        bytes32 requestId = keccak256(abi.encodePacked(
            request.user,
            request.strategyType,
            block.timestamp,
            nextRequestId++
        ));
        
        // Store request
        executionRequests[requestId] = request;
        userExecutions[request.user].push(requestId);
        
        emit ExecutionRequested(requestId, request.user, request.strategyType, block.timestamp);
        
        // Execute strategy based on type
        bool success;
        bytes memory returnData;
        uint256 gasUsed;
        uint256 actualSlippage;
        string memory errorMessage;
        
        try this._executeStrategyInternal(requestId, request) returns (bool _success, bytes memory _returnData, uint256 _gasUsed, uint256 _actualSlippage) {
            success = _success;
            returnData = _returnData;
            gasUsed = _gasUsed;
            actualSlippage = _actualSlippage;
        } catch Error(string memory reason) {
            success = false;
            returnData = abi.encode(reason);
            gasUsed = gasleft();
            actualSlippage = 0;
            errorMessage = reason;
        } catch {
            success = false;
            returnData = abi.encode("Unknown error");
            gasUsed = gasleft();
            actualSlippage = 0;
            errorMessage = "Unknown error";
        }
        
        // Create result
        result = ExecutionResult({
            requestId: requestId,
            success: success,
            returnData: returnData,
            gasUsed: gasUsed,
            actualSlippage: actualSlippage,
            timestamp: block.timestamp,
            errorMessage: errorMessage
        });
        
        // Store result
        executionResults[requestId] = result;
        
        // Update strategy last execution
        strategies[request.strategyType].lastExecution = block.timestamp;
        
        if (success) {
            emit ExecutionCompleted(requestId, success, gasUsed, actualSlippage, block.timestamp);
        } else {
            emit ExecutionFailed(requestId, errorMessage, gasUsed, block.timestamp);
        }
        
        return result;
    }
    
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
    ) 
        external 
        override 
        onlyStrategyManager 
        nonReentrant 
        whenNotPaused 
    {
        require(strategyId != bytes32(0), "ExecutionEngine: zero strategy ID");
        require(strategyContract != address(0), "ExecutionEngine: zero strategy contract");
        require(registeredStrategies.length < MAX_STRATEGIES, "ExecutionEngine: max strategies reached");
        require(!strategies[strategyId].isActive, "ExecutionEngine: strategy already exists");
        
        // Validate config
        require(config.maxGasLimit <= MAX_GAS_LIMIT, "ExecutionEngine: gas limit too high");
        require(config.maxSlippage <= MAX_SLIPPAGE, "ExecutionEngine: slippage too high");
        require(config.cooldownPeriod >= MIN_COOLDOWN, "ExecutionEngine: cooldown too short");
        
        // Store strategy
        strategies[strategyId] = StrategyConfig({
            strategyId: strategyId,
            strategyContract: strategyContract,
            isActive: true,
            maxGasLimit: config.maxGasLimit,
            maxSlippage: config.maxSlippage,
            cooldownPeriod: config.cooldownPeriod,
            lastExecution: 0
        });
        
        registeredStrategies.push(strategyId);
        
        emit StrategyRegistered(strategyId, strategyContract, config, block.timestamp);
    }
    
    /**
     * @dev Update strategy configuration
     * @param strategyId Strategy identifier
     * @param config New configuration parameters
     */
    function updateStrategy(bytes32 strategyId, StrategyConfig calldata config) 
        external 
        override 
        onlyStrategyManager 
        nonReentrant 
        whenNotPaused 
        validStrategyId(strategyId) 
    {
        StrategyConfig memory oldConfig = strategies[strategyId];
        
        // Validate new config
        require(config.maxGasLimit <= MAX_GAS_LIMIT, "ExecutionEngine: gas limit too high");
        require(config.maxSlippage <= MAX_SLIPPAGE, "ExecutionEngine: slippage too high");
        require(config.cooldownPeriod >= MIN_COOLDOWN, "ExecutionEngine: cooldown too short");
        
        // Update strategy
        strategies[strategyId] = StrategyConfig({
            strategyId: strategyId,
            strategyContract: config.strategyContract,
            isActive: config.isActive,
            maxGasLimit: config.maxGasLimit,
            maxSlippage: config.maxSlippage,
            cooldownPeriod: config.cooldownPeriod,
            lastExecution: oldConfig.lastExecution
        });
        
        emit StrategyUpdated(strategyId, oldConfig, config, block.timestamp);
    }
    
    /**
     * @dev Execute a token swap
     * @param params Swap parameters including tokens and amounts
     * @return amountOut Actual amount of tokens received
     */
    function executeSwap(SwapParams calldata params) 
        external 
        override 
        onlyExecutor 
        nonReentrant 
        whenNotPaused 
        notEmergencyPaused 
        returns (uint256 amountOut) 
    {
        // Validate swap parameters
        require(params.tokenIn != address(0), "ExecutionEngine: zero input token");
        require(params.tokenOut != address(0), "ExecutionEngine: zero output token");
        require(params.amountIn > 0, "ExecutionEngine: zero input amount");
        require(params.minAmountOut > 0, "ExecutionEngine: zero min output");
        SecurityUtils.validateDeadline(params.deadline);
        
        // Check token balances
        IERC20 inputToken = IERC20(params.tokenIn);
        require(inputToken.balanceOf(address(this)) >= params.amountIn, "ExecutionEngine: insufficient balance");
        
        // Execute swap (placeholder implementation)
        // In a real implementation, this would call a DEX like Uniswap
        amountOut = params.minAmountOut; // Placeholder
        
        // Validate slippage
        uint256 expectedAmount = params.minAmountOut;
        uint256 actualSlippage = 0;
        if (amountOut < expectedAmount) {
            actualSlippage = ((expectedAmount - amountOut) * 10000) / expectedAmount;
        }
        
        if (actualSlippage > MAX_SLIPPAGE) {
            emit SlippageExceeded(bytes32(0), expectedAmount, amountOut, block.timestamp);
        }
    }
    
    /**
     * @dev Add liquidity to a pool
     * @param params Liquidity parameters including tokens and amounts
     * @return liquidity Amount of liquidity tokens received
     */
    function addLiquidity(LiquidityParams calldata params) 
        external 
        override 
        onlyExecutor 
        nonReentrant 
        whenNotPaused 
        notEmergencyPaused 
        returns (uint256 liquidity) 
    {
        // Validate liquidity parameters
        require(params.tokenA != address(0), "ExecutionEngine: zero token A");
        require(params.tokenB != address(0), "ExecutionEngine: zero token B");
        require(params.amountA > 0, "ExecutionEngine: zero amount A");
        require(params.amountB > 0, "ExecutionEngine: zero amount B");
        SecurityUtils.validateDeadline(params.deadline);
        
        // Check token balances
        IERC20 tokenA = IERC20(params.tokenA);
        IERC20 tokenB = IERC20(params.tokenB);
        require(tokenA.balanceOf(address(this)) >= params.amountA, "ExecutionEngine: insufficient token A");
        require(tokenB.balanceOf(address(this)) >= params.amountB, "ExecutionEngine: insufficient token B");
        
        // Execute liquidity addition (placeholder implementation)
        // In a real implementation, this would call a DEX like Uniswap
        liquidity = MathUtils.min(params.amountA, params.amountB); // Placeholder
    }
    
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
    ) 
        external 
        override 
        onlyExecutor 
        nonReentrant 
        whenNotPaused 
        notEmergencyPaused 
        returns (uint256 amountA, uint256 amountB) 
    {
        require(liquidityToken != address(0), "ExecutionEngine: zero liquidity token");
        require(amount > 0, "ExecutionEngine: zero amount");
        SecurityUtils.validateDeadline(deadline);
        
        // Check liquidity token balance
        IERC20 token = IERC20(liquidityToken);
        require(token.balanceOf(address(this)) >= amount, "ExecutionEngine: insufficient liquidity");
        
        // Execute liquidity removal (placeholder implementation)
        // In a real implementation, this would call a DEX like Uniswap
        amountA = minAmountA; // Placeholder
        amountB = minAmountB; // Placeholder
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get execution status for a request
     * @param requestId Request identifier
     * @return status Current execution status
     * @return result Execution result if completed
     */
    function getExecutionStatus(bytes32 requestId) 
        external 
        view 
        override 
        validRequestId(requestId) 
        returns (string memory status, ExecutionResult memory result) 
    {
        // ExecutionRequest memory request = executionRequests[requestId];
        ExecutionResult memory executionResult = executionResults[requestId];
        
        if (executionResult.timestamp == 0) {
            status = "Pending";
        } else if (executionResult.success) {
            status = "Completed";
        } else {
            status = "Failed";
        }
        
        return (status, executionResult);
    }
    
    /**
     * @dev Get all registered strategies
     * @return result Array of strategy configurations
     */
    function getRegisteredStrategies() external view override returns (StrategyConfig[] memory result) {
        result = new StrategyConfig[](registeredStrategies.length);
        
        for (uint256 i = 0; i < registeredStrategies.length; i++) {
            result[i] = strategies[registeredStrategies[i]];
        }
    }
    
    /**
     * @dev Check if a strategy is available for execution
     * @param strategyId Strategy identifier
     * @return isAvailable True if strategy can be executed
     * @return reason Reason if not available
     */
    function isStrategyAvailable(bytes32 strategyId) 
        external 
        view 
        override 
        returns (bool isAvailable, string memory reason) 
    {
        StrategyConfig memory strategy = strategies[strategyId];
        
        if (!strategy.isActive) {
            return (false, "Strategy not active");
        }
        
        if (block.timestamp < strategy.lastExecution + strategy.cooldownPeriod) {
            return (false, "Strategy in cooldown");
        }
        
        return (true, "Available");
    }
    
    /**
     * @dev Get execution history for a user
     * @param user User address
     * @param limit Maximum number of results to return
     * @return executions Array of execution results
     */
    function getUserExecutions(address user, uint256 limit) 
        external 
        view 
        override 
        returns (ExecutionResult[] memory executions) 
    {
        bytes32[] memory userRequestIds = userExecutions[user];
        uint256 resultCount = MathUtils.min(userRequestIds.length, limit);
        
        executions = new ExecutionResult[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            executions[i] = executionResults[userRequestIds[i]];
        }
    }
    
    /**
     * @dev Estimate gas cost for strategy execution
     * @param strategyId Strategy identifier
     * @return gasEstimate Estimated gas cost
     */
    function estimateGasCost(bytes32 strategyId, bytes calldata /* data */) 
        external 
        view 
        override 
        returns (uint256 gasEstimate) 
    {
        StrategyConfig memory strategy = strategies[strategyId];
        gasEstimate = strategy.maxGasLimit;
    }
    
    /**
     * @dev Cancel a pending execution request
     * @param requestId Request identifier
     * @param reason Reason for cancellation
     */
    function cancelExecution(bytes32 requestId, string calldata reason) 
        external 
        override 
        onlyExecutor 
        nonReentrant 
        whenNotPaused 
        validRequestId(requestId) 
    {
        ExecutionRequest memory request = executionRequests[requestId];
        require(request.user == msg.sender, "ExecutionEngine: not request owner");
        
        // Mark as cancelled (implementation would cancel the execution)
        emit ExecutionFailed(requestId, reason, 0, block.timestamp);
    }
    
    /**
     * @dev Emergency pause all executions
     * @param reason Reason for emergency pause
     */
    function emergencyPause(string calldata reason) 
        external 
        override 
        onlyRole(ADMIN_ROLE) 
    {
        isEmergencyPaused = true;
        emergencyReason = reason;
    }
    
    /**
     * @dev Resume executions after emergency pause
     */
    function resumeExecutions() external override onlyRole(ADMIN_ROLE) {
        isEmergencyPaused = false;
        emergencyReason = "";
    }
    
    // ============ Internal Functions ============
    
    function _validateExecutionRequest(ExecutionRequest calldata request) internal view {
        require(request.user != address(0), "ExecutionEngine: zero user address");
        require(request.strategyType != bytes32(0), "ExecutionEngine: zero strategy type");
        require(request.data.length > 0, "ExecutionEngine: empty data");
        SecurityUtils.validateSlippage(request.maxSlippage);
        SecurityUtils.validateDeadline(request.deadline);
    }
    
    function _executeStrategyInternal(
        bytes32 /* requestId */,
        ExecutionRequest calldata /* request */
    ) external view returns (bool success, bytes memory returnData, uint256 gasUsed, uint256 actualSlippage) {
        uint256 gasStart = gasleft();
        
        // Placeholder implementation
        // In a real implementation, this would call the strategy contract
        success = true;
        returnData = abi.encode("Strategy executed successfully");
        actualSlippage = 0;
        
        gasUsed = gasStart - gasleft();
    }
}
