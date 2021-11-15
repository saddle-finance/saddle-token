import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { deploy, get, execute } = deployments
  const { deployer } = await getNamedAccounts()

  const MULTISIG = "0x3F8E527aF4e0c6e763e8f368AC679c44C45626aE"

  // Change SDL governance to multisig
  // await execute(
  //   "SDL",
  //   { from: deployer, log: true },
  //   "changeGovernance",
  //   MULTISIG,
  // )

  // Change Minichef owner to multisig
  // await execute(
  //   "MiniChefV2",
  //   { from: deployer, log: true },
  //   "transferOwnership",
  //   MULTISIG,
  //   false,
  //   false,
  // )
}
export default func
func.tags = ["TransferOwnership"]
