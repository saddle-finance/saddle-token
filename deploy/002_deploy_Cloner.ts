import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { isTestNetwork } from "../test/testUtils"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  if (isTestNetwork(await getChainId())) {
    await deploy("Cloner", {
      from: deployer,
      log: true,
      skipIfAlreadyDeployed: true,
    })
  }
}
export default func
func.tags = ["Cloner"]
