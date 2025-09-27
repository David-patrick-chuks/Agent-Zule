// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MathUtils
 * @dev Mathematical utilities for Agent Zule contracts
 * @notice Provides safe math operations and financial calculations
 */
library MathUtils {
    // ============ Constants ============
    
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant PRECISION = 1e18;
    uint256 public constant MAX_UINT256 = type(uint256).max;
    
    // ============ Safe Math Operations ============
    
    /**
     * @dev Safe multiplication with overflow protection
     * @param a First number
     * @param b Second number
     * @return result Product of a and b
     */
    function safeMul(uint256 a, uint256 b) internal pure returns (uint256 result) {
        if (a == 0) return 0;
        result = a * b;
        require(result / a == b, "MathUtils: multiplication overflow");
    }
    
    /**
     * @dev Safe division with zero protection
     * @param a Dividend
     * @param b Divisor
     * @return result Quotient of a and b
     */
    function safeDiv(uint256 a, uint256 b) internal pure returns (uint256 result) {
        require(b > 0, "MathUtils: division by zero");
        result = a / b;
    }
    
    /**
     * @dev Safe addition with overflow protection
     * @param a First number
     * @param b Second number
     * @return result Sum of a and b
     */
    function safeAdd(uint256 a, uint256 b) internal pure returns (uint256 result) {
        result = a + b;
        require(result >= a, "MathUtils: addition overflow");
    }
    
    /**
     * @dev Safe subtraction with underflow protection
     * @param a Minuend
     * @param b Subtrahend
     * @return result Difference of a and b
     */
    function safeSub(uint256 a, uint256 b) internal pure returns (uint256 result) {
        require(b <= a, "MathUtils: subtraction underflow");
        result = a - b;
    }
    
    // ============ Financial Calculations ============
    
    /**
     * @dev Calculate percentage using basis points
     * @param amount Base amount
     * @param basisPoints Percentage in basis points (10000 = 100%)
     * @return result Calculated percentage amount
     */
    function calculatePercentage(uint256 amount, uint256 basisPoints) internal pure returns (uint256 result) {
        require(basisPoints <= BASIS_POINTS, "MathUtils: basis points exceed 100%");
        result = safeDiv(safeMul(amount, basisPoints), BASIS_POINTS);
    }
    
    /**
     * @dev Calculate compound interest
     * @param principal Initial amount
     * @param rate Annual interest rate in basis points
     * @param time Time period in seconds
     * @return result Compound interest amount
     */
    function calculateCompoundInterest(
        uint256 principal,
        uint256 rate,
        uint256 time
    ) internal pure returns (uint256 result) {
        if (rate == 0) return principal;
        
        // Convert rate to per-second rate
        uint256 perSecondRate = safeDiv(rate, 365 * 24 * 3600);
        
        // Calculate compound interest: principal * (1 + rate)^time
        result = principal;
        for (uint256 i = 0; i < time; i++) {
            result = safeAdd(result, safeDiv(safeMul(result, perSecondRate), BASIS_POINTS));
        }
    }
    
    /**
     * @dev Calculate simple interest
     * @param principal Initial amount
     * @param rate Annual interest rate in basis points
     * @param time Time period in seconds
     * @return result Simple interest amount
     */
    function calculateSimpleInterest(
        uint256 principal,
        uint256 rate,
        uint256 time
    ) internal pure returns (uint256 result) {
        if (rate == 0) return principal;
        
        // Convert rate to per-second rate
        uint256 perSecondRate = safeDiv(rate, 365 * 24 * 3600);
        result = safeAdd(principal, safeDiv(safeMul(safeMul(principal, perSecondRate), time), BASIS_POINTS));
    }
    
    /**
     * @dev Calculate weighted average
     * @param values Array of values
     * @param weights Array of weights
     * @return result Weighted average
     */
    function calculateWeightedAverage(
        uint256[] memory values,
        uint256[] memory weights
    ) internal pure returns (uint256 result) {
        require(values.length == weights.length, "MathUtils: arrays length mismatch");
        require(values.length > 0, "MathUtils: empty arrays");
        
        uint256 totalWeight = 0;
        uint256 weightedSum = 0;
        
        for (uint256 i = 0; i < values.length; i++) {
            totalWeight = safeAdd(totalWeight, weights[i]);
            weightedSum = safeAdd(weightedSum, safeMul(values[i], weights[i]));
        }
        
        require(totalWeight > 0, "MathUtils: total weight is zero");
        result = safeDiv(weightedSum, totalWeight);
    }
    
    /**
     * @dev Calculate standard deviation
     * @param values Array of values
     * @param mean Mean of the values
     * @return result Standard deviation
     */
    function calculateStandardDeviation(
        uint256[] memory values,
        uint256 mean
    ) internal pure returns (uint256 result) {
        require(values.length > 1, "MathUtils: need at least 2 values");
        
        uint256 sumSquaredDiffs = 0;
        
        for (uint256 i = 0; i < values.length; i++) {
            uint256 diff = values[i] > mean ? safeSub(values[i], mean) : safeSub(mean, values[i]);
            sumSquaredDiffs = safeAdd(sumSquaredDiffs, safeMul(diff, diff));
        }
        
        uint256 variance = safeDiv(sumSquaredDiffs, values.length - 1);
        result = sqrt(variance);
    }
    
    /**
     * @dev Calculate square root using Babylonian method
     * @param x Number to calculate square root of
     * @return result Square root of x
     */
    function sqrt(uint256 x) internal pure returns (uint256 result) {
        if (x == 0) return 0;
        
        uint256 z = safeAdd(safeDiv(x, 2), 1);
        uint256 y = x;
        
        while (z < y) {
            y = z;
            z = safeDiv(safeAdd(safeDiv(x, z), z), 2);
        }
        
        result = y;
    }
    
    /**
     * @dev Calculate power with integer exponent
     * @param base Base number
     * @param exponent Exponent
     * @return result Base raised to the power of exponent
     */
    function power(uint256 base, uint256 exponent) internal pure returns (uint256 result) {
        result = 1;
        while (exponent > 0) {
            if (exponent % 2 == 1) {
                result = safeMul(result, base);
            }
            base = safeMul(base, base);
            exponent = safeDiv(exponent, 2);
        }
    }
    
    /**
     * @dev Calculate minimum of two numbers
     * @param a First number
     * @param b Second number
     * @return result Minimum of a and b
     */
    function min(uint256 a, uint256 b) internal pure returns (uint256 result) {
        result = a < b ? a : b;
    }
    
    /**
     * @dev Calculate maximum of two numbers
     * @param a First number
     * @param b Second number
     * @return result Maximum of a and b
     */
    function max(uint256 a, uint256 b) internal pure returns (uint256 result) {
        result = a > b ? a : b;
    }
    
    /**
     * @dev Clamp value between min and max
     * @param value Value to clamp
     * @param minValue Minimum allowed value
     * @param maxValue Maximum allowed value
     * @return result Clamped value
     */
    function clamp(uint256 value, uint256 minValue, uint256 maxValue) internal pure returns (uint256 result) {
        require(minValue <= maxValue, "MathUtils: invalid range");
        result = min(max(value, minValue), maxValue);
    }
}
