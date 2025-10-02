// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {PortfolioAgent} from "../src/core/PortfolioAgent.sol";
import {PermissionManager} from "../src/permissions/PermissionManager.sol";
import {VotingEngine} from "../src/governance/VotingEngine.sol";
import {ExecutionEngine} from "../src/core/ExecutionEngine.sol";
import {YieldOptimizer} from "../src/strategies/YieldOptimizer.sol";
import {BridgeManager} from "../src/crosschain/BridgeManager.sol";

/**
 * @title DeployAgentZule
 * @dev Deployment script for Agent Zule contracts
 * @notice Deploys all contracts in the correct order with proper initialization
 */
contract DeployAgentZule is Script {
    // Contract instances
    PortfolioAgent public portfolioAgent;
    PermissionManager public permissionManager;
    VotingEngine public votingEngine;
    ExecutionEngine public executionEngine;
    YieldOptimizer public yieldOptimizer;
    BridgeManager public bridgeManager;

    // Deployment addresses
    address public portfolioAgentAddress;
    address public permissionManagerAddress;
    address public votingEngineAddress;
    address public executionEngineAddress;
    address public yieldOptimizerAddress;
    address public bridgeManagerAddress;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying Agent Zule contracts...");
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance / 1e18, "ETH");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy a mock governance token first (VotingEngine needs it)
        console.log("\n1. Creating mock governance token...");
        address governanceToken = makeAddr("governanceToken"); // Mock token for now
        console.log("Mock governance token at:", governanceToken);

        // 2. Deploy VotingEngine
        console.log("\n2. Deploying VotingEngine...");
        votingEngine = new VotingEngine(governanceToken);
        votingEngineAddress = address(votingEngine);
        console.log("VotingEngine deployed at:", votingEngineAddress);

        // 3. Deploy PermissionManager (needs VotingEngine)
        console.log("\n3. Deploying PermissionManager...");
        permissionManager = new PermissionManager(address(votingEngine));
        permissionManagerAddress = address(permissionManager);
        console.log("PermissionManager deployed at:", permissionManagerAddress);

        // 4. Deploy ExecutionEngine
        console.log("\n4. Deploying ExecutionEngine...");
        executionEngine = new ExecutionEngine();
        executionEngineAddress = address(executionEngine);
        console.log("ExecutionEngine deployed at:", executionEngineAddress);

        // 5. Deploy YieldOptimizer
        console.log("\n5. Deploying YieldOptimizer...");
        yieldOptimizer = new YieldOptimizer();
        yieldOptimizerAddress = address(yieldOptimizer);
        console.log("YieldOptimizer deployed at:", yieldOptimizerAddress);

        // 6. Deploy BridgeManager
        console.log("\n6. Deploying BridgeManager...");
        bridgeManager = new BridgeManager();
        bridgeManagerAddress = address(bridgeManager);
        console.log("BridgeManager deployed at:", bridgeManagerAddress);

        // 7. Deploy PortfolioAgent (main contract)
        console.log("\n7. Deploying PortfolioAgent...");
        portfolioAgent = new PortfolioAgent(
            permissionManagerAddress,
            votingEngineAddress,
            executionEngineAddress
        );
        portfolioAgentAddress = address(portfolioAgent);
        console.log("PortfolioAgent deployed at:", portfolioAgentAddress);

        vm.stopBroadcast();

        // 7. Initialize contracts
        console.log("\n7. Initializing contracts...");
        _initializeContracts();

        // 8. Print deployment summary
        _printDeploymentSummary();
        
        // 9. Save deployment info to file
        _saveDeploymentInfo();
    }

    function _initializeContracts() internal {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Grant roles to PortfolioAgent
        permissionManager.grantRole(keccak256("ADMIN_ROLE"), portfolioAgentAddress);
        votingEngine.grantRole(keccak256("ADMIN_ROLE"), portfolioAgentAddress);
        executionEngine.grantRole(keccak256("ADMIN_ROLE"), portfolioAgentAddress);

        // Set up initial permissions and configurations
        // Note: Configuration methods may need to be added to contracts
        console.log("Configuration methods not available in current contract versions");

        vm.stopBroadcast();
    }

    function _printDeploymentSummary() internal view {
        console.log("\n============================================================");
        console.log("AGENT ZULE DEPLOYMENT SUMMARY");
        console.log("============================================================");
        console.log("PortfolioAgent:", portfolioAgentAddress);
        console.log("PermissionManager:", permissionManagerAddress);
        console.log("VotingEngine:", votingEngineAddress);
        console.log("ExecutionEngine:", executionEngineAddress);
        console.log("YieldOptimizer:", yieldOptimizerAddress);
        console.log("BridgeManager:", bridgeManagerAddress);
        console.log("============================================================");
    }

    function _saveDeploymentInfo() internal {
        string memory deploymentInfo = string(abi.encodePacked(
            "// Agent Zule Contract Addresses\n",
            "// Deployed on: ", vm.toString(block.chainid), "\n",
            "// Deployment timestamp: ", vm.toString(block.timestamp), "\n\n",
            "export const CONTRACT_ADDRESSES = {\n",
            "  PortfolioAgent: '", vm.toString(portfolioAgentAddress), "',\n",
            "  PermissionManager: '", vm.toString(permissionManagerAddress), "',\n",
            "  VotingEngine: '", vm.toString(votingEngineAddress), "',\n",
            "  ExecutionEngine: '", vm.toString(executionEngineAddress), "',\n",
            "  YieldOptimizer: '", vm.toString(yieldOptimizerAddress), "',\n",
            "  BridgeManager: '", vm.toString(bridgeManagerAddress), "',\n",
            "};\n\n",
            "// For frontend .env.local file:\n",
            "NEXT_PUBLIC_PORTFOLIO_AGENT_ADDRESS=", vm.toString(portfolioAgentAddress), "\n",
            "NEXT_PUBLIC_PERMISSION_MANAGER_ADDRESS=", vm.toString(permissionManagerAddress), "\n",
            "NEXT_PUBLIC_VOTING_ENGINE_ADDRESS=", vm.toString(votingEngineAddress), "\n",
            "NEXT_PUBLIC_EXECUTION_ENGINE_ADDRESS=", vm.toString(executionEngineAddress), "\n"
        ));

        vm.writeFile("./deployment-info.txt", deploymentInfo);
        console.log("\nDeployment info saved to: ./deployment-info.txt");
    }
}
