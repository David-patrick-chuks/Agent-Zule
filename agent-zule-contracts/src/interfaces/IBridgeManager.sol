// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IBridgeManager
 * @dev Interface for Cross-chain Bridge Management
 * @notice This interface defines the cross-chain integration for Agent Zule
 */
interface IBridgeManager {
    // ============ Structs ============
    
    struct BridgeConfig {
        uint256 chainId;
        address bridgeContract;
        bool isActive;
        uint256 minAmount;
        uint256 maxAmount;
        uint256 fee; // in basis points
        uint256 estimatedTime; // seconds
    }
    
    struct BridgeRequest {
        bytes32 requestId;
        address user;
        uint256 sourceChainId;
        uint256 targetChainId;
        address token;
        uint256 amount;
        address recipient;
        uint256 deadline;
        bool isExecuted;
        bool isCompleted;
    }
    
    struct ChainInfo {
        uint256 chainId;
        string name;
        bool isSupported;
        address nativeToken;
        uint256 gasPrice;
        uint256 blockTime;
        uint256 lastUpdate;
    }
    
    struct ArbitrageOpportunity {
        uint256 sourceChainId;
        uint256 targetChainId;
        address token;
        uint256 priceDifference; // in basis points
        uint256 estimatedProfit;
        uint256 minAmount;
        uint256 maxAmount;
        uint256 deadline;
    }
    
    // ============ Events ============
    
    event BridgeRequested(
        bytes32 indexed requestId,
        address indexed user,
        uint256 indexed sourceChainId,
        uint256 targetChainId,
        address token,
        uint256 amount,
        uint256 timestamp
    );
    
    event BridgeCompleted(
        bytes32 indexed requestId,
        uint256 indexed targetChainId,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );
    
    event BridgeFailed(
        bytes32 indexed requestId,
        string reason,
        uint256 timestamp
    );
    
    event ChainRegistered(
        uint256 indexed chainId,
        string name,
        address bridgeContract,
        uint256 timestamp
    );
    
    event ArbitrageOpportunityDetected(
        uint256 indexed sourceChainId,
        uint256 indexed targetChainId,
        address indexed token,
        uint256 priceDifference,
        uint256 estimatedProfit,
        uint256 timestamp
    );
    
    event ArbitrageExecuted(
        bytes32 indexed requestId,
        uint256 indexed sourceChainId,
        uint256 indexed targetChainId,
        uint256 profit,
        uint256 timestamp
    );
    
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
    ) external returns (bytes32 requestId);
    
    /**
     * @dev Execute cross-chain arbitrage opportunity
     * @param opportunity Arbitrage opportunity details
     * @param amount Amount to arbitrage
     * @return requestId Arbitrage request identifier
     */
    function executeArbitrage(
        ArbitrageOpportunity calldata opportunity,
        uint256 amount
    ) external returns (bytes32 requestId);
    
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
    ) external;
    
    /**
     * @dev Update chain information
     * @param chainId Chain identifier
     * @param info Updated chain information
     */
    function updateChainInfo(uint256 chainId, ChainInfo calldata info) external;
    
    /**
     * @dev Get bridge request status
     * @param requestId Request identifier
     * @return request Bridge request details
     * @return status Current status
     */
    function getBridgeStatus(bytes32 requestId) external view returns (
        BridgeRequest memory request,
        string memory status
    );
    
    /**
     * @dev Get all supported chains
     * @return chains Array of supported chain information
     */
    function getSupportedChains() external view returns (ChainInfo[] memory chains);
    
    /**
     * @dev Get bridge configuration for a chain
     * @param chainId Chain identifier
     * @return config Bridge configuration
     */
    function getBridgeConfig(uint256 chainId) external view returns (BridgeConfig memory config);
    
    /**
     * @dev Check if chain is supported
     * @param chainId Chain identifier
     * @return isSupported True if chain is supported
     */
    function isChainSupported(uint256 chainId) external view returns (bool isSupported);
    
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
    ) external view returns (uint256 estimatedTime, uint256 estimatedCost);
    
    /**
     * @dev Get active arbitrage opportunities
     * @param minProfit Minimum profit threshold
     * @return opportunities Array of arbitrage opportunities
     */
    function getArbitrageOpportunities(uint256 minProfit) external view returns (
        ArbitrageOpportunity[] memory opportunities
    );
    
    /**
     * @dev Get user's bridge history
     * @param user User address
     * @param limit Maximum number of results
     * @return requests Array of bridge requests
     */
    function getUserBridgeHistory(address user, uint256 limit) external view returns (
        BridgeRequest[] memory requests
    );
    
    /**
     * @dev Cancel a bridge request
     * @param requestId Request identifier
     * @param reason Reason for cancellation
     */
    function cancelBridgeRequest(bytes32 requestId, string calldata reason) external;
    
    /**
     * @dev Emergency pause all bridge operations
     * @param reason Reason for emergency pause
     */
    function emergencyPause(string calldata reason) external;
    
    /**
     * @dev Resume bridge operations after emergency pause
     */
    function resumeOperations() external;
}
