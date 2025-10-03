const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Token Tests", function () {
  let governanceToken;
  let token;
  let owner;
  let user1;
  let user2;
  let user3;

  const challenge = "test-challenge";
  const hash = ethers.keccak256(ethers.toUtf8Bytes("test-data"));
  const signature = ethers.toUtf8Bytes("test-signature");

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy GovernanceToken
    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    governanceToken = await GovernanceToken.deploy();
    await governanceToken.waitForDeployment();

    // Deploy Token with GovernanceToken address
    const Token = await ethers.getContractFactory("Token");
    token = await Token.deploy(await governanceToken.getAddress());
    await token.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await token.getAddress()).to.be.properAddress;
    });

    it("Should set the correct owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should set the correct governance token", async function () {
      expect(await token.governanceToken()).to.equal(await governanceToken.getAddress());
    });

    it("Should have correct name and symbol", async function () {
      expect(await token.name()).to.equal("Token");
      expect(await token.symbol()).to.equal("TKN");
    });

    it("Should not deploy with zero address governance token", async function () {
      const Token = await ethers.getContractFactory("Token");
      await expect(Token.deploy(ethers.ZeroAddress)).to.be.revertedWith(
        "Invalid governance token address"
      );
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint to whitelisted address", async function () {
      await governanceToken.addAddress(user1.address, challenge, hash, signature);

      await token.mint(user1.address, ethers.parseEther("100"));
      expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should not allow minting to non-whitelisted address", async function () {
      await expect(
        token.mint(user1.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Recipient not whitelisted");
    });

    it("Should not allow non-owner to mint", async function () {
      await governanceToken.addAddress(user1.address, challenge, hash, signature);

      await expect(
        token.connect(user1).mint(user1.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  describe("Transfer", function () {
    beforeEach(async function () {
      // Whitelist user1 and user2
      await governanceToken.addAddress(user1.address, challenge, hash, signature);
      await governanceToken.addAddress(user2.address, challenge, hash, signature);

      // Mint tokens to user1
      await token.mint(user1.address, ethers.parseEther("1000"));
    });

    it("Should allow transfer between whitelisted addresses", async function () {
      await token.connect(user1).transfer(user2.address, ethers.parseEther("100"));

      expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("900"));
      expect(await token.balanceOf(user2.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should not allow transfer from non-whitelisted sender", async function () {
      // Remove user1 from whitelist
      await governanceToken.removeAddress(user1.address, "Test removal");

      await expect(
        token.connect(user1).transfer(user2.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Sender not whitelisted");
    });

    it("Should not allow transfer to non-whitelisted recipient", async function () {
      await expect(
        token.connect(user1).transfer(user3.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Recipient not whitelisted");
    });

    it("Should not allow transfer when both sender and recipient are not whitelisted", async function () {
      // Remove both from whitelist
      await governanceToken.removeAddress(user1.address, "Test removal");

      await expect(
        token.connect(user1).transfer(user3.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Sender not whitelisted");
    });
  });

  describe("TransferFrom", function () {
    beforeEach(async function () {
      // Whitelist user1 and user2
      await governanceToken.addAddress(user1.address, challenge, hash, signature);
      await governanceToken.addAddress(user2.address, challenge, hash, signature);

      // Mint tokens to user1
      await token.mint(user1.address, ethers.parseEther("1000"));
    });

    it("Should allow transferFrom between whitelisted addresses", async function () {
      // user1 approves user2 to spend tokens
      await token.connect(user1).approve(user2.address, ethers.parseEther("100"));

      // user2 transfers from user1 to user2
      await token.connect(user2).transferFrom(user1.address, user2.address, ethers.parseEther("100"));

      expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("900"));
      expect(await token.balanceOf(user2.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should not allow transferFrom when sender is not whitelisted", async function () {
      // user1 approves user2
      await token.connect(user1).approve(user2.address, ethers.parseEther("100"));

      // Remove user1 from whitelist
      await governanceToken.removeAddress(user1.address, "Test removal");

      await expect(
        token.connect(user2).transferFrom(user1.address, user2.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Sender not whitelisted");
    });

    it("Should not allow transferFrom when recipient is not whitelisted", async function () {
      // user1 approves user2
      await token.connect(user1).approve(user2.address, ethers.parseEther("100"));

      await expect(
        token.connect(user2).transferFrom(user1.address, user3.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Recipient not whitelisted");
    });

    it("Should not allow transferFrom when both are not whitelisted", async function () {
      // user1 approves user2
      await token.connect(user1).approve(user2.address, ethers.parseEther("100"));

      // Remove user1 from whitelist
      await governanceToken.removeAddress(user1.address, "Test removal");

      await expect(
        token.connect(user2).transferFrom(user1.address, user3.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Sender not whitelisted");
    });
  });

  describe("Whitelist Integration", function () {
    it("Should respect dynamic whitelist changes", async function () {
      // Whitelist and mint to user1
      await governanceToken.addAddress(user1.address, challenge, hash, signature);
      await token.mint(user1.address, ethers.parseEther("1000"));

      // Whitelist user2 and allow transfer
      await governanceToken.addAddress(user2.address, challenge, hash, signature);
      await token.connect(user1).transfer(user2.address, ethers.parseEther("100"));
      expect(await token.balanceOf(user2.address)).to.equal(ethers.parseEther("100"));

      // Remove user2 from whitelist
      await governanceToken.removeAddress(user2.address, "Dynamic test");

      // Transfer should now fail
      await expect(
        token.connect(user1).transfer(user2.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Recipient not whitelisted");

      // Re-whitelist user2
      await governanceToken.addAddress(user2.address, challenge, hash, signature);

      // Transfer should work again
      await token.connect(user1).transfer(user2.address, ethers.parseEther("100"));
      expect(await token.balanceOf(user2.address)).to.equal(ethers.parseEther("200"));
    });
  });
});
