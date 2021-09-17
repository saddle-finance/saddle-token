import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { BIG_NUMBER_1E18 } from "../test/testUtils"

const TIME = {
  HOUR: 3600,
  DAY: 3600 * 24,
  WEEK: 3600 * 24 * 7,
}

// Multisig that will hold the rest of the tokens after the initial minting
const MULTISIG_ADDRESS = "0x3F8E527aF4e0c6e763e8f368AC679c44C45626aE"

// List of recipients at deployment. Some are subject to vesting
const RECIPIENTS = [
  {
    to: "0x000000000000000000000000000000000000dEaD", // Vesting beneficiary address
    amount: BIG_NUMBER_1E18.mul(100_000_000), // Vesting amount
    cliffPeriod: 52 * TIME.WEEK, // Cliff period (setting it to 0 implies no vesting)
    durationPeriod: 156 * TIME.WEEK, // Vesting duration including cliff period (setting it to 0 implies no vesting)
  },
  // TODO: Add employees here
  {
    to: MULTISIG_ADDRESS,
    amount: BIG_NUMBER_1E18.mul(900_000_000),
    cliffPeriod: 0,
    durationPeriod: 0,
  },
]

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { deploy, get } = deployments
  const { deployer } = await getNamedAccounts()

  await deploy("SDL", {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [
      MULTISIG_ADDRESS, // governance address
      12 * TIME.WEEK, // time period since deployment until token transfer can be enabled by governance
      RECIPIENTS, // recipients
      (
        await get("Vesting")
      ).address, // vesting target contract
    ],
  })
}
export default func
func.tags = ["Vesting"]
