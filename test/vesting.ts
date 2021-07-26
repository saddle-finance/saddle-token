import {
  ZERO_ADDRESS,
  getDeployedContractByName, setNextTimestamp, getCurrentBlockTimestamp, setTimestamp, increaseTimestamp
} from "./testUtils"
import { solidity } from "ethereum-waffle"
import { deployments } from "hardhat"

import { Vesting, GenericERC20, Cloner } from "../build/typechain/"
import {BigNumber, Signer} from "ethers"
import chai from "chai"

chai.use(solidity)
const { expect } = chai


describe("Vesting", () => {
  let signers: Array<Signer>
  let deployer: Signer
  let deployerAddress: string
  let beneficiary: Signer
  let beneficiaryAddress: string
  let governance: Signer
  let governanceAddress: string
  let malActor: Signer
  let vesting: Vesting
  let vestingClone: Vesting
  let dummyToken: GenericERC20
  let cloner: Cloner

  const setupTest = deployments.createFixture(
    async ({ deployments, ethers }) => {
      const { deploy, execute } = deployments
      await deployments.fixture() // ensure you start from a fresh deployments

      signers = await ethers.getSigners()
      deployer = signers[0]
      deployerAddress = await deployer.getAddress()
      beneficiary = signers[1]
      beneficiaryAddress = await beneficiary.getAddress()
      governance = signers[2]
      governanceAddress = await governance.getAddress()
      malActor = signers[10]

      vesting = await getDeployedContractByName(deployments, "Vesting") as Vesting

      await deploy("DummyToken", {
        contract: "GenericERC20",
        args: ["DummyToken", "TOKEN", 18],
        log: true,
        skipIfAlreadyDeployed: true,
        from: deployerAddress
      })

      dummyToken = await getDeployedContractByName(deployments, "DummyToken") as GenericERC20
      await dummyToken.mint(deployerAddress, BigNumber.from(10).pow(18).mul(10000))

      cloner = await getDeployedContractByName(deployments, "Cloner") as Cloner

      let cloneAddress = await cloner.callStatic.clone(vesting.address)
      await cloner.clone(vesting.address)

      vestingClone = await ethers.getContractAt("Vesting", cloneAddress) as Vesting
    },
  )

  beforeEach(async () => {
    await setupTest()
  })

  describe("initialize", () => {
    it("Fails to initialize the logic contract", async () => {
      await expect(vesting.initialize(dummyToken.address, beneficiaryAddress, 3600, 7200, governanceAddress)).to.be.revertedWith("cannot initialize logic contract")
    })

    it("Fails to initialize a clone with empty beneficiary", async () => {
      await expect(vestingClone.initialize(dummyToken.address, ZERO_ADDRESS, 3600, 7200, governanceAddress)).to.be.revertedWith("beneficiary cannot be empty")
    })

    it("Fails to initialize a clone with empty governance", async () => {
      await expect(vestingClone.initialize(dummyToken.address, beneficiaryAddress, 3600, 7200, ZERO_ADDRESS)).to.be.revertedWith("governance cannot be empty")
    })

    it("Fails to initialize a clone with longer cliff than duration", async () => {
      await expect(vestingClone.initialize(dummyToken.address, beneficiaryAddress, 7201, 7200, governanceAddress)).to.be.revertedWith("cliff is greater than duration")
    })

    it("Successfully initializes a clone", async () => {
      await vestingClone.initialize(dummyToken.address, beneficiaryAddress, 3600, 7200, governanceAddress)
      expect(await vestingClone.beneficiary()).to.eq(beneficiaryAddress)
      expect(await vestingClone.governance()).to.eq(governanceAddress)
    })
  })

  describe("vestedAmount", () => {
    const totalVestedAmount = BigNumber.from(10).pow(18).mul(10000)

    beforeEach(async () => {
      await vestingClone.initialize(dummyToken.address, beneficiaryAddress, 3600, 7200, governanceAddress)
      await dummyToken.transfer(vestingClone.address, totalVestedAmount)
    })

    it("Successfully calculates the vested amounts", async () => {
      const startTimestamp = await vestingClone.startTimestamp()

      // Before Cliff is reached
      expect(await vestingClone.vestedAmount()).to.eq(0)
      await setTimestamp(startTimestamp.add(1800))
      expect(await vestingClone.vestedAmount()).to.eq(0)

      // After Cliff is reached
      await setTimestamp(startTimestamp.add(3600))
      expect(await vestingClone.vestedAmount()).to.eq(totalVestedAmount.div(2))
      await setTimestamp(startTimestamp.add(5400))
      expect(await vestingClone.vestedAmount()).to.eq(totalVestedAmount.mul(3).div(4))

      // After Duration is over
      await setTimestamp(startTimestamp.add(7200))
      expect(await vestingClone.vestedAmount()).to.eq(totalVestedAmount)
    })
  })

  describe("release", () => {
    const totalVestedAmount = BigNumber.from(10).pow(18).mul(10000)

    beforeEach(async () => {
      await vestingClone.initialize(dummyToken.address, beneficiaryAddress, 3600, 7200, governanceAddress)
      await dummyToken.transfer(vestingClone.address, totalVestedAmount)
    })

    it("Fails when there are no tokens to claim", async () => {
      await expect(vestingClone.connect(beneficiary).release()).to.be.revertedWith("No tokens to release")
    })

    it("Successfully releases the vested amounts", async () => {
      const startTimestamp = await vestingClone.startTimestamp()

      // After Cliff is reached
      await setTimestamp(startTimestamp.add(3600))
      expect(await vestingClone.vestedAmount()).to.eq(totalVestedAmount.div(2))
      await vestingClone.connect(beneficiary).release()
      expect(await dummyToken.balanceOf(beneficiaryAddress)).gte(totalVestedAmount.div(2)).and.lte("5001388888888888888888")

      await setTimestamp(startTimestamp.add(5400))
      await vestingClone.connect(beneficiary).release()
      expect(await dummyToken.balanceOf(beneficiaryAddress)).gte(totalVestedAmount.mul(3).div(4)).and.lte("7501388888888888888888")

      // After Duration is over
      await setTimestamp(startTimestamp.add(7200))
      await vestingClone.connect(beneficiary).release()
      expect(await dummyToken.balanceOf(beneficiaryAddress)).eq(totalVestedAmount)
    })
  })
})
