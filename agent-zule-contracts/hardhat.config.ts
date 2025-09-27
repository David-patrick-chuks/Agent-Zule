const { HardhatUserConfig } = require("hardhat/config");
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
// require("dotenv/config"); // Commented out since no .env file
require("hardhat-abi-exporter");
require("hardhat-contract-sizer");
require("hardhat-deploy");
require("hardhat-gas-reporter");
require("hardhat-tracer");
require("solidity-coverage");

const config = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      // Remove forking during compilation to avoid RPC errors
    },
    "monad-testnet": {
      url: "https://testnet.monad.xyz",
      chainId: 123456789,
      accounts: [], // No private keys for compilation
      gasPrice: 1000000000, // 1 gwei
      timeout: 60000, // 60 seconds
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
  gasReporter: {
    enabled: false, // Disabled for compilation without env vars
    currency: "USD",
    gasPrice: 20,
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  },
  abiExporter: {
    path: "./abis",
    runOnCompile: true,
    clear: true,
    flat: true,
    only: [":PortfolioAgent", ":PermissionManager", ":VotingEngine"],
    spacing: 2,
  },
  etherscan: {
    apiKey: {
      "monad-testnet": "", // No API key needed for compilation
    },
    customChains: [
      {
        network: "monad-testnet",
        chainId: 123456789,
        urls: {
          apiURL: "https://testnet.monadscan.com/api",
          browserURL: "https://testnet.monadscan.com",
        },
      },
    ],
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    admin: {
      default: 1,
    },
    user1: {
      default: 2,
    },
    user2: {
      default: 3,
    },
  },
  mocha: {
    timeout: 40000,
  },
};

module.exports = config;
