import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { BIG_NUMBER_1E18 } from "../test/testUtils"
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
  const TOTAL_LM_REWARDS = BIG_NUMBER_1E18.mul(12_500_000)
  // 6 months (24 weeks)
  const lmRewardsPerSecond = TOTAL_LM_REWARDS.div(6 * 4 * 7 * 24 * 3600)

  // TODO: Update MiniChef reward amounts
  const batchCall = [
    await minichef.populateTransaction.setSaddlePerSecond(lmRewardsPerSecond),
    await minichef.populateTransaction.add(
      1,
      "0x0000000000000000000000000000000000000000", // blank lp token to enforce totalAllocPoint != 0
      "0x0000000000000000000000000000000000000000",
    ),
    await minichef.populateTransaction.add(
      0,
      "0xc9da65931abf0ed1b74ce5ad8c041c4220940368", // alETH
      "0x0000000000000000000000000000000000000000",
    ),
    await minichef.populateTransaction.add(
      0,
      "0xd48cf4d7fb0824cc8bae055df3092584d0a1726a", // d4
      "0x0000000000000000000000000000000000000000",
    ),
    await minichef.populateTransaction.add(
      0,
      "0x5f86558387293b6009d7896a61fcc86c17808d62", // USD v2
      "0x0000000000000000000000000000000000000000",
    ),
    await minichef.populateTransaction.add(
      0,
      "0xf32e91464ca18fc156ab97a697d6f8ae66cd21a3", // BTC v2
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

  // Transfer 1 month worth of LM rewards to MiniChefV2
  await execute(
    "SDL",
    { from: deployer, log: true },
    "transfer",
    (
      await get("MiniChefV2")
    ).address,
    TOTAL_LM_REWARDS.div(6),
  )
}
export default func
func.tags = ["MiniChef"]
