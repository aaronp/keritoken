const { ethers } = require("hardhat");

function base64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64");
}

async function createJwt(claims, signerWallet) {
  const header = { alg: "ES256K", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const digest = ethers.keccak256(ethers.toUtf8Bytes(signingInput));
  const signature = await signerWallet.signMessage(ethers.getBytes(digest));
  return `${signingInput}.${base64url(Buffer.from(ethers.getBytes(signature)))}`;
}

function makeTestClaims(overrides = {}) {
  return {
    iss: "test-issuer",
    sub: overrides.wallet || "0x0000000000000000000000000000000000000001",
    aud: overrides.registry || "0x0000000000000000000000000000000000000002",
    exp: overrides.exp || Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    jti: overrides.decisionId || ethers.hexlify(ethers.randomBytes(32)),
    policySAID: overrides.policySAID || ethers.id("test-policy"),
    chainId: overrides.chainId || 31337,
    ...overrides,
  };
}

function tamperJwt(jwt, claimOverrides) {
  const [header, payload, sig] = jwt.split(".");
  const claims = JSON.parse(base64urlDecode(payload).toString());
  Object.assign(claims, claimOverrides);
  const newPayload = base64url(JSON.stringify(claims));
  return `${header}.${newPayload}.${sig}`;
}

module.exports = { createJwt, makeTestClaims, tamperJwt, base64url, base64urlDecode };
