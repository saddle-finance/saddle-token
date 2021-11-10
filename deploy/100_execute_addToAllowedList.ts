import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { isTestNetwork } from "../test/testUtils"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { deploy, execute, get } = deployments
  const { deployer } = await getNamedAccounts()

  await execute("SDL", { from: deployer, log: true }, "addToAllowedList", [
    (await get("RetroactiveVesting")).address,
    (await get("MiniChefV2")).address,
  ])
}
export default func
func.tags = ["addToAllowedList"]
