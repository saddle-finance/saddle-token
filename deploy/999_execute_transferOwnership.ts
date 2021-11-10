import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { BIG_NUMBER_1E18, isTestNetwork } from "../test/testUtils"
import { ethers } from "hardhat"
import { getContract } from "@nomiclabs/hardhat-ethers/dist/src/helpers"
import { MiniChefV2 } from "../build/typechain"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { deploy, get, execute } = deployments
  const { deployer } = await getNamedAccounts()

  // TODO: Change multisig address
  const MULTISIG = "0x0000000000000000000000000000000000000001"

  // Change SDL governance to multisig
  await execute(
    "SDL",
    { from: deployer, log: true },
    "changeGovernance",
    MULTISIG,
  )

  // Change Minichef owner to multisig
  await execute(
    "MiniChefV2",
    { from: deployer, log: true },
    "transferOwnership",
    MULTISIG,
    false,
    false,
  )
}
export default func
func.tags = ["TransferOwnership"]
