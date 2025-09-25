// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SecurityUtils
 * @dev Security utilities for Agent Zule contracts
 * @notice Provides security checks and validation functions
 */
library SecurityUtils {
    // ============ Constants ============
    
    uint256 public constant MAX_SLIPPAGE = 5000; // 50% in basis points
    uint256 public constant MIN_AMOUNT = 1e6; // 0.000001 tokens
    uint256 public constant MAX_AMOUNT = type(uint128).max; // Maximum safe amount
    uint256 public constant MAX_DEADLINE_OFFSET = 3600; // 1 hour in seconds
    
    // ============ Validation Functions ============
    
    /**
     * @dev Validate address is not zero
     * @param addr Address to validate
     */
    function validateAddress(address addr) internal pure {
        require(addr != address(0), "SecurityUtils: zero address");
    }
    
    /**
     * @dev Validate amount is within safe bounds
     * @param amount Amount to validate
     */
    function validateAmount(uint256 amount) internal pure {
        require(amount >= MIN_AMOUNT, "SecurityUtils: amount too small");
        require(amount <= MAX_AMOUNT, "SecurityUtils: amount too large");
    }
    
    /**
     * @dev Validate slippage is within acceptable range
     * @param slippage Slippage in basis points
     */
    function validateSlippage(uint256 slippage) internal pure {
        require(slippage <= MAX_SLIPPAGE, "SecurityUtils: slippage too high");
    }
    
    /**
     * @dev Validate deadline is not too far in the future
     * @param deadline Deadline timestamp
     */
    function validateDeadline(uint256 deadline) internal view {
        require(deadline > block.timestamp, "SecurityUtils: deadline in past");
        require(deadline <= block.timestamp + MAX_DEADLINE_OFFSET, "SecurityUtils: deadline too far");
    }
    
    /**
     * @dev Validate array length is within bounds
     * @param arrayLength Length of array
     * @param maxLength Maximum allowed length
     */
    function validateArrayLength(uint256 arrayLength, uint256 maxLength) internal pure {
        require(arrayLength > 0, "SecurityUtils: empty array");
        require(arrayLength <= maxLength, "SecurityUtils: array too long");
    }
    
    /**
     * @dev Validate array lengths match
     * @param length1 First array length
     * @param length2 Second array length
     */
    function validateArrayLengthsMatch(uint256 length1, uint256 length2) internal pure {
        require(length1 == length2, "SecurityUtils: array length mismatch");
    }
    
    // ============ Security Checks ============
    
    /**
     * @dev Check if contract is paused
     * @param paused Paused status
     */
    function checkNotPaused(bool paused) internal pure {
        require(!paused, "SecurityUtils: contract paused");
    }
    
    /**
     * @dev Check if caller has required role
     * @param hasRole Whether caller has the required role
     * @param roleName Name of the required role
     */
    function checkRole(bool hasRole, string memory roleName) internal pure {
        require(hasRole, string(abi.encodePacked("SecurityUtils: missing role ", roleName)));
    }
    
    /**
     * @dev Check if action is within cooldown period
     * @param lastAction Last action timestamp
     * @param cooldown Cooldown period in seconds
     */
    function checkCooldown(uint256 lastAction, uint256 cooldown) internal view {
        require(block.timestamp >= lastAction + cooldown, "SecurityUtils: cooldown active");
    }
    
    /**
     * @dev Check if amount exceeds threshold
     * @param amount Amount to check
     * @param threshold Threshold amount
     * @param thresholdName Name of the threshold
     */
    function checkThreshold(uint256 amount, uint256 threshold, string memory thresholdName) internal pure {
        require(amount <= threshold, string(abi.encodePacked("SecurityUtils: exceeds ", thresholdName)));
    }
    
    /**
     * @dev Check if value is within range
     * @param value Value to check
     * @param minValue Minimum allowed value
     * @param maxValue Maximum allowed value
     * @param valueName Name of the value
     */
    function checkRange(
        uint256 value,
        uint256 minValue,
        uint256 maxValue,
        string memory valueName
    ) internal pure {
        require(value >= minValue, string(abi.encodePacked("SecurityUtils: ", valueName, " too low")));
        require(value <= maxValue, string(abi.encodePacked("SecurityUtils: ", valueName, " too high")));
    }
    
    // ============ Reentrancy Protection ============
    
    /**
     * @dev Check for reentrancy
     * @param locked Lock status
     */
    function checkReentrancy(bool locked) internal pure {
        require(!locked, "SecurityUtils: reentrancy detected");
    }
    
    // ============ Signature Validation ============
    
    /**
     * @dev Validate signature length
     * @param signature Signature to validate
     */
    function validateSignature(bytes memory signature) internal pure {
        require(signature.length == 65, "SecurityUtils: invalid signature length");
    }
    
    /**
     * @dev Validate message hash
     * @param messageHash Hash of the message
     * @param expectedHash Expected hash
     */
    function validateMessageHash(bytes32 messageHash, bytes32 expectedHash) internal pure {
        require(messageHash == expectedHash, "SecurityUtils: invalid message hash");
    }
    
    // ============ Rate Limiting ============
    
    /**
     * @dev Check rate limit
     * @param lastRequest Last request timestamp
     * @param rateLimit Rate limit in seconds
     * @param requestCount Current request count
     * @param maxRequests Maximum requests per period
     */
    function checkRateLimit(
        uint256 lastRequest,
        uint256 rateLimit,
        uint256 requestCount,
        uint256 maxRequests
    ) internal view {
        if (block.timestamp >= lastRequest + rateLimit) {
            // Rate limit period has passed, reset counter
            return;
        }
        require(requestCount < maxRequests, "SecurityUtils: rate limit exceeded");
    }
    
    // ============ Emergency Checks ============
    
    /**
     * @dev Check if emergency stop is active
     * @param emergencyStop Active status
     */
    function checkEmergencyStop(bool emergencyStop) internal pure {
        require(!emergencyStop, "SecurityUtils: emergency stop active");
    }
    
    /**
     * @dev Check if system is in maintenance mode
     * @param maintenanceMode Maintenance mode status
     */
    function checkMaintenanceMode(bool maintenanceMode) internal pure {
        require(!maintenanceMode, "SecurityUtils: maintenance mode active");
    }
    
    // ============ Gas Optimization ============
    
    /**
     * @dev Check if gas limit is sufficient
     * @param gasLimit Gas limit to check
     * @param minGasLimit Minimum required gas limit
     */
    function checkGasLimit(uint256 gasLimit, uint256 minGasLimit) internal pure {
        require(gasLimit >= minGasLimit, "SecurityUtils: insufficient gas limit");
    }
    
    /**
     * @dev Check if gas price is reasonable
     * @param gasPrice Gas price to check
     * @param maxGasPrice Maximum allowed gas price
     */
    function checkGasPrice(uint256 gasPrice, uint256 maxGasPrice) internal pure {
        require(gasPrice <= maxGasPrice, "SecurityUtils: gas price too high");
    }
}
