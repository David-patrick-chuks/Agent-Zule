import { Contract } from "ethers";
import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting Agent Zule Core Contracts Deployment...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy contracts in order
  let contracts: { [key: string]: Contract } = {};

  try {
    // 1. Deploy VotingEngine first (needed by PermissionManager)
    console.log("\n📊 Deploying VotingEngine...");
    const VotingEngine = await ethers.getContractFactory("VotingEngine");
    const votingEngine = await VotingEngine.deploy(ethers.ZeroAddress); // Placeholder governance token
    await votingEngine.waitForDeployment();
    const votingEngineAddress = await votingEngine.getAddress();
    console.log("✅ VotingEngine deployed to:", votingEngineAddress);
    contracts.VotingEngine = votingEngine;

    // 2. Deploy PermissionManager
    console.log("\n🔐 Deploying PermissionManager...");
    const PermissionManager = await ethers.getContractFactory("PermissionManager");
    const permissionManager = await PermissionManager.deploy(votingEngineAddress);
    await permissionManager.waitForDeployment();
    const permissionManagerAddress = await permissionManager.getAddress();
    console.log("✅ PermissionManager deployed to:", permissionManagerAddress);
    contracts.PermissionManager = permissionManager;

    // 3. Deploy ExecutionEngine (placeholder for now)
    console.log("\n⚙️ Deploying ExecutionEngine...");
    // For now, we'll use a placeholder address
    const executionEngineAddress = ethers.ZeroAddress;
    console.log("✅ ExecutionEngine placeholder:", executionEngineAddress);

    // 4. Deploy PortfolioAgent
    console.log("\n🤖 Deploying PortfolioAgent...");
    const PortfolioAgent = await ethers.getContractFactory("PortfolioAgent");
    const portfolioAgent = await PortfolioAgent.deploy(
      permissionManagerAddress,
      votingEngineAddress,
      executionEngineAddress
    );
    await portfolioAgent.waitForDeployment();
    const portfolioAgentAddress = await portfolioAgent.getAddress();
    console.log("✅ PortfolioAgent deployed to:", portfolioAgentAddress);
    contracts.PortfolioAgent = portfolioAgent;

    // 5. Set up roles and permissions
    console.log("\n🔧 Setting up roles and permissions...");
    
    // Grant AI_AGENT_ROLE to PortfolioAgent
    const AI_AGENT_ROLE = await permissionManager.AI_AGENT_ROLE();
    await permissionManager.grantRole(AI_AGENT_ROLE, portfolioAgentAddress);
    console.log("✅ Granted AI_AGENT_ROLE to PortfolioAgent");

    // Grant VOTER_ROLE to deployer
    const VOTER_ROLE = await votingEngine.VOTER_ROLE();
    await votingEngine.grantRole(VOTER_ROLE, deployer.address);
    console.log("✅ Granted VOTER_ROLE to deployer");

    // 6. Verify deployments
    console.log("\n🔍 Verifying deployments...");
    
    // Check PortfolioAgent
    const portfolioAgentAdmin = await portfolioAgent.hasRole(await portfolioAgent.DEFAULT_ADMIN_ROLE(), deployer.address);
    console.log("PortfolioAgent admin role:", portfolioAgentAdmin);

    // Check PermissionManager
    const permissionManagerAdmin = await permissionManager.hasRole(await permissionManager.DEFAULT_ADMIN_ROLE(), deployer.address);
    console.log("PermissionManager admin role:", permissionManagerAdmin);

    // Check VotingEngine
    const votingEngineAdmin = await votingEngine.hasRole(await votingEngine.DEFAULT_ADMIN_ROLE(), deployer.address);
    console.log("VotingEngine admin role:", votingEngineAdmin);

    // 7. Display deployment summary
    console.log("\n🎉 Deployment Summary:");
    console.log("=====================================");
    console.log("PortfolioAgent:", portfolioAgentAddress);
    console.log("PermissionManager:", permissionManagerAddress);
    console.log("VotingEngine:", votingEngineAddress);
    console.log("ExecutionEngine:", executionEngineAddress, "(placeholder)");
    console.log("=====================================");

    // 8. Save deployment info
    const deploymentInfo = {
      network: await ethers.provider.getNetwork(),
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: {
        PortfolioAgent: portfolioAgentAddress,
        PermissionManager: permissionManagerAddress,
        VotingEngine: votingEngineAddress,
        ExecutionEngine: executionEngineAddress
      }
    };

    console.log("\n📝 Deployment Info:");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    console.log("\n✅ Agent Zule Core Contracts deployed successfully!");
    console.log("\n🚀 Next steps:");
    console.log("1. Deploy ExecutionEngine contract");
    console.log("2. Set up governance token");
    console.log("3. Configure risk parameters");
    console.log("4. Test contract interactions");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
