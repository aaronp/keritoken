const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GovernanceToken Tests", function () {
  let governanceToken;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy GovernanceToken
    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    governanceToken = await GovernanceToken.deploy();
    await governanceToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await governanceToken.getAddress()).to.be.properAddress;
    });

    it("Should set the correct owner", async function () {
      expect(await governanceToken.owner()).to.equal(owner.address);
    });
  });

  describe("Adding Addresses", function () {
    it("Should allow owner to add an address", async function () {
      const referenceId = "kyc-123";

      await expect(governanceToken.addAddress(user1.address, referenceId))
        .to.emit(governanceToken, "AddressAdded")
        .withArgs(user1.address, referenceId);

      expect(await governanceToken.isWhitelisted(user1.address)).to.be.true;
    });

    it("Should not allow non-owner to add an address", async function () {
      await expect(
        governanceToken.connect(user1).addAddress(user2.address, "ref")
      ).to.be.revertedWithCustomError(governanceToken, "OwnableUnauthorizedAccount");
    });

    it("Should not allow adding zero address", async function () {
      await expect(
        governanceToken.addAddress(ethers.ZeroAddress, "ref")
      ).to.be.revertedWith("Cannot whitelist zero address");
    });

    it("Should not allow adding the same address twice", async function () {
      await governanceToken.addAddress(user1.address, "ref-1");

      await expect(
        governanceToken.addAddress(user1.address, "ref-2")
      ).to.be.revertedWith("Address already whitelisted");
    });

    it("Should add multiple different addresses", async function () {
      await governanceToken.addAddress(user1.address, "ref-1");
      await governanceToken.addAddress(user2.address, "ref-2");

      expect(await governanceToken.isWhitelisted(user1.address)).to.be.true;
      expect(await governanceToken.isWhitelisted(user2.address)).to.be.true;
    });
  });

  describe("Removing Addresses", function () {
    beforeEach(async function () {
      await governanceToken.addAddress(user1.address, "kyc-123");
    });

    it("Should allow owner to remove an address", async function () {
      const reason = "Suspicious activity detected";

      await expect(governanceToken.removeAddress(user1.address, reason))
        .to.emit(governanceToken, "AddressRemoved")
        .withArgs(user1.address, reason);

      expect(await governanceToken.isWhitelisted(user1.address)).to.be.false;
    });

    it("Should not allow non-owner to remove an address", async function () {
      await expect(
        governanceToken.connect(user1).removeAddress(user1.address, "reason")
      ).to.be.revertedWithCustomError(governanceToken, "OwnableUnauthorizedAccount");
    });

    it("Should not allow removing an address that is not whitelisted", async function () {
      await expect(
        governanceToken.removeAddress(user2.address, "reason")
      ).to.be.revertedWith("Address not whitelisted");
    });

    it("Should allow re-adding an address after removal", async function () {
      await governanceToken.removeAddress(user1.address, "removed");
      expect(await governanceToken.isWhitelisted(user1.address)).to.be.false;

      await governanceToken.addAddress(user1.address, "re-added");
      expect(await governanceToken.isWhitelisted(user1.address)).to.be.true;
    });
  });

  describe("Checking Whitelist Status", function () {
    it("Should return false for non-whitelisted address", async function () {
      expect(await governanceToken.isWhitelisted(user1.address)).to.be.false;
    });

    it("Should return true for whitelisted address", async function () {
      await governanceToken.addAddress(user1.address, "kyc-123");
      expect(await governanceToken.isWhitelisted(user1.address)).to.be.true;
    });
  });
});
