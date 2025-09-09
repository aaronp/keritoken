const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const crypto = require('crypto');

describe("BondAuction - Full UI Workflow", function () {
  let bondToken;
  let mockUSDC;
  let bondAuction;
  let owner;
  let bidder1;
  let bidder2;
  let issuerKeyPair;

  const BOND_SUPPLY = ethers.parseEther("100000");
  const MIN_PRICE = ethers.parseUnits("85", 6); // 85 USDC (6 decimals)
  const MAX_PRICE = ethers.parseUnits("100", 6); // 100 USDC (6 decimals)
  const COMMIT_DURATION = 3 * 24 * 60 * 60; // 3 days
  const REVEAL_DURATION = 2 * 24 * 60 * 60; // 2 days
  const CLAIM_DURATION = 7 * 24 * 60 * 60; // 7 days

  // Generate RSA key pair for testing (similar to UI workflow)
  function generateKeyPair() {
    return crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'der'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'der'
      }
    });
  }

  // Encrypt bid data using RSA-OAEP (matching UI workflow)
  function encryptBid(publicKeyDER, bidData) {
    const publicKey = crypto.createPublicKey({
      key: publicKeyDER,
      format: 'der',
      type: 'spki'
    });
    
    return crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(JSON.stringify(bidData))
    );
  }

  // Decrypt bid data using RSA-OAEP (for verification)
  function decryptBid(privateKeyDER, encryptedData) {
    const privateKey = crypto.createPrivateKey({
      key: privateKeyDER,
      format: 'der',
      type: 'pkcs8'
    });
    
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      encryptedData
    );
    
    return JSON.parse(decrypted.toString());
  }

  // Generate commitment hash (matching contract implementation)
  function generateCommitmentHash(price, quantity, salt, bidderAddress) {
    const priceUnits = ethers.parseUnits(price.toString(), 6); // Price in USDC units (6 decimals)
    const quantityWei = ethers.parseEther(quantity.toString()); // Quantity in bond units (18 decimals)
    
    return ethers.keccak256(
      ethers.solidityPacked(
        ["address", "uint256", "uint256", "uint256"],
        [bidderAddress, priceUnits, quantityWei, salt]
      )
    );
  }

  beforeEach(async function () {
    [owner, bidder1, bidder2] = await ethers.getSigners();

    // Generate RSA key pair for issuer (matching UI workflow)
    issuerKeyPair = generateKeyPair();
    const publicKeyHex = '0x' + issuerKeyPair.publicKey.toString('hex');

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

    // Deploy BondAuction with real RSA public key
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
      publicKeyHex // Real RSA public key
    );
    await bondAuction.waitForDeployment();

    // Grant minter role to auction contract
    const MINTER_ROLE = await bondToken.MINTER_ROLE();
    await bondToken.grantRole(MINTER_ROLE, await bondAuction.getAddress());

    // Mint USDC to bidders - need lots due to decimal conversion
    // Bid amounts: 1000 bonds * $95 = $95,000 + 2000 bonds * $90 = $180,000  
    // Clearing price will be $90, so payments: 1000*90 = $90K, 2000*90 = $180K
    await mockUSDC.mint(bidder1.address, ethers.parseUnits("500000", 6)); // 500K USDC
    await mockUSDC.mint(bidder2.address, ethers.parseUnits("500000", 6));
  });

  describe("Complete Workflow: Create Bond → Create Auction → Submit Encrypted Bids", function () {
    it("Should complete the full workflow from bond creation to successful bidding", async function () {
      // Step 1: Verify bond token was created correctly
      expect(await bondToken.name()).to.equal("Treasury Bond 2025");
      expect(await bondToken.symbol()).to.equal("TB25");
      expect(await bondToken.cap()).to.equal(ethers.parseEther("1000000"));
      
      // Step 2: Verify auction was created correctly
      expect(await bondAuction.bondToken()).to.equal(await bondToken.getAddress());
      expect(await bondAuction.paymentToken()).to.equal(await mockUSDC.getAddress());
      expect(await bondAuction.bondSupply()).to.equal(BOND_SUPPLY);
      expect(await bondAuction.minPrice()).to.equal(MIN_PRICE);
      expect(await bondAuction.maxPrice()).to.equal(MAX_PRICE);
      expect(await bondAuction.state()).to.equal(1); // Commit phase
      
      // Verify the public key was stored correctly
      const storedPublicKey = await bondAuction.issuerPublicKey();
      const expectedPublicKey = '0x' + issuerKeyPair.publicKey.toString('hex');
      expect(storedPublicKey).to.equal(expectedPublicKey);

      // Step 3: Submit encrypted bids (matching UI workflow)
      const bidData1 = {
        price: "95",
        quantity: "1000",
        salt: 12345,
        timestamp: Date.now(),
        bidder: bidder1.address
      };

      const bidData2 = {
        price: "90", 
        quantity: "2000",
        salt: 67890,
        timestamp: Date.now(),
        bidder: bidder2.address
      };

      // Encrypt bid data using issuer's public key (matching UI)
      const encryptedBid1 = encryptBid(issuerKeyPair.publicKey, bidData1);
      const encryptedBid2 = encryptBid(issuerKeyPair.publicKey, bidData2);

      // Generate commitment hashes (matching UI)
      const commitment1 = generateCommitmentHash(
        bidData1.price,
        bidData1.quantity, 
        bidData1.salt,
        bidder1.address
      );
      const commitment2 = generateCommitmentHash(
        bidData2.price,
        bidData2.quantity,
        bidData2.salt, 
        bidder2.address
      );

      // Submit encrypted bids
      await expect(bondAuction.connect(bidder1).commitBid(commitment1, encryptedBid1))
        .to.emit(bondAuction, "BidCommitted")
        .withArgs(bidder1.address, commitment1, ethers.hexlify(encryptedBid1));

      await expect(bondAuction.connect(bidder2).commitBid(commitment2, encryptedBid2))
        .to.emit(bondAuction, "BidCommitted")
        .withArgs(bidder2.address, commitment2, ethers.hexlify(encryptedBid2));

      // Verify bids were stored with encrypted data
      const bid1 = await bondAuction.bids(bidder1.address);
      const bid2 = await bondAuction.bids(bidder2.address);
      
      expect(bid1.commitment).to.equal(commitment1);
      expect(bid1.encryptedBid).to.equal(ethers.hexlify(encryptedBid1));
      expect(bid2.commitment).to.equal(commitment2);
      expect(bid2.encryptedBid).to.equal(ethers.hexlify(encryptedBid2));

      // Step 4: Issuer can decrypt the bid data for analysis
      const storedEncryptedBid1 = await bondAuction.getEncryptedBid(bidder1.address);
      const storedEncryptedBid2 = await bondAuction.getEncryptedBid(bidder2.address);
      
      // Remove 0x prefix and convert back to buffer for decryption
      const encryptedBuffer1 = Buffer.from(storedEncryptedBid1.slice(2), 'hex');
      const encryptedBuffer2 = Buffer.from(storedEncryptedBid2.slice(2), 'hex');
      
      const decryptedBid1 = decryptBid(issuerKeyPair.privateKey, encryptedBuffer1);
      const decryptedBid2 = decryptBid(issuerKeyPair.privateKey, encryptedBuffer2);

      expect(decryptedBid1.price).to.equal(bidData1.price);
      expect(decryptedBid1.quantity).to.equal(bidData1.quantity);
      expect(decryptedBid1.salt).to.equal(bidData1.salt);
      expect(decryptedBid1.bidder).to.equal(bidder1.address);

      expect(decryptedBid2.price).to.equal(bidData2.price);
      expect(decryptedBid2.quantity).to.equal(bidData2.quantity);
      expect(decryptedBid2.salt).to.equal(bidData2.salt);
      expect(decryptedBid2.bidder).to.equal(bidder2.address);

      // Step 5: Move to reveal phase and reveal bids
      await time.increaseTo(await bondAuction.commitDeadline() + 1n);
      
      await expect(bondAuction.connect(bidder1).revealBid(
        ethers.parseUnits(bidData1.price, 6), // Price in USDC units
        ethers.parseEther(bidData1.quantity), // Quantity in bond units (18 decimals)
        bidData1.salt
      )).to.emit(bondAuction, "BidRevealed");

      await expect(bondAuction.connect(bidder2).revealBid(
        ethers.parseUnits(bidData2.price, 6), // Price in USDC units  
        ethers.parseEther(bidData2.quantity), // Quantity in bond units (18 decimals)
        bidData2.salt
      )).to.emit(bondAuction, "BidRevealed");

      // Step 6: Finalize auction
      await time.increaseTo(await bondAuction.revealDeadline() + 1n);
      
      await expect(bondAuction.finalize())
        .to.emit(bondAuction, "AuctionFinalized");

      expect(await bondAuction.state()).to.equal(3); // Finalized  
      expect(await bondAuction.clearingPrice()).to.equal(ethers.parseUnits("90", 6)); // 90 USDC

      // Step 7: Winners claim their tokens
      const finalBid1 = await bondAuction.bids(bidder1.address);
      const finalBid2 = await bondAuction.bids(bidder2.address);
      
      expect(finalBid1.allocation).to.equal(ethers.parseEther("1000"));
      expect(finalBid2.allocation).to.equal(ethers.parseEther("2000"));

      // Calculate payments at clearing price - matching contract calculation
      // Contract: payment = (allocation * clearingPrice) / 1e18
      // allocation is in 18 decimals, clearingPrice is in 6 decimals  
      // Result should be in 6 decimals (USDC units)
      const clearingPrice = await bondAuction.clearingPrice();
      const payment1 = (finalBid1.allocation * clearingPrice) / BigInt("1000000000000000000");
      const payment2 = (finalBid2.allocation * clearingPrice) / BigInt("1000000000000000000");

      // Verify payment calculations are reasonable
      expect(ethers.formatUnits(payment1, 6)).to.equal("90000.0"); // 1000 bonds * $90 = $90,000
      expect(ethers.formatUnits(payment2, 6)).to.equal("180000.0"); // 2000 bonds * $90 = $180,000

      // Approve and claim tokens
      await mockUSDC.connect(bidder1).approve(await bondAuction.getAddress(), payment1);
      await mockUSDC.connect(bidder2).approve(await bondAuction.getAddress(), payment2);

      await expect(bondAuction.connect(bidder1).claimTokens())
        .to.emit(bondAuction, "TokensClaimed")
        .withArgs(bidder1.address, finalBid1.allocation, payment1);

      await expect(bondAuction.connect(bidder2).claimTokens())
        .to.emit(bondAuction, "TokensClaimed")
        .withArgs(bidder2.address, finalBid2.allocation, payment2);

      // Verify token balances
      expect(await bondToken.balanceOf(bidder1.address)).to.equal(ethers.parseEther("1000"));
      expect(await bondToken.balanceOf(bidder2.address)).to.equal(ethers.parseEther("2000"));

      console.log("✅ Full workflow completed successfully:");
      console.log("  - Bond token created with proper parameters");
      console.log("  - Auction deployed with real RSA public key");
      console.log("  - Bids submitted with real RSA-OAEP encryption");
      console.log("  - Issuer can decrypt bid data for analysis");
      console.log("  - Bids revealed and auction finalized");
      console.log("  - Winners successfully claimed tokens");
    });

    it("Should prevent bidding with invalid encrypted data", async function () {
      const invalidCommitment = ethers.keccak256(ethers.toUtf8Bytes("invalid"));
      const emptyEncryptedBid = new Uint8Array(0);

      await expect(
        bondAuction.connect(bidder1).commitBid(invalidCommitment, emptyEncryptedBid)
      ).to.be.revertedWith("Invalid encrypted bid");
    });

    it("Should handle commitment hash validation correctly", async function () {
      const bidData = {
        price: "95",
        quantity: "1000", 
        salt: 11111,
        timestamp: Date.now(),
        bidder: bidder1.address
      };

      const encryptedBid = encryptBid(issuerKeyPair.publicKey, bidData);
      const correctCommitment = generateCommitmentHash(
        bidData.price,
        bidData.quantity,
        bidData.salt,
        bidder1.address
      );

      // Commit with correct hash
      await bondAuction.connect(bidder1).commitBid(correctCommitment, encryptedBid);

      // Move to reveal phase
      await time.increaseTo(await bondAuction.commitDeadline() + 1n);

      // Try to reveal with wrong salt (should fail)
      await expect(
        bondAuction.connect(bidder1).revealBid(
          ethers.parseUnits(bidData.price, 6),
          ethers.parseEther(bidData.quantity),
          99999
        )
      ).to.be.revertedWith("Invalid reveal");

      // Reveal with correct data (should succeed)
      await expect(
        bondAuction.connect(bidder1).revealBid(
          ethers.parseUnits(bidData.price, 6),
          ethers.parseEther(bidData.quantity),
          bidData.salt
        )
      ).to.emit(bondAuction, "BidRevealed");
    });
  });

  describe("State Validation (Matching UI Workflow)", function () {
    it("Should validate auction state transitions correctly", async function () {
      // Initially in Commit state
      expect(await bondAuction.state()).to.equal(1);

      // Submit a bid 
      const bidData = {
        price: "95",
        quantity: "1000",
        salt: 11111,
        bidder: bidder1.address
      };

      const encryptedBid = encryptBid(issuerKeyPair.publicKey, bidData);
      const commitment = generateCommitmentHash(
        bidData.price,
        bidData.quantity,
        bidData.salt,
        bidder1.address
      );

      await bondAuction.connect(bidder1).commitBid(commitment, encryptedBid);

      // Move past commit deadline -> still in Commit state until first reveal
      await time.increaseTo(await bondAuction.commitDeadline() + 1n);
      expect(await bondAuction.state()).to.equal(1);

      // Reveal the bid - this should transition to Reveal state
      await bondAuction.connect(bidder1).revealBid(
        ethers.parseUnits(bidData.price, 6),
        ethers.parseEther(bidData.quantity),
        bidData.salt
      );
      
      // After first reveal, should be in Reveal state
      expect(await bondAuction.state()).to.equal(2);

      // Move past reveal deadline and finalize -> should be in Finalized state
      await time.increaseTo(await bondAuction.revealDeadline() + 1n);
      await bondAuction.finalize();
      expect(await bondAuction.state()).to.equal(3);
    });

    it("Should prevent bid commitment after deadline (UI validation)", async function () {
      // Move past commit deadline
      await time.increaseTo(await bondAuction.commitDeadline() + 1n);

      const bidData = { price: "95", quantity: "1000", salt: 99999, bidder: bidder1.address };
      const encryptedBid = encryptBid(issuerKeyPair.publicKey, bidData);
      const commitment = generateCommitmentHash(bidData.price, bidData.quantity, bidData.salt, bidder1.address);

      await expect(
        bondAuction.connect(bidder1).commitBid(commitment, encryptedBid)
      ).to.be.revertedWith("Commit phase ended");
    });

    it("Should prevent duplicate bids from same address (UI validation)", async function () {
      const bidData = { price: "95", quantity: "1000", salt: 55555, bidder: bidder1.address };
      const encryptedBid = encryptBid(issuerKeyPair.publicKey, bidData);
      const commitment = generateCommitmentHash(bidData.price, bidData.quantity, bidData.salt, bidder1.address);

      // First bid should succeed
      await bondAuction.connect(bidder1).commitBid(commitment, encryptedBid);

      // Second bid from same address should fail
      await expect(
        bondAuction.connect(bidder1).commitBid(commitment, encryptedBid)
      ).to.be.revertedWith("Bid already committed");
    });
  });
});