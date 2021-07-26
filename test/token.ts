import {
  ZERO_ADDRESS,
  asyncForEach, getDeployedContractByName
} from "./testUtils"
import { solidity } from "ethereum-waffle"
import { deployments } from "hardhat"

import { Vesting } from "../build/typechain/"
import { Signer } from "ethers"
import chai from "chai"
import { formatBytes32String } from "ethers/lib/utils"

chai.use(solidity)
const { expect } = chai


describe("Vesting", () => {
  let signers: Array<Signer>
  let deployer: Signer
  let deployerAddress: string
  let malActor: Signer
  let vesting: Vesting

  const setupTest = deployments.createFixture(
    async ({ deployments, ethers }) => {
      const { deploy } = deployments
      await deployments.fixture() // ensure you start from a fresh deployments

      signers = await ethers.getSigners()
      deployer = signers[0]
      deployerAddress = await deployer.getAddress()
      malActor = signers[10]

      await deploy("Vesting", {
        from: deployerAddress
      })
      vesting = await getDeployedContractByName(deployments, "Vesting") as Vesting
    },
  )

  beforeEach(async () => {
    await setupTest()
  })

  describe("initialize", () => {
    it("Successfully initializes vesting contract", async () => {
    })
  })
})
