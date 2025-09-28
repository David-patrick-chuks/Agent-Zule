// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IBridgeManager.sol";
import "../libraries/MathUtils.sol";
import "../libraries/SecurityUtils.sol";

/**
 * @title BridgeManager
 * @dev Cross-chain Bridge Management for Agent Zule
 * @notice Implements unified bridge interface with multiple protocols
 */
contract BridgeManager is IBridgeManager, AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using MathUtils for uint256;
    
    // ============ Constants ============
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant BRIDGE_OPERATOR_ROLE = keccak256("BRIDGE_OPERATOR_ROLE");
    bytes32 public constant ARBITRAGE_ROLE = keccak256("ARBITRAGE_ROLE");
    
    uint256 public constant MAX_CHAINS = 20;
    uint256 public constant MAX_BRIDGE_REQUESTS = 1000;
    uint256 public constant MAX_ARBITRAGE_AMOUNT = 1000000 * 1e18; // 1M tokens
    
    // ============ State Variables ============
    
    mapping(uint256 => BridgeConfig) public bridgeConfigs;
    mapping(uint256 => ChainInfo) public chainInfo;
    mapping(bytes32 => BridgeRequest) public bridgeRequests;
    mapping(address => bytes32[]) public userBridgeHistory;
    
    mapping(uint256 => ArbitrageOpportunity[]) public arbitrageOpportunities;
    mapping(bytes32 => ArbitrageOpportunity) public activeArbitrages;
    
    uint256[] public supportedChains;
    bytes32[] public activeBridgeRequests;
    uint256 public nextRequestId = 1;
    
    bool public isEmergencyPaused;
    string public emergencyReason;
    
    // ============ Modifiers ============
    
    modifier onlyBridgeOperator() {
        require(hasRole(BRIDGE_OPERATOR_ROLE, msg.sender), "BridgeManager: not bridge operator");
        _;
    }
    
    modifier onlyArbitrageRole() {
        require(hasRole(ARBITRAGE_ROLE, msg.sender), "BridgeManager: not arbitrage role");
        _;
    }
    
    modifier notEmergencyPaused() {
        require(!isEmergencyPaused, "BridgeManager: emergency pause active");
        _;
    }
    
    modifier validChainId(uint256 chainId) {
        require(chainInfo[chainId].isSupported, "BridgeManager: chain not supported");
        _;
    }
    
    modifier validRequestId(bytes32 requestId) {
        require(bridgeRequests[requestId].user != address(0), "BridgeManager: invalid request ID");
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(BRIDGE_OPERATOR_ROLE, msg.sender);
        _grantRole(ARBITRAGE_ROLE, msg.sender);
    }
    
    // ============ Core Functions ============
    
    /**
     * @dev Bridge tokens to another chain
     * @param targetChainId Target chain ID
     * @param token Token address to bridge
     * @param amount Amount to bridge
     * @param recipient Recipient address on target chain
     * @param deadline Deadline for the bridge operation
     * @return requestId Bridge request identifier
     */
    function bridgeTokens(
        uint256 targetChainId,
        address token,
        uint256 amount,
        address recipient,
        uint256 deadline
    ) 
        external 
        override 
        nonReentrant 
        whenNotPaused 
        notEmergencyPaused 
        validChainId(targetChainId) 
        returns (bytes32 requestId) 
    {
        require(token != address(0), "BridgeManager: zero token address");
        require(amount > 0, "BridgeManager: zero amount");
        require(recipient != address(0), "BridgeManager: zero recipient");
        SecurityUtils.validateDeadline(deadline);
        
        // Check token balance
        IERC20 tokenContract = IERC20(token);
        require(tokenContract.balanceOf(msg.sender) >= amount, "BridgeManager: insufficient balance");
        
        // Generate request ID
        requestId = keccak256(abi.encodePacked(
            msg.sender,
            targetChainId,
            token,
            amount,
            block.timestamp,
            nextRequestId++
        ));
        
        // Create bridge request
        BridgeRequest memory request = BridgeRequest({
            requestId: requestId,
            user: msg.sender,
            sourceChainId: block.chainid,
            targetChainId: targetChainId,
            token: token,
            amount: amount,
            recipient: recipient,
            deadline: deadline,
            isExecuted: false,
            isCompleted: false
        });
        
        bridgeRequests[requestId] = request;
        userBridgeHistory[msg.sender].push(requestId);
        activeBridgeRequests.push(requestId);
        
        // Transfer tokens to bridge contract
        tokenContract.safeTransferFrom(msg.sender, address(this), amount);
        
        emit BridgeRequested(requestId, msg.sender, block.chainid, targetChainId, token, amount, block.timestamp);
        
        // Execute bridge (placeholder implementation)
        _executeBridge(requestId);
    }
    
    /**
     * @dev Execute cross-chain arbitrage opportunity
     * @param opportunity Arbitrage opportunity details
     * @param amount Amount to arbitrage
     * @return requestId Arbitrage request identifier
     */
    function executeArbitrage(
        ArbitrageOpportunity calldata opportunity,
        uint256 amount
    ) 
        external 
        override 
        onlyArbitrageRole 
        nonReentrant 
        whenNotPaused 
        notEmergencyPaused 
        returns (bytes32 requestId) 
    {
        require(opportunity.sourceChainId != opportunity.targetChainId, "BridgeManager: same chain");
        require(amount > 0, "BridgeManager: zero amount");
        require(amount <= MAX_ARBITRAGE_AMOUNT, "BridgeManager: amount too large");
        SecurityUtils.validateDeadline(opportunity.deadline);
        
        // Generate request ID
        requestId = keccak256(abi.encodePacked(
            msg.sender,
            opportunity.sourceChainId,
            opportunity.targetChainId,
            opportunity.token,
            amount,
            block.timestamp,
            nextRequestId++
        ));
        
        // Store arbitrage opportunity
        activeArbitrages[requestId] = opportunity;
        
        // Execute arbitrage (placeholder implementation)
        _executeArbitrage(requestId, amount);
        
        emit ArbitrageExecuted(requestId, opportunity.sourceChainId, opportunity.targetChainId, opportunity.estimatedProfit, block.timestamp);
    }
    
    /**
     * @dev Register a new supported chain
     * @param chainId Chain identifier
     * @param name Chain name
     * @param bridgeContract Bridge contract address
     * @param config Bridge configuration
     */
    function registerChain(
        uint256 chainId,
        string calldata name,
        address bridgeContract,
        BridgeConfig calldata config
    ) 
        external 
        override 
        onlyBridgeOperator 
        nonReentrant 
        whenNotPaused 
    {
        require(chainId != 0, "BridgeManager: zero chain ID");
        require(bytes(name).length > 0, "BridgeManager: empty name");
        require(bridgeContract != address(0), "BridgeManager: zero bridge contract");
        require(supportedChains.length < MAX_CHAINS, "BridgeManager: max chains reached");
        require(!chainInfo[chainId].isSupported, "BridgeManager: chain already supported");
        
        // Validate config
        require(config.minAmount > 0, "BridgeManager: zero min amount");
        require(config.maxAmount > config.minAmount, "BridgeManager: invalid amount range");
        require(config.fee <= 10000, "BridgeManager: fee too high");
        
        // Store chain info
        chainInfo[chainId] = ChainInfo({
            chainId: chainId,
            name: name,
            isSupported: true,
            nativeToken: address(0), // Will be set later
            gasPrice: 0, // Will be updated
            blockTime: 0, // Will be updated
            lastUpdate: block.timestamp
        });
        
        // Store bridge config
        bridgeConfigs[chainId] = config;
        
        supportedChains.push(chainId);
        
        emit ChainRegistered(chainId, name, bridgeContract, block.timestamp);
    }
    
    /**
     * @dev Update chain information
     * @param chainId Chain identifier
     * @param info Updated chain information
     */
    function updateChainInfo(uint256 chainId, ChainInfo calldata info) 
        external 
        override 
        onlyBridgeOperator 
        nonReentrant 
        whenNotPaused 
        validChainId(chainId) 
    {
        require(info.chainId == chainId, "BridgeManager: chain ID mismatch");
        require(bytes(info.name).length > 0, "BridgeManager: empty name");
        
        chainInfo[chainId] = info;
        
        emit ChainRegistered(chainId, info.name, address(0), block.timestamp);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get bridge request status
     * @param requestId Request identifier
     * @return request Bridge request details
     * @return status Current status
     */
    function getBridgeStatus(bytes32 requestId) 
        external 
        view 
        override 
        validRequestId(requestId) 
        returns (BridgeRequest memory request, string memory status) 
    {
        request = bridgeRequests[requestId];
        
        if (request.isCompleted) {
            status = "Completed";
        } else if (request.isExecuted) {
            status = "Executed";
        } else if (block.timestamp > request.deadline) {
            status = "Expired";
        } else {
            status = "Pending";
        }
    }
    
    /**
     * @dev Get all supported chains
     * @return chains Array of supported chain information
     */
    function getSupportedChains() external view override returns (ChainInfo[] memory chains) {
        chains = new ChainInfo[](supportedChains.length);
        
        for (uint256 i = 0; i < supportedChains.length; i++) {
            chains[i] = chainInfo[supportedChains[i]];
        }
    }
    
    /**
     * @dev Get bridge configuration for a chain
     * @param chainId Chain identifier
     * @return config Bridge configuration
     */
    function getBridgeConfig(uint256 chainId) external view override validChainId(chainId) returns (BridgeConfig memory config) {
        return bridgeConfigs[chainId];
    }
    
    /**
     * @dev Check if chain is supported
     * @param chainId Chain identifier
     * @return isSupported True if chain is supported
     */
    function isChainSupported(uint256 chainId) external view override returns (bool isSupported) {
        return chainInfo[chainId].isSupported;
    }
    
    /**
     * @dev Get estimated bridge time and cost
     * @param sourceChainId Source chain ID
     * @param targetChainId Target chain ID
     * @param amount Amount to bridge
     * @return estimatedTime Estimated time in seconds
     * @return estimatedCost Estimated cost in native token
     */
    function getBridgeEstimate(
        uint256 sourceChainId,
        uint256 targetChainId,
        uint256 amount
    ) 
        external 
        view 
        override 
        returns (uint256 estimatedTime, uint256 estimatedCost) 
    {
        require(chainInfo[sourceChainId].isSupported, "BridgeManager: source chain not supported");
        require(chainInfo[targetChainId].isSupported, "BridgeManager: target chain not supported");
        
        BridgeConfig memory config = bridgeConfigs[targetChainId];
        estimatedTime = config.estimatedTime;
        estimatedCost = (amount * config.fee) / 10000;
    }
    
    /**
     * @dev Get active arbitrage opportunities
     * @param minProfit Minimum profit threshold
     * @return opportunities Array of arbitrage opportunities
     */
    function getArbitrageOpportunities(uint256 minProfit) 
        external 
        view 
        override 
        returns (ArbitrageOpportunity[] memory opportunities) 
    {
        uint256 totalOpportunities = 0;
        
        // Count opportunities meeting minimum profit
        for (uint256 i = 0; i < supportedChains.length; i++) {
            uint256 chainId = supportedChains[i];
            ArbitrageOpportunity[] memory chainOpportunities = arbitrageOpportunities[chainId];
            
            for (uint256 j = 0; j < chainOpportunities.length; j++) {
                if (chainOpportunities[j].estimatedProfit >= minProfit) {
                    totalOpportunities++;
                }
            }
        }
        
        opportunities = new ArbitrageOpportunity[](totalOpportunities);
        uint256 index = 0;
        
        // Fill opportunities array
        for (uint256 i = 0; i < supportedChains.length; i++) {
            uint256 chainId = supportedChains[i];
            ArbitrageOpportunity[] memory chainOpportunities = arbitrageOpportunities[chainId];
            
            for (uint256 j = 0; j < chainOpportunities.length; j++) {
                if (chainOpportunities[j].estimatedProfit >= minProfit) {
                    opportunities[index] = chainOpportunities[j];
                    index++;
                }
            }
        }
    }
    
    /**
     * @dev Get user's bridge history
     * @param user User address
     * @param limit Maximum number of results
     * @return requests Array of bridge requests
     */
    function getUserBridgeHistory(address user, uint256 limit) 
        external 
        view 
        override 
        returns (BridgeRequest[] memory requests) 
    {
        bytes32[] memory userRequestIds = userBridgeHistory[user];
        uint256 resultCount = MathUtils.min(userRequestIds.length, limit);
        
        requests = new BridgeRequest[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            requests[i] = bridgeRequests[userRequestIds[i]];
        }
    }
    
    /**
     * @dev Cancel a bridge request
     * @param requestId Request identifier
     * @param reason Reason for cancellation
     */
    function cancelBridgeRequest(bytes32 requestId, string calldata reason) 
        external 
        override 
        nonReentrant 
        whenNotPaused 
        validRequestId(requestId) 
    {
        BridgeRequest memory request = bridgeRequests[requestId];
        require(request.user == msg.sender, "BridgeManager: not request owner");
        require(!request.isExecuted, "BridgeManager: already executed");
        require(!request.isCompleted, "BridgeManager: already completed");
        
        // Mark as cancelled
        bridgeRequests[requestId].isExecuted = true;
        
        // Return tokens to user
        IERC20 tokenContract = IERC20(request.token);
        tokenContract.safeTransfer(request.user, request.amount);
        
        emit BridgeFailed(requestId, reason, block.timestamp);
    }
    
    /**
     * @dev Emergency pause all bridge operations
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
     * @dev Resume bridge operations after emergency pause
     */
    function resumeOperations() external override onlyRole(ADMIN_ROLE) {
        isEmergencyPaused = false;
        emergencyReason = "";
    }
    
    // ============ Internal Functions ============
    
    function _executeBridge(bytes32 requestId) internal {
        BridgeRequest storage request = bridgeRequests[requestId];
        
        // Mark as executed
        request.isExecuted = true;
        
        // In a real implementation, this would call the actual bridge contract
        // For now, we'll simulate completion after a delay
        request.isCompleted = true;
        
        emit BridgeCompleted(requestId, request.targetChainId, request.recipient, request.amount, block.timestamp);
    }
    
    function _executeArbitrage(bytes32 /* requestId */, uint256 /* amount */) internal {
        // Placeholder implementation - would need actual requestId
        // ArbitrageOpportunity memory opportunity = activeArbitrages[requestId];
        
        // In a real implementation, this would execute the arbitrage
        // For now, we'll just emit the event
        emit ArbitrageExecuted(bytes32(0), 0, 0, 0, block.timestamp);
    }
}
