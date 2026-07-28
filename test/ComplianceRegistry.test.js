const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ComplianceRegistry", function () {
  let registry;
  let owner, bridgeWallet, other;
  const policySAID = ethers.id("test-policy-said");

  beforeEach(async function () {
    [owner, bridgeWallet, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ComplianceRegistry");
    registry = await Factory.deploy(bridgeWallet.address, policySAID);
    await registry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set bridge signer and policySAID", async function () {
      expect(await registry.bridgeSigner()).to.equal(bridgeWallet.address);
      expect(await registry.policySAID()).to.equal(policySAID);
      expect(await registry.owner()).to.equal(owner.address);
    });
  });
});
