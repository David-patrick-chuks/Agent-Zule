import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "hardhat-contract-sizer";
import "hardhat-abi-exporter";
import "hardhat-deploy";
import "hardhat-tracer";
import "dotenv/config";

const config: HardhatUserConfig = {
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
      forking: {
        url: process.env.MONAD_TESTNET_RPC || "https://testnet.monad.xyz",
      },
    },
    "monad-testnet": {
      url: process.env.MONAD_TESTNET_RPC || "https://testnet.monad.xyz",
      chainId: 123456789,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 1000000000, // 1 gwei
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
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
      "monad-testnet": process.env.MONAD_API_KEY || "",
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

export default config;
