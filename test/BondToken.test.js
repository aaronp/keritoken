const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("BondToken", function () {
  let bondToken;
  let owner;
  let minter;
  let holder1;
  let holder2;
  let nonMinter;

  const NAME = "Treasury Bond 2025";
  const SYMBOL = "TB25";
  const MAX_SUPPLY = ethers.parseEther("1000000"); // 1M tokens
  const MATURITY_DATE = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year
  const FACE_VALUE = 100; // $100
  const COUPON_RATE = 250; // 2.5%

  beforeEach(async function () {
    [owner, minter, holder1, holder2, nonMinter] = await ethers.getSigners();

    const BondToken = await ethers.getContractFactory("BondToken");
    bondToken = await BondToken.deploy(
      NAME,
      SYMBOL,
      MAX_SUPPLY,
      MATURITY_DATE,
      FACE_VALUE,
      COUPON_RATE
    );
    await bondToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct token name and symbol", async function () {
      expect(await bondToken.name()).to.equal(NAME);
      expect(await bondToken.symbol()).to.equal(SYMBOL);
    });

    it("Should set the correct bond metadata", async function () {
      expect(await bondToken.maturityDate()).to.equal(MATURITY_DATE);
      expect(await bondToken.faceValue()).to.equal(FACE_VALUE);
      expect(await bondToken.couponRate()).to.equal(COUPON_RATE);
    });

    it("Should set the correct max supply cap", async function () {
      expect(await bondToken.cap()).to.equal(MAX_SUPPLY);
    });

    it("Should grant DEFAULT_ADMIN_ROLE to owner", async function () {
      const DEFAULT_ADMIN_ROLE = await bondToken.DEFAULT_ADMIN_ROLE();
      expect(await bondToken.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should have zero total supply initially", async function () {
      expect(await bondToken.totalSupply()).to.equal(0);
    });
  });

  describe("Access Control", function () {
    it("Should allow admin to grant MINTER_ROLE", async function () {
      const MINTER_ROLE = await bondToken.MINTER_ROLE();
      await bondToken.grantRole(MINTER_ROLE, minter.address);
      expect(await bondToken.hasRole(MINTER_ROLE, minter.address)).to.be.true;
    });

    it("Should prevent non-admin from granting roles", async function () {
      const MINTER_ROLE = await bondToken.MINTER_ROLE();
      await expect(
        bondToken.connect(nonMinter).grantRole(MINTER_ROLE, minter.address)
      ).to.be.reverted;
    });

    it("Should allow admin to revoke MINTER_ROLE", async function () {
      const MINTER_ROLE = await bondToken.MINTER_ROLE();
      await bondToken.grantRole(MINTER_ROLE, minter.address);
      await bondToken.revokeRole(MINTER_ROLE, minter.address);
      expect(await bondToken.hasRole(MINTER_ROLE, minter.address)).to.be.false;
    });
  });

  describe("Minting", function () {
    beforeEach(async function () {
      const MINTER_ROLE = await bondToken.MINTER_ROLE();
      await bondToken.grantRole(MINTER_ROLE, minter.address);
    });

    it("Should allow minter to mint tokens", async function () {
      const amount = ethers.parseEther("1000");
      await bondToken.connect(minter).mint(holder1.address, amount);
      expect(await bondToken.balanceOf(holder1.address)).to.equal(amount);
      expect(await bondToken.totalSupply()).to.equal(amount);
    });

    it("Should prevent non-minter from minting", async function () {
      const amount = ethers.parseEther("1000");
      await expect(
        bondToken.connect(nonMinter).mint(holder1.address, amount)
      ).to.be.reverted;
    });

    it("Should respect the max supply cap", async function () {
      const exceedAmount = MAX_SUPPLY + ethers.parseEther("1");
      await expect(
        bondToken.connect(minter).mint(holder1.address, exceedAmount)
      ).to.be.revertedWith("ERC20Capped: cap exceeded");
    });

    it("Should emit Transfer event when minting", async function () {
      const amount = ethers.parseEther("1000");
      await expect(bondToken.connect(minter).mint(holder1.address, amount))
        .to.emit(bondToken, "Transfer")
        .withArgs(ethers.ZeroAddress, holder1.address, amount);
    });

    it("Should allow multiple mints up to cap", async function () {
      const amount1 = ethers.parseEther("400000");
      const amount2 = ethers.parseEther("600000");
      
      await bondToken.connect(minter).mint(holder1.address, amount1);
      await bondToken.connect(minter).mint(holder2.address, amount2);
      
      expect(await bondToken.totalSupply()).to.equal(amount1 + amount2);
      expect(await bondToken.balanceOf(holder1.address)).to.equal(amount1);
      expect(await bondToken.balanceOf(holder2.address)).to.equal(amount2);
    });
  });

  describe("ERC20 Functionality", function () {
    const mintAmount = ethers.parseEther("10000");
    
    beforeEach(async function () {
      const MINTER_ROLE = await bondToken.MINTER_ROLE();
      await bondToken.grantRole(MINTER_ROLE, minter.address);
      await bondToken.connect(minter).mint(holder1.address, mintAmount);
    });

    it("Should transfer tokens correctly", async function () {
      const transferAmount = ethers.parseEther("1000");
      await bondToken.connect(holder1).transfer(holder2.address, transferAmount);
      
      expect(await bondToken.balanceOf(holder1.address)).to.equal(mintAmount - transferAmount);
      expect(await bondToken.balanceOf(holder2.address)).to.equal(transferAmount);
    });

    it("Should handle approvals and transferFrom", async function () {
      const approveAmount = ethers.parseEther("5000");
      const transferAmount = ethers.parseEther("3000");
      
      await bondToken.connect(holder1).approve(holder2.address, approveAmount);
      expect(await bondToken.allowance(holder1.address, holder2.address)).to.equal(approveAmount);
      
      await bondToken.connect(holder2).transferFrom(holder1.address, holder2.address, transferAmount);
      
      expect(await bondToken.balanceOf(holder1.address)).to.equal(mintAmount - transferAmount);
      expect(await bondToken.balanceOf(holder2.address)).to.equal(transferAmount);
      expect(await bondToken.allowance(holder1.address, holder2.address)).to.equal(approveAmount - transferAmount);
    });

    it("Should prevent transfers exceeding balance", async function () {
      const excessAmount = mintAmount + ethers.parseEther("1");
      await expect(
        bondToken.connect(holder1).transfer(holder2.address, excessAmount)
      ).to.be.reverted;
    });

    it("Should prevent transferFrom exceeding allowance", async function () {
      const approveAmount = ethers.parseEther("1000");
      const excessTransfer = ethers.parseEther("2000");
      
      await bondToken.connect(holder1).approve(holder2.address, approveAmount);
      await expect(
        bondToken.connect(holder2).transferFrom(holder1.address, holder2.address, excessTransfer)
      ).to.be.reverted;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero amount mints", async function () {
      const MINTER_ROLE = await bondToken.MINTER_ROLE();
      await bondToken.grantRole(MINTER_ROLE, minter.address);
      
      await bondToken.connect(minter).mint(holder1.address, 0);
      expect(await bondToken.balanceOf(holder1.address)).to.equal(0);
    });

    it("Should handle zero amount transfers", async function () {
      const MINTER_ROLE = await bondToken.MINTER_ROLE();
      await bondToken.grantRole(MINTER_ROLE, minter.address);
      await bondToken.connect(minter).mint(holder1.address, ethers.parseEther("1000"));
      
      await bondToken.connect(holder1).transfer(holder2.address, 0);
      expect(await bondToken.balanceOf(holder1.address)).to.equal(ethers.parseEther("1000"));
      expect(await bondToken.balanceOf(holder2.address)).to.equal(0);
    });

    it("Should handle self-transfers", async function () {
      const MINTER_ROLE = await bondToken.MINTER_ROLE();
      await bondToken.grantRole(MINTER_ROLE, minter.address);
      const amount = ethers.parseEther("1000");
      await bondToken.connect(minter).mint(holder1.address, amount);
      
      await bondToken.connect(holder1).transfer(holder1.address, amount);
      expect(await bondToken.balanceOf(holder1.address)).to.equal(amount);
    });
  });
});