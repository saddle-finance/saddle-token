import { BIG_NUMBER_1E18, MAX_UINT256, isTestNetwork } from "../test/testUtils"

import { BigNumber } from "ethers"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

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

  // Investor vesting schedule
  const TWO_YEARS_IN_SEC = BigNumber.from(2).mul(365).mul(24).mul(60).mul(60)

  // Team/advisor vesting schedule
  const THREE_YEARS_IN_SEC = BigNumber.from(3).mul(365).mul(24).mul(60).mul(60)

  // Tuesday, November 16, 2021 12:00:00 AM UTC
  const TOKEN_LAUNCH_TIMESTAMP = BigNumber.from(1637020800)

  // Wednesday, July 7, 2021 12:00:00 AM UTC
  const FIRST_BATCH_TEAM_VESTING_START_TIMESTAMP = BigNumber.from(1625616000)

  // Monday, October 4, 2021 12:00:00 AM UTC
  const SECOND_BATCH_TEAM_VESTING_START_TIMESTAMP = BigNumber.from(1633305600)

  const vestingRecipients: Recipient[] = [
    // Protocol treasury
    {
      to: "0x3F8E527aF4e0c6e763e8f368AC679c44C45626aE",
      amount: BIG_NUMBER_1E18.mul(300_000_000),
      startTimestamp: TOKEN_LAUNCH_TIMESTAMP,
      cliffPeriod: BigNumber.from(0),
      durationPeriod: THREE_YEARS_IN_SEC,
    },
    // First batch of team grants
    {
      to: "0x27E2E09a84BaE20C2a9667594896EaF132c862b7",
      amount: BIG_NUMBER_1E18.mul(120_000_000),
      startTimestamp: FIRST_BATCH_TEAM_VESTING_START_TIMESTAMP,
      cliffPeriod: BigNumber.from(0),
      durationPeriod: THREE_YEARS_IN_SEC,
    },
    {
      to: "0xD9AED190e9Ae62b59808537D2EBD9E123eac4703",
      amount: BIG_NUMBER_1E18.mul(8_000_000),
      startTimestamp: FIRST_BATCH_TEAM_VESTING_START_TIMESTAMP,
      cliffPeriod: BigNumber.from(0),
      durationPeriod: THREE_YEARS_IN_SEC,
    },
    {
      to: "0x82AbEDF193942a6Cdc4704A8D49e54fE51160E99",
      amount: BIG_NUMBER_1E18.mul(12_000_000),
      startTimestamp: FIRST_BATCH_TEAM_VESTING_START_TIMESTAMP,
      cliffPeriod: BigNumber.from(0),
      durationPeriod: THREE_YEARS_IN_SEC,
    },
    // Second batch of team grants
    {
      to: "0xc4266Db4A83165Bf1284b564853BFB4DE553C3E1",
      amount: BIG_NUMBER_1E18.mul(6_500_000),
      startTimestamp: SECOND_BATCH_TEAM_VESTING_START_TIMESTAMP,
      cliffPeriod: BigNumber.from(0),
      durationPeriod: THREE_YEARS_IN_SEC,
    },
    {
      to: "0xcb10D759cAaA8eC12a4D2E59F9d55018Dd8B1C9a",
      amount: BIG_NUMBER_1E18.mul(8_500_000),
      startTimestamp: SECOND_BATCH_TEAM_VESTING_START_TIMESTAMP,
      cliffPeriod: BigNumber.from(0),
      durationPeriod: THREE_YEARS_IN_SEC,
    },
    {
      to: "0xC13F274e5608C6976463fB401EcAbd7301187937",
      amount: BIG_NUMBER_1E18.mul(100_000),
      startTimestamp: SECOND_BATCH_TEAM_VESTING_START_TIMESTAMP,
      cliffPeriod: BigNumber.from(0),
      durationPeriod: THREE_YEARS_IN_SEC,
    },
    {
      to: "0xa1fC498f0D5ad41d3d1317Fc1dBcBA54e951a2fb",
      amount: BIG_NUMBER_1E18.mul(1_900_000),
      startTimestamp: SECOND_BATCH_TEAM_VESTING_START_TIMESTAMP,
      cliffPeriod: BigNumber.from(0),
      durationPeriod: THREE_YEARS_IN_SEC,
    },
    // Third batch of team grants
    {
      to: "0x6265aaFC8D25B36f97181C44d0EB6693f00EbA17",
      amount: BIG_NUMBER_1E18.mul(2_000_000),
      startTimestamp: TOKEN_LAUNCH_TIMESTAMP,
      cliffPeriod: BigNumber.from(0),
      durationPeriod: THREE_YEARS_IN_SEC,
    },
    // Advisors
    {
      to: "0x779492ADFff61f10e224184201979C97Cf7B1ED4",
      amount: BIG_NUMBER_1E18.mul(2_000_000),
      startTimestamp: TOKEN_LAUNCH_TIMESTAMP,
      cliffPeriod: BigNumber.from(0),
      durationPeriod: THREE_YEARS_IN_SEC,
    },
    {
      to: "0x60063d83E8AB6f2266b6eFcbfa985640CDD3Fc90",
      amount: BIG_NUMBER_1E18.mul(4_000_000),
      startTimestamp: TOKEN_LAUNCH_TIMESTAMP,
      cliffPeriod: BigNumber.from(0),
      durationPeriod: THREE_YEARS_IN_SEC,
    },
    // Encode
    {
      to: "TODO",
      amount: BIG_NUMBER_1E18.mul(2_500_000),
      startTimestamp: TOKEN_LAUNCH_TIMESTAMP,
      cliffPeriod: BigNumber.from(0),
      durationPeriod: THREE_YEARS_IN_SEC,
    },
    // TODO: Investors
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
