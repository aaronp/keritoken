const { expect } = require("chai");
const { setupScenario, whitelistAddress, mintTokens, transferTokens, isWhitelisted, getBalance } = require("../helpers/dsl");
const { getCurrentWhitelist, getTokenHolders, getAuditTrail } = require("../helpers/events");
const { GovernanceContract, TokenContract } = require("../helpers/contracts");
const ERRORS = require("../helpers/errors");

describe("Integration: Allowlist Flow Tests", function () {
  let governance, token, owner, user1, user2, user3;
  let gov, tok; // Wrapper instances

  beforeEach(async function () {
    // Setup complete scenario
    const scenario = await setupScenario();
    ({ governance, token, owner, user1, user2, user3 } = scenario);

    // Create wrapper instances
    gov = new GovernanceContract(governance);
    tok = new TokenContract(token);
  });

  describe("✅ Happy Path: All Users Whitelisted", function () {
    it("Should allow complete flow when all parties are whitelisted", async function () {
      // Whitelist all users
      await gov.whitelist(user1.address, "KYC-001");
      await gov.whitelist(user2.address, "KYC-002");
      await gov.whitelist(user3.address, "KYC-003");

      // Mint tokens to user1
      await tok.mint(user1.address, "1000");

      // Transfer from user1 to user2
      await tok.transfer(user1, user2.address, "300");

      // Transfer from user2 to user3
      await tok.transfer(user2, user3.address, "100");

      // Verify balances
      expect(await tok.balanceOf(user1.address)).to.equal("700.0");
      expect(await tok.balanceOf(user2.address)).to.equal("200.0");
      expect(await tok.balanceOf(user3.address)).to.equal("100.0");

      // Verify total supply
      expect(await tok.totalSupply()).to.equal("1000.0");
    });

    it("Should track all holders correctly from events", async function () {
      await whitelistAddress(governance, user1.address, "USER-1");
      await whitelistAddress(governance, user2.address, "USER-2");

      await mintTokens(token, user1.address, "500");
      await mintTokens(token, user2.address, "300");

      const holders = await tok.getHolders();

      expect(holders).to.have.lengthOf(2);
      expect(holders.map(h => h.address)).to.include(user1.address, user2.address);
    });
  });

  describe("❌ Failure: Non-Whitelisted Recipients", function () {
    it("Should fail to mint to non-whitelisted address", async function () {
      // user1 is NOT whitelisted
      await expect(
        tok.mint(user1.address, "100")
      ).to.be.revertedWith(ERRORS.RECIPIENT_NOT_WHITELISTED);
    });

    it("Should fail to transfer to non-whitelisted recipient", async function () {
      // Whitelist user1 and mint
      await gov.whitelist(user1.address, "KYC-001");
      await tok.mint(user1.address, "500");

      // Try to transfer to non-whitelisted user2
      await expect(
        tok.transfer(user1, user2.address, "100")
      ).to.be.revertedWith(ERRORS.RECIPIENT_NOT_WHITELISTED);
    });
  });

  describe("❌ Failure: Non-Whitelisted Senders", function () {
    it("Should fail when sender is removed from whitelist", async function () {
      // Whitelist both users and mint
      await gov.whitelist(user1.address, "KYC-001");
      await gov.whitelist(user2.address, "KYC-002");
      await tok.mint(user1.address, "500");

      // Transfer works
      await tok.transfer(user1, user2.address, "100");
      expect(await tok.balanceOf(user2.address)).to.equal("100.0");

      // Remove user1 from whitelist
      await gov.remove(user1.address, "Suspended");

      // Transfer should now fail
      await expect(
        tok.transfer(user1, user2.address, "100")
      ).to.be.revertedWith(ERRORS.SENDER_NOT_WHITELISTED);
    });
  });

  describe("✅ Dynamic Whitelist Changes", function () {
    it("Should handle add -> transfer -> remove -> fail -> re-add -> success", async function () {
      // Add user1 and user2
      await gov.whitelist(user1.address, "Initial-KYC");
      await gov.whitelist(user2.address, "Initial-KYC");
      await tok.mint(user1.address, "1000");

      // Transfer works
      await tok.transfer(user1, user2.address, "200");
      expect(await tok.balanceOf(user2.address)).to.equal("200.0");

      // Remove user2
      await gov.remove(user2.address, "Verification failed");
      expect(await gov.isWhitelisted(user2.address)).to.be.false;

      // Transfer to user2 should fail
      await expect(
        tok.transfer(user1, user2.address, "100")
      ).to.be.revertedWith(ERRORS.RECIPIENT_NOT_WHITELISTED);

      // Re-add user2
      await gov.whitelist(user2.address, "Re-verified");
      expect(await gov.isWhitelisted(user2.address)).to.be.true;

      // Transfer should work again
      await tok.transfer(user1, user2.address, "100");
      expect(await tok.balanceOf(user2.address)).to.equal("300.0");
    });
  });

  describe("📊 Event Verification and Auditing", function () {
    it("Should emit AddressAdded events with correct referenceId", async function () {
      await gov.whitelist(user1.address, "KYC-12345");

      const events = await gov.getAddedEvents();
      expect(events).to.have.lengthOf(1);
      expect(events[0].walletAddress).to.equal(user1.address);
      expect(events[0].referenceId).to.equal("KYC-12345");
    });

    it("Should track complete audit trail", async function () {
      // Add user1
      await gov.whitelist(user1.address, "Initial-KYC");

      // Remove user1
      await gov.remove(user1.address, "Suspended");

      // Re-add user1
      await gov.whitelist(user1.address, "Re-verified-KYC");

      // Get audit trail
      const audit = await gov.getAuditTrail(user1.address);

      expect(audit.events).to.have.lengthOf(3);
      expect(audit.events[0].type).to.equal("ADDED");
      expect(audit.events[0].referenceId).to.equal("Initial-KYC");
      expect(audit.events[1].type).to.equal("REMOVED");
      expect(audit.events[1].referenceId).to.equal("Suspended");
      expect(audit.events[2].type).to.equal("ADDED");
      expect(audit.events[2].referenceId).to.equal("Re-verified-KYC");

      expect(audit.isCurrentlyWhitelisted).to.be.true;
      expect(audit.addCount).to.equal(2);
      expect(audit.removeCount).to.equal(1);
    });

    it("Should build correct current whitelist from events", async function () {
      // Add three users
      await gov.whitelist(user1.address, "USER-001");
      await gov.whitelist(user2.address, "USER-002");
      await gov.whitelist(user3.address, "USER-003");

      // Remove user2
      await gov.remove(user2.address, "Removed");

      // Get current whitelist
      const whitelist = await gov.getWhitelist();

      expect(whitelist).to.have.lengthOf(2);
      const addresses = whitelist.map(w => w.address);
      expect(addresses).to.include(user1.address);
      expect(addresses).to.include(user3.address);
      expect(addresses).to.not.include(user2.address);

      // Verify referenceIds are preserved
      const user1Entry = whitelist.find(w => w.address === user1.address);
      expect(user1Entry.referenceId).to.equal("USER-001");
    });

    it("Should map wallet addresses to reference strings", async function () {
      // Whitelist users with meaningful references
      await gov.whitelist(user1.address, "alice@example.com");
      await gov.whitelist(user2.address, "bob@example.com");
      await gov.whitelist(user3.address, "charlie@example.com");

      const whitelist = await getCurrentWhitelist(governance);

      // Create a map of address -> reference
      const refMap = {};
      whitelist.forEach(entry => {
        refMap[entry.address] = entry.referenceId;
      });

      expect(refMap[user1.address]).to.equal("alice@example.com");
      expect(refMap[user2.address]).to.equal("bob@example.com");
      expect(refMap[user3.address]).to.equal("charlie@example.com");
    });

    it("Should verify Transfer events are emitted correctly", async function () {
      await gov.whitelist(user1.address, "KYC-1");
      await gov.whitelist(user2.address, "KYC-2");

      await tok.mint(user1.address, "1000");
      await tok.transfer(user1, user2.address, "250");

      const transfers = await tok.getTransfers();

      expect(transfers).to.have.lengthOf(2); // Mint + Transfer

      // Mint event (from zero address)
      expect(transfers[0].from).to.equal("0x0000000000000000000000000000000000000000");
      expect(transfers[0].to).to.equal(user1.address);
      expect(transfers[0].valueFormatted).to.equal("1000.0");

      // Transfer event
      expect(transfers[1].from).to.equal(user1.address);
      expect(transfers[1].to).to.equal(user2.address);
      expect(transfers[1].valueFormatted).to.equal("250.0");
    });
  });

  describe("🔒 Edge Cases", function () {
    it("Should prevent double-whitelisting", async function () {
      await gov.whitelist(user1.address, "KYC-001");

      await expect(
        gov.whitelist(user1.address, "KYC-002")
      ).to.be.revertedWith(ERRORS.ALREADY_WHITELISTED);
    });

    it("Should prevent removing non-whitelisted address", async function () {
      await expect(
        gov.remove(user1.address, "Not even whitelisted")
      ).to.be.revertedWith(ERRORS.NOT_WHITELISTED);
    });

    it("Should handle zero-value transfers", async function () {
      await gov.whitelist(user1.address, "KYC-1");
      await gov.whitelist(user2.address, "KYC-2");
      await tok.mint(user1.address, "100");

      // Zero transfer should succeed
      await tok.transfer(user1, user2.address, "0");

      expect(await tok.balanceOf(user1.address)).to.equal("100.0");
      expect(await tok.balanceOf(user2.address)).to.equal("0.0");
    });

    it("Should prevent transfers exceeding balance", async function () {
      await gov.whitelist(user1.address, "KYC-1");
      await gov.whitelist(user2.address, "KYC-2");
      await tok.mint(user1.address, "100");

      await expect(
        tok.transfer(user1, user2.address, "101")
      ).to.be.reverted; // ERC20 insufficient balance error
    });
  });
});
