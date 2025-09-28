// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {PortfolioAgent} from "../src/core/PortfolioAgent.sol";
import {IPortfolioAgent} from "../src/interfaces/IPortfolioAgent.sol";
import {PermissionManager} from "../src/permissions/PermissionManager.sol";
import {VotingEngine} from "../src/governance/VotingEngine.sol";
import {ExecutionEngine} from "../src/core/ExecutionEngine.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PortfolioAgentTest
 * @dev Comprehensive tests for PortfolioAgent contract
 */
contract PortfolioAgentTest is Test {
    PortfolioAgent public portfolioAgent;
    PermissionManager public permissionManager;
    VotingEngine public votingEngine;
    ExecutionEngine public executionEngine;

    address public owner;
    address public user;
    address public aiAgent;
    address public riskManager;

    // Test tokens
    address public tokenA;
    address public tokenB;
    address public tokenC;

    event PortfolioRebalanced(address indexed user, address[] oldPositions, address[] newPositions, uint256 timestamp);
    event YieldOptimized(address indexed user, address indexed fromPool, address indexed toPool, uint256 amount, uint256 expectedApy);
    event DCAExecuted(address indexed user, address indexed token, uint256 amount, uint256 totalExecutions);
    event RiskThresholdUpdated(address indexed updater, uint256 oldThreshold, uint256 newThreshold);

    function setUp() public {
        // Setup accounts
        owner = makeAddr("owner");
        user = makeAddr("user");
        aiAgent = makeAddr("aiAgent");
        riskManager = makeAddr("riskManager");

        // Deploy contracts
        vm.startPrank(owner);
        
        permissionManager = new PermissionManager();
        votingEngine = new VotingEngine();
        executionEngine = new ExecutionEngine();
        
        portfolioAgent = new PortfolioAgent(
            address(permissionManager),
            address(votingEngine),
            address(executionEngine)
        );

        // Setup roles
        portfolioAgent.grantRole(keccak256("AI_AGENT_ROLE"), aiAgent);
        portfolioAgent.grantRole(keccak256("RISK_MANAGER_ROLE"), riskManager);
        
        // Grant permissions to portfolio agent in other contracts
        permissionManager.grantRole(keccak256("ADMIN_ROLE"), address(portfolioAgent));
        votingEngine.grantRole(keccak256("ADMIN_ROLE"), address(portfolioAgent));
        executionEngine.grantRole(keccak256("ADMIN_ROLE"), address(portfolioAgent));

        vm.stopPrank();

        // Setup test tokens (using mock addresses)
        tokenA = makeAddr("tokenA");
        tokenB = makeAddr("tokenB");
        tokenC = makeAddr("tokenC");
    }

    function testInitialization() public {
        assertEq(portfolioAgent.hasRole(keccak256("DEFAULT_ADMIN_ROLE"), owner), true);
        assertEq(portfolioAgent.hasRole(keccak256("AI_AGENT_ROLE"), aiAgent), true);
        assertEq(portfolioAgent.hasRole(keccak256("RISK_MANAGER_ROLE"), riskManager), true);
        
        assertEq(address(portfolioAgent.permissionManager()), address(permissionManager));
        assertEq(address(portfolioAgent.votingEngine()), address(votingEngine));
        assertEq(address(portfolioAgent.executionEngine()), address(executionEngine));
    }

    function testGetPortfolioPositions() public {
        // Initially should return empty array
        address[] memory positions = portfolioAgent.getPortfolioPositions(user);
        assertEq(positions.length, 0);
    }

    function testGetPortfolioMetrics() public {
        (uint256 totalValue, int256 totalReturn, uint256 sharpeRatio) = portfolioAgent.getPortfolioMetrics(user);
        
        assertEq(totalValue, 0);
        assertEq(totalReturn, 0);
        assertEq(sharpeRatio, 0);
    }

    function testHasPermission() public {
        bool hasPermission = portfolioAgent.hasPermission(user, keccak256("REBALANCE"));
        assertFalse(hasPermission); // Should be false initially
    }

    function testUpdateRiskParameters() public {
        uint256 newMaxVolatility = 6000; // 60%
        uint256 newMaxDrawdown = 4000; // 40%

        vm.expectEmit(true, false, false, true);
        emit RiskThresholdUpdated(riskManager, portfolioAgent.maxVolatilityThreshold(), newMaxVolatility);

        vm.prank(riskManager);
        portfolioAgent.updateRiskParameters(newMaxVolatility, newMaxDrawdown);

        assertEq(portfolioAgent.maxVolatilityThreshold(), newMaxVolatility);
        assertEq(portfolioAgent.maxDrawdownThreshold(), newMaxDrawdown);
    }

    function testUpdateRiskParametersRevert() public {
        // Should revert if not risk manager
        vm.expectRevert();
        vm.prank(user);
        portfolioAgent.updateRiskParameters(5000, 3000);

        // Should revert with invalid parameters
        vm.expectRevert("PortfolioAgent: invalid volatility threshold");
        vm.prank(riskManager);
        portfolioAgent.updateRiskParameters(15000, 3000);

        vm.expectRevert("PortfolioAgent: invalid drawdown threshold");
        vm.prank(riskManager);
        portfolioAgent.updateRiskParameters(5000, 15000);
    }

    function testEmergencyStop() public {
        string memory reason = "Market crash detected";
        
        vm.prank(owner);
        portfolioAgent.emergencyStop(reason);

        assertTrue(portfolioAgent.isEmergencyStopped());
        assertEq(portfolioAgent.emergencyReason(), reason);
    }

    function testResumeOperations() public {
        // First stop
        vm.prank(owner);
        portfolioAgent.emergencyStop("Test stop");
        
        assertTrue(portfolioAgent.isEmergencyStopped());

        // Then resume
        vm.prank(owner);
        portfolioAgent.resumeOperations();

        assertFalse(portfolioAgent.isEmergencyStopped());
        assertEq(portfolioAgent.emergencyReason(), "");
    }

    function testExecuteRebalancingWithoutPermissions() public {
        // Create mock rebalance parameters
        PortfolioAgent.Position[] memory newPositions = new PortfolioAgent.Position[](2);
        newPositions[0] = PortfolioAgent.Position({
            token: tokenA,
            amount: 1000e18,
            targetWeight: 5000, // 50%
            currentWeight: 0,
            lastRebalance: 0,
            isActive: true
        });
        newPositions[1] = PortfolioAgent.Position({
            token: tokenB,
            amount: 2000e18,
            targetWeight: 5000, // 50%
            currentWeight: 0,
            lastRebalance: 0,
            isActive: true
        });

        PortfolioAgent.RebalanceParams memory params = PortfolioAgent.RebalanceParams({
            newPositions: newPositions,
            maxSlippage: 500, // 5%
            deadline: block.timestamp + 3600, // 1 hour
            executeImmediately: true
        });

        // Should revert without permissions
        vm.expectRevert("PortfolioAgent: insufficient permissions");
        vm.prank(aiAgent);
        portfolioAgent.executeRebalancing(params);
    }

    function testExecuteRebalancingWithPermissions() public {
        // Grant permission to AI agent
        vm.prank(owner);
        permissionManager.grantPermission(
            aiAgent,
            keccak256("REBALANCE"),
            1000000e18, // Max amount
            block.timestamp + 86400 // 24 hours
        );

        // Create mock rebalance parameters
        PortfolioAgent.Position[] memory newPositions = new PortfolioAgent.Position[](2);
        newPositions[0] = PortfolioAgent.Position({
            token: tokenA,
            amount: 1000e18,
            targetWeight: 5000,
            currentWeight: 0,
            lastRebalance: 0,
            isActive: true
        });
        newPositions[1] = PortfolioAgent.Position({
            token: tokenB,
            amount: 2000e18,
            targetWeight: 5000,
            currentWeight: 0,
            lastRebalance: 0,
            isActive: true
        });

        PortfolioAgent.RebalanceParams memory params = PortfolioAgent.RebalanceParams({
            newPositions: newPositions,
            maxSlippage: 500,
            deadline: block.timestamp + 3600,
            executeImmediately: true
        });

        vm.expectEmit(true, false, false, false);
        emit PortfolioRebalanced(aiAgent, new address[](0), newPositions, block.timestamp);

        vm.prank(aiAgent);
        portfolioAgent.executeRebalancing(params);

        // Check that positions were updated
        address[] memory positions = portfolioAgent.getPortfolioPositions(aiAgent);
        assertEq(positions.length, 2);
    }

    function testExecuteYieldOptimization() public {
        // Grant permission
        vm.prank(owner);
        permissionManager.grantPermission(
            aiAgent,
            keccak256("YIELD_OPTIMIZE"),
            1000000e18,
            block.timestamp + 86400
        );

        PortfolioAgent.YieldOpportunity memory opportunity = PortfolioAgent.YieldOpportunity({
            pool: makeAddr("yieldPool"),
            token: tokenA,
            expectedApy: 1200, // 12%
            minAmount: 1000e18,
            maxAmount: 10000e18,
            riskScore: 300 // Low risk
        });

        uint256 amount = 10000e18;

        vm.expectEmit(true, false, false, true);
        emit YieldOptimized(aiAgent, address(0), opportunity.pool, amount, opportunity.expectedApy);

        vm.prank(aiAgent);
        portfolioAgent.executeYieldOptimization(opportunity, amount);
    }

    function testExecuteDCA() public {
        // Grant permission
        vm.prank(owner);
        permissionManager.grantPermission(
            aiAgent,
            keccak256("DCA"),
            1000000e18,
            block.timestamp + 86400
        );

        PortfolioAgent.DcaParams memory params = PortfolioAgent.DcaParams({
            token: tokenA,
            amount: 1000e18,
            frequency: 86400, // Daily
            duration: 2592000, // 30 days
            maxSlippage: 500 // 5%
        });

        vm.expectEmit(true, false, false, true);
        emit DCAExecuted(aiAgent, tokenA, params.amount, params.duration / params.frequency);

        vm.prank(aiAgent);
        portfolioAgent.executeDca(params);
    }

    function testRebalancingCooldown() public {
        // Grant permission
        vm.prank(owner);
        permissionManager.grantPermission(
            aiAgent,
            keccak256("REBALANCE"),
            1000000e18,
            block.timestamp + 86400
        );

        // Create positions
        PortfolioAgent.Position[] memory newPositions = new PortfolioAgent.Position[](1);
        newPositions[0] = PortfolioAgent.Position(tokenA, 10000, 1000e18);

        PortfolioAgent.RebalanceParams memory params = PortfolioAgent.RebalanceParams({
            newPositions: newPositions,
            maxSlippage: 500,
            deadline: block.timestamp + 3600,
            executeImmediately: true
        });

        // First rebalancing should succeed
        vm.prank(aiAgent);
        portfolioAgent.executeRebalancing(params);

        // Second rebalancing should fail due to cooldown
        vm.expectRevert();
        vm.prank(aiAgent);
        portfolioAgent.executeRebalancing(params);
    }

    function testInvalidRebalanceParameters() public {
        // Grant permission
        vm.prank(owner);
        permissionManager.grantPermission(
            aiAgent,
            keccak256("REBALANCE"),
            1000000e18,
            block.timestamp + 86400
        );

        // Test with invalid weights (not summing to 100%)
        PortfolioAgent.Position[] memory invalidPositions = new PortfolioAgent.Position[](2);
        invalidPositions[0] = PortfolioAgent.Position(tokenA, 3000, 1000e18); // 30%
        invalidPositions[1] = PortfolioAgent.Position(tokenB, 3000, 2000e18); // 30% (should be 70%)

        PortfolioAgent.RebalanceParams memory params = PortfolioAgent.RebalanceParams({
            newPositions: invalidPositions,
            maxSlippage: 500,
            deadline: block.timestamp + 3600,
            executeImmediately: true
        });

        vm.expectRevert("PortfolioAgent: weights must sum to 100%");
        vm.prank(aiAgent);
        portfolioAgent.executeRebalancing(params);
    }

    function testEmergencyStopPreventsExecution() public {
        // Grant permission
        vm.prank(owner);
        permissionManager.grantPermission(
            aiAgent,
            keccak256("REBALANCE"),
            1000000e18,
            block.timestamp + 86400
        );

        // Activate emergency stop
        vm.prank(owner);
        portfolioAgent.emergencyStop("Emergency test");

        // Try to execute rebalancing - should fail
        PortfolioAgent.Position[] memory newPositions = new PortfolioAgent.Position[](1);
        newPositions[0] = PortfolioAgent.Position(tokenA, 10000, 1000e18);

        PortfolioAgent.RebalanceParams memory params = PortfolioAgent.RebalanceParams({
            newPositions: newPositions,
            maxSlippage: 500,
            deadline: block.timestamp + 3600,
            executeImmediately: true
        });

        vm.expectRevert("PortfolioAgent: emergency stop active");
        vm.prank(aiAgent);
        portfolioAgent.executeRebalancing(params);
    }

    function testOnlyAIAgentCanExecute() public {
        // Grant permission to user instead of AI agent
        vm.prank(owner);
        permissionManager.grantPermission(
            user,
            keccak256("REBALANCE"),
            1000000e18,
            block.timestamp + 86400
        );

        PortfolioAgent.Position[] memory newPositions = new PortfolioAgent.Position[](1);
        newPositions[0] = PortfolioAgent.Position(tokenA, 10000, 1000e18);

        PortfolioAgent.RebalanceParams memory params = PortfolioAgent.RebalanceParams({
            newPositions: newPositions,
            maxSlippage: 500,
            deadline: block.timestamp + 3600,
            executeImmediately: true
        });

        // Should revert because user doesn't have AI_AGENT_ROLE
        vm.expectRevert("PortfolioAgent: not AI agent");
        vm.prank(user);
        portfolioAgent.executeRebalancing(params);
    }
}
