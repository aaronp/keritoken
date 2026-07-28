const { expect } = require("chai");
const { ethers } = require("hardhat");
const { createJwt, makeTestClaims, tamperJwt } = require("./helpers/jwt-fixtures");
const { bridgeJwt } = require("../lib/bridge");

describe("Bridge Library", function () {
  let issuerWallet, bridgeWallet;
  let policySAID, registryAddr;

  before(async function () {
    issuerWallet = ethers.Wallet.createRandom();
    bridgeWallet = ethers.Wallet.createRandom();
    policySAID = ethers.id("test-policy");
    registryAddr = "0x" + "ab".repeat(20);
  });

  it("Should produce a valid signed representation from a valid JWT", async function () {
    const claims = makeTestClaims({
      wallet: "0x1234567890abcdef1234567890abcdef12345678",
      registry: registryAddr,
      policySAID,
    });
    const jwt = await createJwt(claims, issuerWallet);

    const result = await bridgeJwt({
      jwt,
      issuerAddress: issuerWallet.address,
      bridgePrivateKey: bridgeWallet.privateKey,
    });

    expect(result.policySAID).to.equal(policySAID);
    expect(result.wallet.toLowerCase()).to.equal(claims.sub.toLowerCase());
    expect(result.registry.toLowerCase()).to.equal(registryAddr.toLowerCase());
    expect(result.expiry).to.equal(BigInt(claims.exp));
    expect(result.chainId).to.equal(BigInt(claims.chainId));

    // Verify the signature is valid
    const digest = ethers.keccak256(
      ethers.solidityPacked(
        ["bytes32", "address", "uint64", "bytes32", "uint256", "address"],
        [result.policySAID, result.wallet, result.expiry, result.decisionId, result.chainId, result.registry]
      )
    );
    const recovered = ethers.verifyMessage(ethers.getBytes(digest), ethers.Signature.from({ v: result.v, r: result.r, s: result.s }));
    expect(recovered.toLowerCase()).to.equal(bridgeWallet.address.toLowerCase());
  });

  it("Should reject an expired JWT", async function () {
    const claims = makeTestClaims({
      exp: Math.floor(Date.now() / 1000) - 3600,
      registry: registryAddr,
      policySAID,
    });
    const jwt = await createJwt(claims, issuerWallet);

    try {
      await bridgeJwt({ jwt, issuerAddress: issuerWallet.address, bridgePrivateKey: bridgeWallet.privateKey });
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e.message).to.match(/expired/i);
    }
  });

  it("Should reject a tampered JWT", async function () {
    const claims = makeTestClaims({ registry: registryAddr, policySAID });
    const jwt = await createJwt(claims, issuerWallet);
    const tampered = tamperJwt(jwt, { sub: "0x0000000000000000000000000000000000000099" });

    try {
      await bridgeJwt({ jwt: tampered, issuerAddress: issuerWallet.address, bridgePrivateKey: bridgeWallet.privateKey });
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e.message).to.match(/signature/i);
    }
  });

  it("Should reject a JWT signed by the wrong issuer", async function () {
    const wrongIssuer = ethers.Wallet.createRandom();
    const claims = makeTestClaims({ registry: registryAddr, policySAID });
    const jwt = await createJwt(claims, wrongIssuer);

    try {
      await bridgeJwt({ jwt, issuerAddress: issuerWallet.address, bridgePrivateKey: bridgeWallet.privateKey });
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e.message).to.match(/signature/i);
    }
  });

  it("Should reject a JWT missing required claims", async function () {
    const claims = makeTestClaims({ registry: registryAddr });
    delete claims.policySAID;
    const jwt = await createJwt(claims, issuerWallet);

    try {
      await bridgeJwt({ jwt, issuerAddress: issuerWallet.address, bridgePrivateKey: bridgeWallet.privateKey });
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e.message).to.match(/missing/i);
    }
  });
});
