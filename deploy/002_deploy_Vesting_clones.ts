import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { BIG_NUMBER_1E18, isTestNetwork, MAX_UINT256 } from "../test/testUtils"
import { BigNumber } from "ethers"
import { getCurrentTimestamp } from "hardhat/internal/hardhat-network/provider/utils/getCurrentTimestamp"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { deploy, get, execute } = deployments
  const { deployer } = await getNamedAccounts()

  interface Recipient {
    to: string
    amount: BigNumber
    startTimestamp: BigNumber
    cliffPeriod: BigNumber
    durationPeriod: BigNumber
  }

  // TODO: Update vesting start timestamp
  const vestingStartTimestamp = BigNumber.from(getCurrentTimestamp())

  // TODO: Update recipients
  const vestingRecipients: Recipient[] = [
    {
      to: deployer,
      amount: BIG_NUMBER_1E18.mul(1_000_000),
      startTimestamp: vestingStartTimestamp,
      cliffPeriod: BigNumber.from(3600),
      durationPeriod: BigNumber.from(7200),
    },
    {
      to: deployer,
      amount: BIG_NUMBER_1E18.mul(2_000_000),
      startTimestamp: vestingStartTimestamp,
      cliffPeriod: BigNumber.from(3600),
      durationPeriod: BigNumber.from(7200),
    },
    {
      to: deployer,
      amount: BIG_NUMBER_1E18.mul(3_000_000),
      startTimestamp: vestingStartTimestamp,
      cliffPeriod: BigNumber.from(3600),
      durationPeriod: BigNumber.from(7200),
    },
  ]

  // Approve the contract to use the token for deploying the vesting contracts
  await execute(
    "SDL",
    { from: deployer, log: true },
    "approve",
    (
      await get("SDL")
    ).address,
    MAX_UINT256,
  )

  // Deploy a new vesting contract clone for each recipient
  for (const recipient of vestingRecipients) {
    await execute(
      "SDL",
      {
        from: deployer,
        log: true,
      },
      "deployNewVestingContract",
      recipient,
    )
  }
}
export default func
func.tags = ["VestingClones"]
