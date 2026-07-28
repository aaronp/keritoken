const { expect } = require("chai");
const { ethers } = require("hardhat");
const { createJwt, makeTestClaims } = require("../helpers/jwt-fixtures");
const { bridgeJwt } = require("../../lib/bridge");

describe("Integration: Compliance Flow", function () {
  let registry, registryAddr;
  let owner, walletA, walletB;
  let issuerWallet, bridgeWallet;
  const policySAID = ethers.id("integration-policy");

  beforeEach(async function () {
    [owner, walletA, walletB] = await ethers.getSigners();
    issuerWallet = ethers.Wallet.createRandom();
    bridgeWallet = ethers.Wallet.createRandom();

    const Factory = await ethers.getContractFactory("ComplianceRegistry");
    registry = await Factory.deploy(bridgeWallet.address, policySAID);
    await registry.waitForDeployment();
    registryAddr = await registry.getAddress();
  });

  it("Full flow: JWT → bridge → on-chain verify", async function () {
    const claims = makeTestClaims({
      wallet: walletA.address,
      registry: registryAddr,
      policySAID,
      chainId: 31337,
    });
    const jwt = await createJwt(claims, issuerWallet);

    const rep = await bridgeJwt({
      jwt,
      issuerAddress: issuerWallet.address,
      bridgePrivateKey: bridgeWallet.privateKey,
    });

    await expect(
      registry.verify(
        rep.policySAID, rep.wallet, rep.expiry, rep.decisionId,
        rep.chainId, rep.registry, rep.v, rep.r, rep.s
      )
    ).to.emit(registry, "WalletVerified")
      .withArgs(walletA.address, policySAID, rep.decisionId, rep.expiry);
  });

  it("Replay same representation fails", async function () {
    const claims = makeTestClaims({
      wallet: walletA.address,
      registry: registryAddr,
      policySAID,
      chainId: 31337,
    });
    const jwt = await createJwt(claims, issuerWallet);
    const rep = await bridgeJwt({
      jwt,
      issuerAddress: issuerWallet.address,
      bridgePrivateKey: bridgeWallet.privateKey,
    });

    await registry.verify(
      rep.policySAID, rep.wallet, rep.expiry, rep.decisionId,
      rep.chainId, rep.registry, rep.v, rep.r, rep.s
    );

    await expect(
      registry.verify(
        rep.policySAID, rep.wallet, rep.expiry, rep.decisionId,
        rep.chainId, rep.registry, rep.v, rep.r, rep.s
      )
    ).to.be.revertedWithCustomError(registry, "DecisionIdUsed");
  });

  it("Expired JWT fails at bridge level", async function () {
    const claims = makeTestClaims({
      wallet: walletA.address,
      registry: registryAddr,
      policySAID,
      chainId: 31337,
      exp: Math.floor(Date.now() / 1000) - 60,
    });
    const jwt = await createJwt(claims, issuerWallet);

    try {
      await bridgeJwt({
        jwt,
        issuerAddress: issuerWallet.address,
        bridgePrivateKey: bridgeWallet.privateKey,
      });
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e.message).to.match(/expired/i);
    }
  });
});
