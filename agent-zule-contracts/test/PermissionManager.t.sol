// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {PermissionManager} from "../src/permissions/PermissionManager.sol";
import {IPermissionManager} from "../src/interfaces/IPermissionManager.sol";

/**
 * @title PermissionManagerTest
 * @dev Tests for PermissionManager contract
 */
contract PermissionManagerTest is Test {
    PermissionManager public permissionManager;

    address public owner;
    address public user;
    address public delegate;
    address public aiAgent;

    event PermissionGranted(address indexed user, bytes32 indexed action, IPermissionManager.PermissionConfig config, uint256 timestamp);
    event PermissionRevoked(address indexed user, bytes32 indexed action, string reason, uint256 timestamp);
    event ConditionalRuleAdded(bytes32 indexed ruleId, IPermissionManager.ConditionalRule rule, uint256 timestamp);
    event AutoRevokeTriggered(address indexed user, bytes32 indexed action, bytes32 indexed ruleId, uint256 timestamp);

    function setUp() public {
        owner = makeAddr("owner");
        user = makeAddr("user");
        delegate = makeAddr("delegate");
        aiAgent = makeAddr("aiAgent");

        vm.prank(owner);
        permissionManager = new PermissionManager(address(0)); // VotingEngine address can be zero for testing
    }

    function testInitialization() public {
        assertTrue(permissionManager.hasRole(keccak256("DEFAULT_ADMIN_ROLE"), owner));
    }

    function testGrantPermission() public {
        bytes32 action = keccak256("REBALANCE");
        
        // Create permission config
        IPermissionManager.PermissionConfig memory config = IPermissionManager.PermissionConfig({
            user: user,
            action: action,
            threshold: 500, // 5%
            cooldown: 3600, // 1 hour
            isActive: true,
            requiresVoting: false,
            maxAmount: 1000000e18,
            riskTolerance: 500 // 50%
        });

        vm.expectEmit(true, true, false, true);
        emit PermissionGranted(user, action, config, block.timestamp);

        vm.prank(owner);
        permissionManager.grantPermission(config);

        (bool hasPermission, bool requiresVoting) = permissionManager.checkPermission(user, action, 1000e18);
        assertTrue(hasPermission);
        assertFalse(requiresVoting);
    }

    function testRevokePermission() public {
        bytes32 action = keccak256("REBALANCE");
        
        // First grant permission
        IPermissionManager.PermissionConfig memory config = IPermissionManager.PermissionConfig({
            user: user,
            action: action,
            threshold: 500,
            cooldown: 3600,
            isActive: true,
            requiresVoting: false,
            maxAmount: 1000000e18,
            riskTolerance: 500
        });

        vm.prank(owner);
        permissionManager.grantPermission(config);

        // Then revoke it
        vm.expectEmit(true, true, false, true);
        emit PermissionRevoked(user, action, "Test revocation", block.timestamp);

        vm.prank(owner);
        permissionManager.revokePermission(user, action, "Test revocation");

        (bool hasPermission,) = permissionManager.checkPermission(user, action, 1000e18);
        assertFalse(hasPermission);
    }

    function testMaxAmountLimit() public {
        bytes32 action = keccak256("REBALANCE");
        
        IPermissionManager.PermissionConfig memory config = IPermissionManager.PermissionConfig({
            user: user,
            action: action,
            threshold: 500,
            cooldown: 3600,
            isActive: true,
            requiresVoting: false,
            maxAmount: 1000000e18, // 1M tokens max
            riskTolerance: 500
        });

        vm.prank(owner);
        permissionManager.grantPermission(config);

        // Should have permission for amounts within limit
        (bool hasPermission,) = permissionManager.checkPermission(user, action, 500000e18);
        assertTrue(hasPermission);

        // Should not have permission for amounts exceeding limit
        (hasPermission,) = permissionManager.checkPermission(user, action, 2000000e18);
        assertFalse(hasPermission);
    }

    function testAddConditionalRule() public {
        bytes32 ruleId = keccak256("HIGH_VOLATILITY_RULE");
        
        IPermissionManager.ConditionalRule memory rule = IPermissionManager.ConditionalRule({
            ruleId: ruleId,
            condition: keccak256("VOLATILITY_GT_50"),
            threshold: 5000, // 50%
            autoRevoke: true,
            escalateToVoting: false,
            gracePeriod: 300 // 5 minutes
        });

        vm.expectEmit(true, false, false, true);
        emit ConditionalRuleAdded(ruleId, rule, block.timestamp);

        vm.prank(owner);
        permissionManager.addConditionalRule(rule);
    }

    function testUpdateRiskMetrics() public {
        IPermissionManager.RiskMetrics memory metrics = IPermissionManager.RiskMetrics({
            volatility: 3000, // 30%
            drawdown: 1000, // 10%
            correlation: 800, // 80%
            liquidity: 900, // 90%
            lastUpdated: block.timestamp
        });

        vm.prank(owner);
        permissionManager.updateRiskMetrics(user, metrics);

        // Note: No getter function available for risk metrics in current implementation
        // This test verifies that updateRiskMetrics doesn't revert
    }

    function testAutoRevokeOnCondition() public {
        bytes32 action = keccak256("REBALANCE");
        
        // Grant permission first
        IPermissionManager.PermissionConfig memory config = IPermissionManager.PermissionConfig({
            user: user,
            action: action,
            threshold: 500,
            cooldown: 3600,
            isActive: true,
            requiresVoting: false,
            maxAmount: 1000000e18,
            riskTolerance: 500
        });

        vm.prank(owner);
        permissionManager.grantPermission(config);

        // Add conditional rule for auto-revoke
        bytes32 ruleId = keccak256("HIGH_VOLATILITY_RULE");
        IPermissionManager.ConditionalRule memory rule = IPermissionManager.ConditionalRule({
            ruleId: ruleId,
            condition: keccak256("VOLATILITY_GT_50"),
            threshold: 5000,
            autoRevoke: true,
            escalateToVoting: false,
            gracePeriod: 0
        });

        vm.prank(owner);
        permissionManager.addConditionalRule(rule);

        // Update risk metrics to trigger auto-revoke
        IPermissionManager.RiskMetrics memory metrics = IPermissionManager.RiskMetrics({
            volatility: 6000, // 60% - above threshold
            drawdown: 1000,
            correlation: 800,
            liquidity: 900,
            lastUpdated: block.timestamp
        });

        vm.prank(owner);
        permissionManager.updateRiskMetrics(user, metrics);

        // Trigger auto-revoke
        bool wasRevoked = permissionManager.autoRevokeOnCondition(user, action);
        assertTrue(wasRevoked);

        // Check that permission was revoked
        (bool hasPermission,) = permissionManager.checkPermission(user, action, 1000e18);
        assertFalse(hasPermission);
    }

    function testGetPermissionStatus() public {
        bytes32 action = keccak256("REBALANCE");
        
        IPermissionManager.PermissionConfig memory config = IPermissionManager.PermissionConfig({
            user: user,
            action: action,
            threshold: 500,
            cooldown: 3600,
            isActive: true,
            requiresVoting: false,
            maxAmount: 1000000e18,
            riskTolerance: 500
        });

        vm.prank(owner);
        permissionManager.grantPermission(config);

        // Check permission status
        (bool hasPermission, bool requiresVoting) = permissionManager.checkPermission(user, action, 1000e18);
        assertTrue(hasPermission);
        assertFalse(requiresVoting);
    }

    function testGetUserPermissions() public {
        bytes32 action1 = keccak256("REBALANCE");
        bytes32 action2 = keccak256("YIELD_OPTIMIZE");
        
        // Grant two permissions
        IPermissionManager.PermissionConfig memory config1 = IPermissionManager.PermissionConfig({
            user: user,
            action: action1,
            threshold: 500,
            cooldown: 3600,
            isActive: true,
            requiresVoting: false,
            maxAmount: 1000000e18,
            riskTolerance: 500
        });

        IPermissionManager.PermissionConfig memory config2 = IPermissionManager.PermissionConfig({
            user: user,
            action: action2,
            threshold: 300,
            cooldown: 1800,
            isActive: true,
            requiresVoting: true,
            maxAmount: 500000e18,
            riskTolerance: 300
        });

        vm.startPrank(owner);
        permissionManager.grantPermission(config1);
        permissionManager.grantPermission(config2);
        vm.stopPrank();

        // Get all user permissions
        IPermissionManager.PermissionConfig[] memory permissions = permissionManager.getUserPermissions(user);
        assertEq(permissions.length, 2);
    }

    function testOnlyAdminCanGrantPermissions() public {
        bytes32 action = keccak256("REBALANCE");
        
        IPermissionManager.PermissionConfig memory config = IPermissionManager.PermissionConfig({
            user: user,
            action: action,
            threshold: 500,
            cooldown: 3600,
            isActive: true,
            requiresVoting: false,
            maxAmount: 1000000e18,
            riskTolerance: 500
        });

        vm.expectRevert();
        vm.prank(user);
        permissionManager.grantPermission(config);
    }

    function testOnlyAdminCanRevokePermissions() public {
        bytes32 action = keccak256("REBALANCE");

        vm.expectRevert();
        vm.prank(user);
        permissionManager.revokePermission(user, action, "Test");
    }

    function testEmergencyStop() public {
        // Grant permission first
        bytes32 action = keccak256("REBALANCE");
        IPermissionManager.PermissionConfig memory config = IPermissionManager.PermissionConfig({
            user: user,
            action: action,
            threshold: 500,
            cooldown: 3600,
            isActive: true,
            requiresVoting: false,
            maxAmount: 1000000e18,
            riskTolerance: 500
        });

        vm.prank(owner);
        permissionManager.grantPermission(config);

        // Activate emergency stop
        vm.prank(owner);
        permissionManager.emergencyStop("Emergency test");

        // Check that emergency stop is active
        assertTrue(permissionManager.emergencyStop());

        // Try to grant new permission - should fail
        vm.expectRevert("PermissionManager: emergency stop active");
        vm.prank(owner);
        permissionManager.grantPermission(config);
    }

    function testResumeAfterEmergencyStop() public {
        // Activate emergency stop
        vm.prank(owner);
        permissionManager.emergencyStop("Emergency test");

        assertTrue(permissionManager.emergencyStop());

        // Resume operations
        vm.prank(owner);
        permissionManager.resumeOperations();

        assertFalse(permissionManager.emergencyStop());
    }
}