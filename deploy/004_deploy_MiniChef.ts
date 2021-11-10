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

  // Deploy retroactive vesting contract for airdrops
  await deploy("MiniChefV2", {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [(await get("SDL")).address],
  })

  const minichef: MiniChefV2 = await ethers.getContract("MiniChefV2")

  // TODO: Update MiniChef reward amounts
  const batchCall = [
    await minichef.populateTransaction.setSaddlePerSecond(BIG_NUMBER_1E18),
    await minichef.populateTransaction.add(
      10,
      "0xc9da65931abf0ed1b74ce5ad8c041c4220940368", // alETH
      "0x0000000000000000000000000000000000000000",
    ),
    await minichef.populateTransaction.add(
      10,
      "0xd48cf4d7fb0824cc8bae055df3092584d0a1726a", // d4
      "0x0000000000000000000000000000000000000000",
    ),
    await minichef.populateTransaction.add(
      10,
      "0x5f86558387293b6009d7896a61fcc86c17808d62", // USD v2
      "0x0000000000000000000000000000000000000000",
    ),
    await minichef.populateTransaction.add(
      10,
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

  // Transfer 500_000 SDL tokens to the MiniChef contract
  await execute(
    "SDL",
    { from: deployer, log: true },
    "transfer",
    (
      await get("MiniChefV2")
    ).address,
    BIG_NUMBER_1E18.mul(500_000),
  )
}
export default func
func.tags = ["MiniChef"]
