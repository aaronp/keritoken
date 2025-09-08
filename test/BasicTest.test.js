const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Basic Contract Tests", function () {
  let bondToken;
  let mockUSDC;
  let bondAuction;
  let owner;
  let user1;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    // Deploy BondToken
    const BondToken = await ethers.getContractFactory("BondToken");
    bondToken = await BondToken.deploy(
      "Test Bond",
      "TBOND",
      ethers.parseEther("1000000"),
      Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
      100,
      250
    );
    await bondToken.waitForDeployment();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();

    // Deploy BondAuction
    const BondAuction = await ethers.getContractFactory("BondAuction");
    bondAuction = await BondAuction.deploy(
      await bondToken.getAddress(),
      await mockUSDC.getAddress(),
      ethers.parseEther("100000"),
      ethers.parseEther("85"),
      ethers.parseEther("100"),
      3 * 24 * 60 * 60,
      2 * 24 * 60 * 60,
      7 * 24 * 60 * 60,
      "0x1234567890abcdef"
    );
    await bondAuction.waitForDeployment();
  });

  it("Should deploy all contracts successfully", async function () {
    expect(await bondToken.name()).to.equal("Test Bond");
    expect(await mockUSDC.name()).to.equal("Mock USDC");
    expect(await bondAuction.bondSupply()).to.equal(ethers.parseEther("100000"));
  });

  it("Should grant minter role to auction contract", async function () {
    const MINTER_ROLE = await bondToken.MINTER_ROLE();
    await bondToken.grantRole(MINTER_ROLE, await bondAuction.getAddress());
    expect(await bondToken.hasRole(MINTER_ROLE, await bondAuction.getAddress())).to.be.true;
  });

  it("Should allow minter to mint tokens", async function () {
    const MINTER_ROLE = await bondToken.MINTER_ROLE();
    await bondToken.grantRole(MINTER_ROLE, owner.address);
    
    await bondToken.mint(user1.address, ethers.parseEther("1000"));
    expect(await bondToken.balanceOf(user1.address)).to.equal(ethers.parseEther("1000"));
  });

  it("Should allow USDC minting for testing", async function () {
    await mockUSDC.mint(user1.address, ethers.parseUnits("10000", 6));
    expect(await mockUSDC.balanceOf(user1.address)).to.equal(ethers.parseUnits("10000", 6));
  });
});