import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-web3"
import "@nomiclabs/hardhat-etherscan"
import "@typechain/hardhat"
import "hardhat-gas-reporter"
import "solidity-coverage"
import "hardhat-deploy"
import "hardhat-spdx-license-identifier"

import { HardhatUserConfig } from "hardhat/config"
import dotenv from "dotenv"

dotenv.config()

let config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      hardfork: process.env.CODE_COVERAGE ? "berlin" : "london",
    },
    mainnet: {
      url: process.env.ALCHEMY_API,
      gasPrice: 180 * 1000000000,
    },
  },
  paths: {
    artifacts: "./build/artifacts",
    cache: "./build/cache",
  },
  solidity: {
    compilers: [
      {
        version: "0.8.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000,
          },
        },
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000,
          },
        },
      },
    ],
  },
  typechain: {
    outDir: "./build/typechain/",
    target: "ethers-v5",
  },
  gasReporter: {
    currency: "USD",
    gasPrice: 21,
  },
  mocha: {
    timeout: 200000,
  },
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
      1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
      31337: 4, // use 5th address on localhost to avoid nonce updates from contract repo changes
    },
    libraryDeployer: {
      default: 1, // use a different account for deploying libraries on the hardhat network
      1: 0, // use the same address as the main deployer on mainnet
    },
  },
  spdxLicenseIdentifier: {
    overwrite: false,
    runOnCompile: true,
  },
}

if (process.env.ETHERSCAN_API) {
  config = { ...config, etherscan: { apiKey: process.env.ETHERSCAN_API } }
}

if (process.env.ACCOUNT_PRIVATE_KEYS) {
  config.networks = {
    ...config.networks,
    mainnet: {
      ...config.networks?.mainnet,
      accounts: JSON.parse(process.env.ACCOUNT_PRIVATE_KEYS),
    },
  }
}

export default config
