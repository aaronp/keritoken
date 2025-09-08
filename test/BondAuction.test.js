const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("BondAuction", function () {
  let bondToken;
  let mockUSDC;
  let bondAuction;
  let owner;
  let bidder1;
  let bidder2;
  let bidder3;
  let nonBidder;

  const BOND_SUPPLY = ethers.parseEther("100000");
  const MIN_PRICE = ethers.parseEther("85");
  const MAX_PRICE = ethers.parseEther("100");
  const COMMIT_DURATION = 3 * 24 * 60 * 60; // 3 days
  const REVEAL_DURATION = 2 * 24 * 60 * 60; // 2 days
  const CLAIM_DURATION = 7 * 24 * 60 * 60; // 7 days
  const ISSUER_PUBLIC_KEY = "0x1234567890abcdef"; // Mock public key

  beforeEach(async function () {
    [owner, bidder1, bidder2, bidder3, nonBidder] = await ethers.getSigners();

    // Deploy BondToken
    const BondToken = await ethers.getContractFactory("BondToken");
    bondToken = await BondToken.deploy(
      "Treasury Bond 2025",
      "TB25",
      ethers.parseEther("1000000"), // 1M max supply
      Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year maturity
      100, // $100 face value
      250 // 2.5% coupon
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
      BOND_SUPPLY,
      MIN_PRICE,
      MAX_PRICE,
      COMMIT_DURATION,
      REVEAL_DURATION,
      CLAIM_DURATION,
      ISSUER_PUBLIC_KEY
    );
    await bondAuction.waitForDeployment();

    // Grant minter role to auction contract
    const MINTER_ROLE = await bondToken.MINTER_ROLE();
    await bondToken.grantRole(MINTER_ROLE, await bondAuction.getAddress());

    // Mint USDC to bidders
    await mockUSDC.mint(bidder1.address, ethers.parseUnits("100000", 6)); // 100K USDC
    await mockUSDC.mint(bidder2.address, ethers.parseUnits("100000", 6));
    await mockUSDC.mint(bidder3.address, ethers.parseUnits("100000", 6));
  });

  describe("Deployment", function () {
    it("Should set the correct auction parameters", async function () {
      expect(await bondAuction.bondSupply()).to.equal(BOND_SUPPLY);
      expect(await bondAuction.minPrice()).to.equal(MIN_PRICE);
      expect(await bondAuction.maxPrice()).to.equal(MAX_PRICE);
      expect(await bondAuction.issuerPublicKey()).to.equal(ISSUER_PUBLIC_KEY);
    });

    it("Should set the correct contract references", async function () {
      expect(await bondAuction.bondToken()).to.equal(await bondToken.getAddress());
      expect(await bondAuction.paymentToken()).to.equal(await mockUSDC.getAddress());
    });

    it("Should initialize in Commit state", async function () {
      expect(await bondAuction.state()).to.equal(0); // AuctionState.Commit
    });

    it("Should set correct deadlines", async function () {
      const blockTime = await time.latest();
      expect(await bondAuction.commitDeadline()).to.be.approximately(blockTime + COMMIT_DURATION, 60);
      expect(await bondAuction.revealDeadline()).to.be.approximately(blockTime + COMMIT_DURATION + REVEAL_DURATION, 60);
      expect(await bondAuction.claimDeadline()).to.be.approximately(blockTime + COMMIT_DURATION + REVEAL_DURATION + CLAIM_DURATION, 60);
    });
  });

  describe("Bid Commitment", function () {
    const commitment = ethers.keccak256(ethers.toUtf8Bytes("test commitment"));
    const encryptedBid = ethers.toUtf8Bytes("encrypted bid data");

    it("Should allow bid commitment in commit phase", async function () {
      await expect(bondAuction.connect(bidder1).commitBid(commitment, encryptedBid))
        .to.emit(bondAuction, "BidCommitted")
        .withArgs(bidder1.address, commitment, ethers.hexlify(encryptedBid));
      
      const bid = await bondAuction.bids(bidder1.address);
      expect(bid.commitment).to.equal(commitment);
      expect(bid.encryptedBid).to.equal(ethers.hexlify(encryptedBid));
    });

    it("Should prevent duplicate commitments from same bidder", async function () {
      await bondAuction.connect(bidder1).commitBid(commitment, encryptedBid);
      
      await expect(
        bondAuction.connect(bidder1).commitBid(commitment, encryptedBid)
      ).to.be.revertedWith("Bid already committed");
    });

    it("Should prevent empty encrypted bid", async function () {
      await expect(
        bondAuction.connect(bidder1).commitBid(commitment, "0x")
      ).to.be.revertedWith("Invalid encrypted bid");
    });

    it("Should prevent commitment after deadline", async function () {
      await time.increaseTo((await bondAuction.commitDeadline()) + 1n);
      
      await expect(
        bondAuction.connect(bidder1).commitBid(commitment, encryptedBid)
      ).to.be.revertedWith("Commit phase ended");
    });

    it("Should add bidder to bidders array", async function () {
      await bondAuction.connect(bidder1).commitBid(commitment, encryptedBid);
      
      expect(await bondAuction.getBidderCount()).to.equal(1);
      expect(await bondAuction.getBidder(0)).to.equal(bidder1.address);
    });
  });

  describe("Bid Reveal", function () {
    const price = ethers.parseEther("90");
    const quantity = ethers.parseEther("1000");
    const salt = 12345;
    
    let commitment;
    let encryptedBid;

    beforeEach(async function () {
      commitment = ethers.keccak256(ethers.solidityPacked(
        ["address", "uint256", "uint256", "uint256"],
        [bidder1.address, price, quantity, salt]
      ));
      encryptedBid = ethers.toUtf8Bytes("encrypted bid data");
      
      await bondAuction.connect(bidder1).commitBid(commitment, encryptedBid);
    });

    it("Should allow reveal during reveal phase", async function () {
      await time.increaseTo(await bondAuction.commitDeadline() + 1n);
      
      await expect(bondAuction.connect(bidder1).revealBid(price, quantity, salt))
        .to.emit(bondAuction, "BidRevealed")
        .withArgs(bidder1.address, price, quantity);
      
      const bid = await bondAuction.bids(bidder1.address);
      expect(bid.price).to.equal(price);
      expect(bid.quantity).to.equal(quantity);
      expect(bid.revealed).to.be.true;
    });

    it("Should transition to Reveal state on first reveal", async function () {
      await time.increaseTo(await bondAuction.commitDeadline() + 1n);
      expect(await bondAuction.state()).to.equal(1); // AuctionState.Reveal
    });

    it("Should prevent reveal with invalid commitment", async function () {
      await time.increaseTo(await bondAuction.commitDeadline() + 1n);
      
      const wrongSalt = 54321;
      await expect(
        bondAuction.connect(bidder1).revealBid(price, quantity, wrongSalt)
      ).to.be.revertedWith("Invalid reveal");
    });

    it("Should prevent reveal with price out of range", async function () {
      await time.increaseTo(await bondAuction.commitDeadline() + 1n);
      
      const lowPrice = ethers.parseEther("80");
      const lowCommitment = ethers.keccak256(ethers.solidityPacked(
        ["address", "uint256", "uint256", "uint256"],
        [bidder2.address, lowPrice, quantity, salt]
      ));
      
      await bondAuction.connect(bidder2).commitBid(lowCommitment, encryptedBid);
      
      await expect(
        bondAuction.connect(bidder2).revealBid(lowPrice, quantity, salt)
      ).to.be.revertedWith("Price out of range");
    });

    it("Should prevent reveal with zero quantity", async function () {
      await time.increaseTo(await bondAuction.commitDeadline() + 1n);
      
      const zeroQuantity = 0;
      const zeroCommitment = ethers.keccak256(ethers.solidityPacked(
        ["address", "uint256", "uint256", "uint256"],
        [bidder2.address, price, zeroQuantity, salt]
      ));
      
      await bondAuction.connect(bidder2).commitBid(zeroCommitment, encryptedBid);
      
      await expect(
        bondAuction.connect(bidder2).revealBid(price, zeroQuantity, salt)
      ).to.be.revertedWith("Invalid quantity");
    });

    it("Should prevent reveal after deadline", async function () {
      await time.increaseTo((await bondAuction.revealDeadline()) + 1n);
      
      await expect(
        bondAuction.connect(bidder1).revealBid(price, quantity, salt)
      ).to.be.revertedWith("Reveal phase ended");
    });
  });

  describe("Auction Finalization", function () {
    beforeEach(async function () {
      // Setup multiple bidders with different prices
      const encryptedBid = ethers.toUtf8Bytes("encrypted");
      
      // Bidder1: 95 ETH for 2000 tokens
      const price1 = ethers.parseEther("95");
      const quantity1 = ethers.parseEther("2000");
      const salt1 = 1111;
      const commitment1 = ethers.keccak256(ethers.solidityPacked(
        ["address", "uint256", "uint256", "uint256"],
        [bidder1.address, price1, quantity1, salt1]
      ));
      await bondAuction.connect(bidder1).commitBid(commitment1, encryptedBid);
      
      // Bidder2: 90 ETH for 3000 tokens  
      const price2 = ethers.parseEther("90");
      const quantity2 = ethers.parseEther("3000");
      const salt2 = 2222;
      const commitment2 = ethers.keccak256(ethers.solidityPacked(
        ["address", "uint256", "uint256", "uint256"],
        [bidder2.address, price2, quantity2, salt2]
      ));
      await bondAuction.connect(bidder2).commitBid(commitment2, encryptedBid);
      
      // Bidder3: 87 ETH for 50000 tokens (more than remaining supply)
      const price3 = ethers.parseEther("87");
      const quantity3 = ethers.parseEther("50000");
      const salt3 = 3333;
      const commitment3 = ethers.keccak256(ethers.solidityPacked(
        ["address", "uint256", "uint256", "uint256"],
        [bidder3.address, price3, quantity3, salt3]
      ));
      await bondAuction.connect(bidder3).commitBid(commitment3, encryptedBid);
      
      // Move to reveal phase and reveal all bids
      await time.increaseTo(await bondAuction.commitDeadline() + 1n);
      await bondAuction.connect(bidder1).revealBid(price1, quantity1, salt1);
      await bondAuction.connect(bidder2).revealBid(price2, quantity2, salt2);
      await bondAuction.connect(bidder3).revealBid(price3, quantity3, salt3);
    });

    it("Should finalize auction and set clearing price", async function () {
      await time.increaseTo(await bondAuction.revealDeadline() + 1n);
      
      await expect(bondAuction.finalize())
        .to.emit(bondAuction, "AuctionFinalized");
      
      expect(await bondAuction.state()).to.equal(2); // AuctionState.Finalized
      expect(await bondAuction.clearingPrice()).to.equal(ethers.parseEther("87"));
    });

    it("Should allocate bonds correctly", async function () {
      await time.increaseTo(await bondAuction.revealDeadline() + 1n);
      await bondAuction.finalize();
      
      // Bidder1 (95 ETH): Full allocation of 2000
      const bid1 = await bondAuction.bids(bidder1.address);
      expect(bid1.allocation).to.equal(ethers.parseEther("2000"));
      
      // Bidder2 (90 ETH): Full allocation of 3000  
      const bid2 = await bondAuction.bids(bidder2.address);
      expect(bid2.allocation).to.equal(ethers.parseEther("3000"));
      
      // Bidder3 (87 ETH): Partial allocation (remaining supply = 95000)
      const bid3 = await bondAuction.bids(bidder3.address);
      expect(bid3.allocation).to.equal(ethers.parseEther("95000"));
      
      expect(await bondAuction.totalAllocated()).to.equal(BOND_SUPPLY);
    });

    it("Should prevent non-owner from finalizing", async function () {
      await time.increaseTo(await bondAuction.revealDeadline() + 1n);
      
      await expect(
        bondAuction.connect(bidder1).finalize()
      ).to.be.reverted;
    });

    it("Should prevent finalization before reveal deadline", async function () {
      await expect(
        bondAuction.finalize()
      ).to.be.revertedWith("Cannot finalize yet");
    });
  });

  describe("Pro-rata Allocation", function () {
    beforeEach(async function () {
      const encryptedBid = ethers.toUtf8Bytes("encrypted");
      const marginalPrice = ethers.parseEther("90");
      
      // Create multiple bids at the same marginal price
      // Bidder1: 90 ETH for 60000 tokens
      const quantity1 = ethers.parseEther("60000");
      const salt1 = 1111;
      const commitment1 = ethers.keccak256(ethers.solidityPacked(
        ["address", "uint256", "uint256", "uint256"],
        [bidder1.address, marginalPrice, quantity1, salt1]
      ));
      await bondAuction.connect(bidder1).commitBid(commitment1, encryptedBid);
      
      // Bidder2: 90 ETH for 40000 tokens
      const quantity2 = ethers.parseEther("40000");
      const salt2 = 2222;
      const commitment2 = ethers.keccak256(ethers.solidityPacked(
        ["address", "uint256", "uint256", "uint256"],
        [bidder2.address, marginalPrice, quantity2, salt2]
      ));
      await bondAuction.connect(bidder2).commitBid(commitment2, encryptedBid);
      
      // Move to reveal phase and reveal all bids
      await time.increaseTo(await bondAuction.commitDeadline() + 1n);
      await bondAuction.connect(bidder1).revealBid(marginalPrice, quantity1, salt1);
      await bondAuction.connect(bidder2).revealBid(marginalPrice, quantity2, salt2);
    });

    it("Should allocate pro-rata when demand exceeds supply", async function () {
      await time.increaseTo(await bondAuction.revealDeadline() + 1n);
      await bondAuction.finalize();
      
      // Total demand: 100000, Total supply: 100000
      // Pro-rata should be: bidder1 gets 60%, bidder2 gets 40%
      const bid1 = await bondAuction.bids(bidder1.address);
      const bid2 = await bondAuction.bids(bidder2.address);
      
      expect(bid1.allocation).to.equal(ethers.parseEther("60000")); // 60000/100000 * 100000
      expect(bid2.allocation).to.equal(ethers.parseEther("40000")); // 40000/100000 * 100000
    });
  });

  describe("Token Claiming", function () {
    beforeEach(async function () {
      // Setup and finalize auction
      const encryptedBid = ethers.toUtf8Bytes("encrypted");
      const price = ethers.parseEther("90");
      const quantity = ethers.parseEther("1000");
      const salt = 1111;
      const commitment = ethers.keccak256(ethers.solidityPacked(
        ["address", "uint256", "uint256", "uint256"],
        [bidder1.address, price, quantity, salt]
      ));
      
      await bondAuction.connect(bidder1).commitBid(commitment, encryptedBid);
      await time.increaseTo(await bondAuction.commitDeadline() + 1n);
      await bondAuction.connect(bidder1).revealBid(price, quantity, salt);
      await time.increaseTo(await bondAuction.revealDeadline() + 1n);
      await bondAuction.finalize();
    });

    it("Should allow winners to claim tokens", async function () {
      const bid = await bondAuction.bids(bidder1.address);
      const payment = (bid.allocation * await bondAuction.clearingPrice()) / ethers.parseEther("1");
      
      // Approve USDC spending
      await mockUSDC.connect(bidder1).approve(await bondAuction.getAddress(), payment);
      
      await expect(bondAuction.connect(bidder1).claimTokens())
        .to.emit(bondAuction, "TokensClaimed")
        .withArgs(bidder1.address, bid.allocation, payment);
      
      expect(await bondToken.balanceOf(bidder1.address)).to.equal(bid.allocation);
    });

    it("Should prevent claiming without sufficient USDC approval", async function () {
      await expect(
        bondAuction.connect(bidder1).claimTokens()
      ).to.be.reverted;
    });

    it("Should prevent double claiming", async function () {
      const bid = await bondAuction.bids(bidder1.address);
      const payment = (bid.allocation * await bondAuction.clearingPrice()) / ethers.parseEther("1");
      
      await mockUSDC.connect(bidder1).approve(await bondAuction.getAddress(), payment);
      await bondAuction.connect(bidder1).claimTokens();
      
      await expect(
        bondAuction.connect(bidder1).claimTokens()
      ).to.be.revertedWith("Already claimed");
    });

    it("Should prevent claiming after deadline", async function () {
      await time.increaseTo((await bondAuction.claimDeadline()) + 1n);
      
      await expect(
        bondAuction.connect(bidder1).claimTokens()
      ).to.be.revertedWith("Claim period ended");
    });

    it("Should prevent non-winners from claiming", async function () {
      await expect(
        bondAuction.connect(nonBidder).claimTokens()
      ).to.be.revertedWith("No allocation");
    });
  });

  describe("Proceeds Withdrawal", function () {
    beforeEach(async function () {
      // Setup, finalize auction, and claim tokens
      const encryptedBid = ethers.toUtf8Bytes("encrypted");
      const price = ethers.parseEther("90");
      const quantity = ethers.parseEther("1000");
      const salt = 1111;
      const commitment = ethers.keccak256(ethers.solidityPacked(
        ["address", "uint256", "uint256", "uint256"],
        [bidder1.address, price, quantity, salt]
      ));
      
      await bondAuction.connect(bidder1).commitBid(commitment, encryptedBid);
      await time.increaseTo(await bondAuction.commitDeadline() + 1n);
      await bondAuction.connect(bidder1).revealBid(price, quantity, salt);
      await time.increaseTo(await bondAuction.revealDeadline() + 1n);
      await bondAuction.finalize();
      
      const bid = await bondAuction.bids(bidder1.address);
      const payment = (bid.allocation * await bondAuction.clearingPrice()) / ethers.parseEther("1");
      await mockUSDC.connect(bidder1).approve(await bondAuction.getAddress(), payment);
      await bondAuction.connect(bidder1).claimTokens();
    });

    it("Should allow owner to withdraw proceeds", async function () {
      const initialBalance = await mockUSDC.balanceOf(owner.address);
      const contractBalance = await mockUSDC.balanceOf(await bondAuction.getAddress());
      
      await bondAuction.withdrawProceeds();
      
      expect(await mockUSDC.balanceOf(owner.address)).to.equal(initialBalance + contractBalance);
      expect(await mockUSDC.balanceOf(await bondAuction.getAddress())).to.equal(0);
    });

    it("Should prevent non-owner from withdrawing", async function () {
      await expect(
        bondAuction.connect(bidder1).withdrawProceeds()
      ).to.be.reverted;
    });
  });

  describe("Encrypted Bid Retrieval", function () {
    it("Should return encrypted bid data", async function () {
      const encryptedBid = ethers.toUtf8Bytes("test encrypted data");
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("test"));
      
      await bondAuction.connect(bidder1).commitBid(commitment, encryptedBid);
      
      const retrievedBid = await bondAuction.getEncryptedBid(bidder1.address);
      expect(retrievedBid).to.equal(ethers.hexlify(encryptedBid));
    });

    it("Should return empty for non-existent bids", async function () {
      const retrievedBid = await bondAuction.getEncryptedBid(nonBidder.address);
      expect(retrievedBid).to.equal("0x");
    });
  });
});