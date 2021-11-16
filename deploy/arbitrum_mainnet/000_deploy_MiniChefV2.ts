import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { BIG_NUMBER_1E18, isTestNetwork } from "../test/testUtils"
import { ethers } from "hardhat"
import { MiniChefV2 } from "../build/typechain"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { deploy, get, execute } = deployments
  const { deployer } = await getNamedAccounts()

  // Deploy retroactive vesting contract for airdrops
  await deploy("MiniChefV2", {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [(await get("SDL")).address],
  })

  const minichef: MiniChefV2 = await ethers.getContract("MiniChefV2")

  // Total LM rewards is 30,000,000 but only 12,500,000 is allocated in the beginning
  // Aribtrum's portion is 5_000_000
  const TOTAL_LM_REWARDS = BIG_NUMBER_1E18.mul(5_000_000)
  // 6 months (24 weeks)
  const lmRewardsPerSecond = TOTAL_LM_REWARDS.div(6 * 4 * 7 * 24 * 3600)

  const chainId = await getChainId()

  const batchCall = [
    await minichef.populateTransaction.setSaddlePerSecond(lmRewardsPerSecond),
    await minichef.populateTransaction.add(
      1,
      "0x0000000000000000000000000000000000000000", // blank lp token to enforce totalAllocPoint != 0
      "0x0000000000000000000000000000000000000000",
    ),
    await minichef.populateTransaction.add(
      0,
      isTestNetwork(chainId)
        ? "0xAe367415f4BDe0aDEE3e59C35221d259f517413E"
        : "0xc9da65931abf0ed1b74ce5ad8c041c4220940368", // alETH
      "0x0000000000000000000000000000000000000000",
    ),
  ]

  const batchCallData = batchCall.map((x) => x.data)

  // Send batch call
  await execute(
    "MiniChefV2",
    { from: deployer, log: true },
    "batch",
    batchCallData,
    false,
  )

  // Transfer Ownership to the saddle multisig on arbitrum
  await execute(
    "MiniChefV2",
    { from: deployer, log: true },
    "transferOwnership",
    "0x8e6e84DDab9d13A17806d34B097102605454D147",
    false,
    false,
  )
}
export default func
func.tags = ["MiniChef"]
