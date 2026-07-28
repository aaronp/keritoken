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

  async function signVerification(signer, params) {
    const { policySAID: p, wallet, expiry, decisionId, chainId, registry } = params;
    const digest = ethers.keccak256(
      ethers.solidityPacked(
        ["bytes32", "address", "uint64", "bytes32", "uint256", "address"],
        [p, wallet, expiry, decisionId, chainId, registry]
      )
    );
    const sig = await signer.signMessage(ethers.getBytes(digest));
    const { v, r, s } = ethers.Signature.from(sig);
    return { v, r, s };
  }

  describe("Deployment", function () {
    it("Should set bridge signer and policySAID", async function () {
      expect(await registry.bridgeSigner()).to.equal(bridgeWallet.address);
      expect(await registry.policySAID()).to.equal(policySAID);
      expect(await registry.owner()).to.equal(owner.address);
    });

    it("Should reject zero address as bridge signer", async function () {
      const Factory = await ethers.getContractFactory("ComplianceRegistry");
      await expect(
        Factory.deploy(ethers.ZeroAddress, policySAID)
      ).to.be.revertedWithCustomError(registry, "ZeroAddress");
    });

    it("Should reject zero bytes32 as policySAID", async function () {
      const Factory = await ethers.getContractFactory("ComplianceRegistry");
      await expect(
        Factory.deploy(bridgeWallet.address, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(registry, "ZeroPolicySAID");
    });
  });

  describe("Verify", function () {
    let expiry, chainId, decisionId, registryAddress;

    beforeEach(function () {
      expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);
      chainId = 31337n;
      decisionId = ethers.id("decision-001");
      registryAddress = registry.target;
    });

    it("Should verify a valid signed representation", async function () {
      const { v, r, s } = await signVerification(bridgeWallet, {
        policySAID,
        wallet: other.address,
        expiry,
        decisionId,
        chainId,
        registry: registryAddress,
      });

      await expect(
        registry.verify(policySAID, other.address, expiry, decisionId, chainId, registryAddress, v, r, s)
      )
        .to.emit(registry, "WalletVerified")
        .withArgs(other.address, policySAID, decisionId, expiry);
    });

    it("Should reject wrong signer", async function () {
      const { v, r, s } = await signVerification(other, {
        policySAID,
        wallet: other.address,
        expiry,
        decisionId,
        chainId,
        registry: registryAddress,
      });

      await expect(
        registry.verify(policySAID, other.address, expiry, decisionId, chainId, registryAddress, v, r, s)
      ).to.be.revertedWithCustomError(registry, "InvalidSigner");
    });

    it("Should reject wrong policySAID", async function () {
      const wrongPolicy = ethers.id("wrong-policy");
      const { v, r, s } = await signVerification(bridgeWallet, {
        policySAID: wrongPolicy,
        wallet: other.address,
        expiry,
        decisionId,
        chainId,
        registry: registryAddress,
      });

      await expect(
        registry.verify(wrongPolicy, other.address, expiry, decisionId, chainId, registryAddress, v, r, s)
      ).to.be.revertedWithCustomError(registry, "PolicyMismatch");
    });

    it("Should reject wrong registry address", async function () {
      const wrongRegistry = owner.address;
      const { v, r, s } = await signVerification(bridgeWallet, {
        policySAID,
        wallet: other.address,
        expiry,
        decisionId,
        chainId,
        registry: wrongRegistry,
      });

      await expect(
        registry.verify(policySAID, other.address, expiry, decisionId, chainId, wrongRegistry, v, r, s)
      ).to.be.revertedWithCustomError(registry, "RegistryMismatch");
    });

    it("Should reject wrong chainId", async function () {
      const wrongChainId = 1n;
      const { v, r, s } = await signVerification(bridgeWallet, {
        policySAID,
        wallet: other.address,
        expiry,
        decisionId,
        chainId: wrongChainId,
        registry: registryAddress,
      });

      await expect(
        registry.verify(policySAID, other.address, expiry, decisionId, wrongChainId, registryAddress, v, r, s)
      ).to.be.revertedWithCustomError(registry, "ChainIdMismatch");
    });

    it("Should reject expired representation", async function () {
      const pastExpiry = BigInt(Math.floor(Date.now() / 1000) - 3600);
      const { v, r, s } = await signVerification(bridgeWallet, {
        policySAID,
        wallet: other.address,
        expiry: pastExpiry,
        decisionId,
        chainId,
        registry: registryAddress,
      });

      await expect(
        registry.verify(policySAID, other.address, pastExpiry, decisionId, chainId, registryAddress, v, r, s)
      ).to.be.revertedWithCustomError(registry, "Expired");
    });

    it("Should reject replayed decisionId", async function () {
      const { v, r, s } = await signVerification(bridgeWallet, {
        policySAID,
        wallet: other.address,
        expiry,
        decisionId,
        chainId,
        registry: registryAddress,
      });

      await registry.verify(policySAID, other.address, expiry, decisionId, chainId, registryAddress, v, r, s);

      await expect(
        registry.verify(policySAID, other.address, expiry, decisionId, chainId, registryAddress, v, r, s)
      ).to.be.revertedWithCustomError(registry, "DecisionIdUsed");
    });
  });

  describe("Signer Rotation", function () {
    it("Should rotate signer", async function () {
      await expect(registry.rotateSigner(other.address))
        .to.emit(registry, "SignerRotated")
        .withArgs(bridgeWallet.address, other.address);

      expect(await registry.bridgeSigner()).to.equal(other.address);
    });

    it("Should reject rotation from non-owner", async function () {
      await expect(
        registry.connect(other).rotateSigner(other.address)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("Should verify with new signer after rotation", async function () {
      await registry.rotateSigner(other.address);

      const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const chainId = 31337n;
      const decisionId = ethers.id("decision-001");
      const registryAddress = registry.target;

      const { v, r, s } = await signVerification(other, {
        policySAID,
        wallet: bridgeWallet.address,
        expiry,
        decisionId,
        chainId,
        registry: registryAddress,
      });

      await expect(
        registry.verify(policySAID, bridgeWallet.address, expiry, decisionId, chainId, registryAddress, v, r, s)
      )
        .to.emit(registry, "WalletVerified")
        .withArgs(bridgeWallet.address, policySAID, decisionId, expiry);
    });
  });
});
