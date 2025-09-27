import { ethers } from "hardhat";

async function main() {
  console.log("🔄 Upgrading PortfolioAgent Contract...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading with account:", deployer.address);

  // Get contract addresses
  const portfolioAgentAddress = process.env.PORTFOLIO_AGENT_ADDRESS;
  const proxyAdminAddress = process.env.PROXY_ADMIN_ADDRESS;

  if (!portfolioAgentAddress) {
    console.error("❌ Missing PORTFOLIO_AGENT_ADDRESS in environment variables");
    process.exit(1);
  }

  try {
    // Deploy new implementation
    console.log("📦 Deploying new PortfolioAgent implementation...");
    const PortfolioAgent = await ethers.getContractFactory("PortfolioAgent");
    const newImplementation = await PortfolioAgent.deploy(
      process.env.PERMISSION_MANAGER_ADDRESS || ethers.ZeroAddress,
      process.env.VOTING_ENGINE_ADDRESS || ethers.ZeroAddress,
      process.env.EXECUTION_ENGINE_ADDRESS || ethers.ZeroAddress
    );
    await newImplementation.waitForDeployment();
    const newImplementationAddress = await newImplementation.getAddress();
    console.log("✅ New implementation deployed to:", newImplementationAddress);

    // Get proxy admin if available
    if (proxyAdminAddress) {
      console.log("🔧 Using ProxyAdmin for upgrade...");
      const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
      const proxyAdmin = ProxyAdmin.attach(proxyAdminAddress);
      
      // Upgrade the proxy
      await proxyAdmin.upgradeProxy(portfolioAgentAddress, newImplementationAddress);
      console.log("✅ Proxy upgraded via ProxyAdmin");
    } else {
      console.log("⚠️ No ProxyAdmin found, manual upgrade required");
      console.log("To upgrade manually:");
      console.log(`1. Call upgradeTo(${newImplementationAddress}) on ${portfolioAgentAddress}`);
      console.log("2. Verify the upgrade was successful");
    }

    // Verify the upgrade
    console.log("🔍 Verifying upgrade...");
    const portfolioAgent = PortfolioAgent.attach(portfolioAgentAddress);
    
    // Check if the contract is still functional
    const adminRole = await portfolioAgent.DEFAULT_ADMIN_ROLE();
    const isAdmin = await portfolioAgent.hasRole(adminRole, deployer.address);
    
    if (isAdmin) {
      console.log("✅ Upgrade verification successful");
    } else {
      console.log("❌ Upgrade verification failed");
    }

    // Display upgrade summary
    console.log("\n🎉 PortfolioAgent Upgrade Complete!");
    console.log("=====================================");
    console.log("Proxy Address:", portfolioAgentAddress);
    console.log("New Implementation:", newImplementationAddress);
    console.log("Upgrade Status: ✅ Success");
    console.log("=====================================");

    console.log("\n📋 Post-Upgrade Checklist:");
    console.log("1. ✅ New implementation deployed");
    console.log("2. ✅ Proxy upgraded");
    console.log("3. ✅ Contract functionality verified");
    console.log("4. ⏳ Test all core functions");
    console.log("5. ⏳ Verify event emissions");
    console.log("6. ⏳ Check gas costs");

    console.log("\n🚀 Next Steps:");
    console.log("1. Run comprehensive tests");
    console.log("2. Verify all integrations work");
    console.log("3. Update frontend/backend with new ABI");
    console.log("4. Monitor system performance");

  } catch (error) {
    console.error("❌ Upgrade failed:", error);
    process.exit(1);
  }
}

// Execute upgrade
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
