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
      const challenge = "test-challenge-123";
      const hash = ethers.keccak256(ethers.toUtf8Bytes("test-data"));
      const signature = ethers.toUtf8Bytes("test-signature");

      await expect(
        governanceToken.addAddress(user1.address, challenge, hash, signature)
      )
        .to.emit(governanceToken, "AddressAdded")
        .withArgs(user1.address, challenge, hash, signature);

      expect(await governanceToken.isWhitelisted(user1.address)).to.be.true;
    });

    it("Should not allow non-owner to add an address", async function () {
      const challenge = "test-challenge-123";
      const hash = ethers.keccak256(ethers.toUtf8Bytes("test-data"));
      const signature = ethers.toUtf8Bytes("test-signature");

      await expect(
        governanceToken.connect(user1).addAddress(user2.address, challenge, hash, signature)
      ).to.be.revertedWithCustomError(governanceToken, "OwnableUnauthorizedAccount");
    });

    it("Should not allow adding zero address", async function () {
      const challenge = "test-challenge-123";
      const hash = ethers.keccak256(ethers.toUtf8Bytes("test-data"));
      const signature = ethers.toUtf8Bytes("test-signature");

      await expect(
        governanceToken.addAddress(ethers.ZeroAddress, challenge, hash, signature)
      ).to.be.revertedWith("Cannot whitelist zero address");
    });

    it("Should not allow adding the same address twice", async function () {
      const challenge = "test-challenge-123";
      const hash = ethers.keccak256(ethers.toUtf8Bytes("test-data"));
      const signature = ethers.toUtf8Bytes("test-signature");

      await governanceToken.addAddress(user1.address, challenge, hash, signature);

      await expect(
        governanceToken.addAddress(user1.address, challenge, hash, signature)
      ).to.be.revertedWith("Address already whitelisted");
    });

    it("Should add multiple different addresses", async function () {
      const challenge = "test-challenge-123";
      const hash = ethers.keccak256(ethers.toUtf8Bytes("test-data"));
      const signature = ethers.toUtf8Bytes("test-signature");

      await governanceToken.addAddress(user1.address, challenge, hash, signature);
      await governanceToken.addAddress(user2.address, challenge, hash, signature);

      expect(await governanceToken.isWhitelisted(user1.address)).to.be.true;
      expect(await governanceToken.isWhitelisted(user2.address)).to.be.true;
    });
  });

  describe("Removing Addresses", function () {
    beforeEach(async function () {
      // Add user1 to whitelist
      const challenge = "test-challenge-123";
      const hash = ethers.keccak256(ethers.toUtf8Bytes("test-data"));
      const signature = ethers.toUtf8Bytes("test-signature");
      await governanceToken.addAddress(user1.address, challenge, hash, signature);
    });

    it("Should allow owner to remove an address", async function () {
      const reason = "Suspicious activity detected";

      await expect(
        governanceToken.removeAddress(user1.address, reason)
      )
        .to.emit(governanceToken, "AddressRemoved")
        .withArgs(user1.address, reason);

      expect(await governanceToken.isWhitelisted(user1.address)).to.be.false;
    });

    it("Should not allow non-owner to remove an address", async function () {
      const reason = "Suspicious activity detected";

      await expect(
        governanceToken.connect(user1).removeAddress(user1.address, reason)
      ).to.be.revertedWithCustomError(governanceToken, "OwnableUnauthorizedAccount");
    });

    it("Should not allow removing an address that is not whitelisted", async function () {
      const reason = "Test reason";

      await expect(
        governanceToken.removeAddress(user2.address, reason)
      ).to.be.revertedWith("Address not whitelisted");
    });

    it("Should allow re-adding an address after removal", async function () {
      const reason = "Test removal";
      await governanceToken.removeAddress(user1.address, reason);

      expect(await governanceToken.isWhitelisted(user1.address)).to.be.false;

      const challenge = "new-challenge";
      const hash = ethers.keccak256(ethers.toUtf8Bytes("new-data"));
      const signature = ethers.toUtf8Bytes("new-signature");
      await governanceToken.addAddress(user1.address, challenge, hash, signature);

      expect(await governanceToken.isWhitelisted(user1.address)).to.be.true;
    });
  });

  describe("Checking Whitelist Status", function () {
    it("Should return false for non-whitelisted address", async function () {
      expect(await governanceToken.isWhitelisted(user1.address)).to.be.false;
    });

    it("Should return true for whitelisted address", async function () {
      const challenge = "test-challenge-123";
      const hash = ethers.keccak256(ethers.toUtf8Bytes("test-data"));
      const signature = ethers.toUtf8Bytes("test-signature");

      await governanceToken.addAddress(user1.address, challenge, hash, signature);
      expect(await governanceToken.isWhitelisted(user1.address)).to.be.true;
    });
  });
});
