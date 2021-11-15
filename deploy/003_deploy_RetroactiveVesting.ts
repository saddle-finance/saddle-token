import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { BIG_NUMBER_1E18 } from "../test/testUtils"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { deploy, get, execute } = deployments
  const { deployer } = await getNamedAccounts()

  // Deploy retroactive vesting contract for airdrops
  await deploy("RetroactiveVesting", {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [
      (await get("SDL")).address,
      "0x4cead4a17e8540e1f11adb8b3b23d6a02c1ba49db95d351c3fd0535664d9d292", // TODO: update merkle root
      1637042400, // Tuesday, November 16, 2021 6:00:00 AM
    ],
  })

  // Transfer 150_000_000 SDL tokens to the retroactive vesting contract
  await execute(
    "SDL",
    { from: deployer, log: true },
    "transfer",
    (
      await get("RetroactiveVesting")
    ).address,
    BIG_NUMBER_1E18.mul(150_000_000),
  )
}
export default func
func.tags = ["RetroactiveVesting"]
