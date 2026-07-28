const { expect } = require("chai");
const { ethers } = require("hardhat");
const { computeDigest } = require("../ui/src/lib/compliance-digest");

// Import the same logic we'll put in the UI utility.
// We re-implement here to verify against the contract's behavior.
describe("Compliance Digest", function () {
  let registry;
  let bridgeWallet, other;
  const policySAID = ethers.id("test-policy-said");

  beforeEach(async function () {
    const [owner, bw, o] = await ethers.getSigners();
    bridgeWallet = bw;
    other = o;
    const Factory = await ethers.getContractFactory("ComplianceRegistry");
    registry = await Factory.deploy(bridgeWallet.address, policySAID);
    await registry.waitForDeployment();
  });

  it("Should produce a digest that the contract accepts when signed", async function () {
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const chainId = 31337n;
    const decisionId = ethers.id("digest-test-001");
    const registryAddress = registry.target;

    // Compute digest using the shared UI utility
    const { digest } = computeDigest({
      policySAID,
      wallet: other.address,
      expiry,
      decisionId,
      chainId,
      registry: registryAddress,
    });

    // Sign using EIP-191 personal sign (ethers.signMessage does the prefixing)
    const sig = await bridgeWallet.signMessage(ethers.getBytes(digest));
    const { v, r, s } = ethers.Signature.from(sig);

    // Submit to contract — if digest computation is wrong, this reverts
    await expect(
      registry.verify(policySAID, other.address, expiry, decisionId, chainId, registryAddress, v, r, s)
    ).to.emit(registry, "WalletVerified");
  });

  it("Should split a signature into v, r, s correctly", function () {
    // A known 65-byte signature with canonical s (first byte < 0x80 required by ethers v6)
    const fakeSig = "0x" + "ab".repeat(32) + "1c".repeat(32) + "1b";
    const { v, r, s } = ethers.Signature.from(fakeSig);
    expect(v).to.equal(27);
    expect(r).to.equal("0x" + "ab".repeat(32));
    expect(s).to.equal("0x" + "1c".repeat(32));
  });

  it("Should normalize v=0 to v=27", function () {
    // Signature with v=0 (raw recovery id); canonical s required by ethers v6
    const rawSig = "0x" + "ab".repeat(32) + "1c".repeat(32) + "00";
    const { v } = ethers.Signature.from(rawSig);
    expect(v).to.equal(27);
  });
});
