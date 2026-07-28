# JWT Compliance Bridge Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bridge library that translates JWTs into EVM-verifiable signed representations, and a ComplianceRegistry contract that verifies them on-chain.

**Architecture:** Off-chain TypeScript bridge validates ES256K JWTs and produces EIP-191-signed compact representations. On-chain ComplianceRegistry recovers the bridge signer via `ECDSA.recover`, validates claims (policySAID, chainId, expiry, registry address), and marks decisionIds as used for replay protection.

**Tech Stack:** Solidity 0.8.20, OpenZeppelin 5 (Ownable, ECDSA, MessageHashUtils), Hardhat, ethers.js 6, React 19, Vite, TypeScript

**Spec:** `docs/superpowers/specs/2026-07-28-jwt-compliance-bridge-design.md`

---

## File Structure

### New files

| Path | Responsibility |
|------|---------------|
| `contracts/ComplianceRegistry.sol` | On-chain signature verification + replay protection |
| `lib/bridge.ts` | JWT validation → signed representation (shared by tests + UI) |
| `lib/jwt.ts` | Low-level JWT decode/verify (ES256K) |
| `test/ComplianceRegistry.test.js` | Contract unit tests |
| `test/bridge.test.js` | Bridge library unit tests |
| `test/integration/compliance-flow.test.js` | End-to-end JWT → bridge → contract |
| `test/helpers/jwt-fixtures.js` | JWT generation helpers for tests |
| `ui/src/hooks/useComplianceRegistry.ts` | React hook for registry contract interaction |
| `ui/src/routes/Compliance.tsx` | Compliance Registry page (deploy, verify, event log) |
| `ui/public/contracts/ComplianceRegistry.json` | ABI for UI |
| `scripts/deploy-compliance.js` | Deployment script for ComplianceRegistry |

### Modified files

| Path | Change |
|------|--------|
| `package.json` | Rename to `keritoken` |
| `Makefile` | Replace bond-auction references, add `test-bridge`, `test-contract`, `test-integration`, `NETWORK` variable |
| `readme.md` | Complete rewrite with Makefile examples |
| `ui/src/App.tsx` | Add `/compliance` route |
| `ui/src/components/Sidebar.tsx` | Add Compliance nav item, rename Governance label |
| `ui/src/components/AppBar.tsx` | Show chain name + chain ID |
| `ui/src/hooks/useWeb3.ts` | Add `chainId` and `chainName` to return value |
| `ui/src/lib/storage.ts` | Add `DeployedComplianceRegistry` type and storage methods |
| `ui/vite.config.ts` | Add alias for `@lib` pointing to root `lib/` |
| `hardhat.config.js` | Add `ts-node` registration for .ts imports in tests |

### Unchanged (preserved as-is)

| Path | Reason |
|------|--------|
| `contracts/GovernanceToken.sol` | Existing contract, not modified in this PoC |
| `contracts/Token.sol` | Token integration is out of scope |
| `test/GovernanceToken.test.js` | Existing tests kept working |
| `test/Token.test.js` | Existing tests kept working |
| `test/integration/allowlist-flow.test.js` | Existing integration tests kept working |

---

## Chunk 1: Setup and Contract

### Task 1: Branch and cleanup

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Create the jwt-compliance branch**

```bash
git checkout -b jwt-compliance
```

- [ ] **Step 2: Rename package.json**

Change `package.json` line 2 from `"name": "bond-auction"` to `"name": "keritoken"` and line 4 description to `"description": "JWT compliance bridge for ERC-20 tokens"`.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: rename package from bond-auction to keritoken"
```

---

### Task 2: ComplianceRegistry contract — failing test

**Files:**
- Create: `test/ComplianceRegistry.test.js`

Note: The test needs to produce valid EIP-191 signatures. Use ethers.js `Wallet.signMessage()` which automatically applies EIP-191 prefix. The contract uses `ECDSA.recover` with `MessageHashUtils.toEthSignedMessageHash` which expects the same prefix.

- [ ] **Step 1: Write the deployment test**

```js
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

  describe("Deployment", function () {
    it("Should set bridge signer and policySAID", async function () {
      expect(await registry.bridgeSigner()).to.equal(bridgeWallet.address);
      expect(await registry.policySAID()).to.equal(policySAID);
      expect(await registry.owner()).to.equal(owner.address);
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx hardhat test test/ComplianceRegistry.test.js
```

Expected: Fails — `ComplianceRegistry` contract doesn't exist yet.

---

### Task 3: ComplianceRegistry contract — implementation

**Files:**
- Create: `contracts/ComplianceRegistry.sol`

- [ ] **Step 1: Write the contract**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract ComplianceRegistry is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public bridgeSigner;
    bytes32 public policySAID;
    mapping(bytes32 => bool) public usedDecisionIds;

    event WalletVerified(
        address indexed wallet,
        bytes32 indexed policySAID,
        bytes32 decisionId,
        uint64 expiry
    );
    event SignerRotated(address indexed oldSigner, address indexed newSigner);

    error InvalidSigner();
    error PolicyMismatch();
    error RegistryMismatch();
    error ChainIdMismatch();
    error Expired();
    error DecisionIdUsed();
    error ZeroAddress();

    constructor(
        address bridgeSigner_,
        bytes32 policySAID_
    ) Ownable(msg.sender) {
        if (bridgeSigner_ == address(0)) revert ZeroAddress();
        bridgeSigner = bridgeSigner_;
        policySAID = policySAID_;
    }

    function verify(
        bytes32 policySAID_,
        address wallet,
        uint64 expiry,
        bytes32 decisionId,
        uint256 chainId_,
        address registry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (bool) {
        bytes32 digest = keccak256(
            abi.encodePacked(policySAID_, wallet, expiry, decisionId, chainId_, registry)
        );
        bytes32 ethSignedHash = digest.toEthSignedMessageHash();
        address recovered = ECDSA.recover(ethSignedHash, v, r, s);

        if (recovered != bridgeSigner) revert InvalidSigner();
        if (policySAID_ != policySAID) revert PolicyMismatch();
        if (registry != address(this)) revert RegistryMismatch();
        if (chainId_ != block.chainid) revert ChainIdMismatch();
        if (expiry <= block.timestamp) revert Expired();
        if (usedDecisionIds[decisionId]) revert DecisionIdUsed();

        usedDecisionIds[decisionId] = true;
        emit WalletVerified(wallet, policySAID_, decisionId, expiry);
        return true;
    }

    function rotateSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        address old = bridgeSigner;
        bridgeSigner = newSigner;
        emit SignerRotated(old, newSigner);
    }
}
```

- [ ] **Step 2: Compile**

```bash
npx hardhat compile
```

Expected: Compiles successfully.

- [ ] **Step 3: Run deployment test**

```bash
npx hardhat test test/ComplianceRegistry.test.js
```

Expected: PASS — deployment test passes.

- [ ] **Step 4: Commit**

```bash
git add contracts/ComplianceRegistry.sol test/ComplianceRegistry.test.js
git commit -m "feat: add ComplianceRegistry contract with deployment test"
```

---

### Task 4: ComplianceRegistry verify — tests

**Files:**
- Modify: `test/ComplianceRegistry.test.js`

The key pattern: use `ethers.Wallet` for the bridge signer. Compute `abi.encodePacked(...)` with `ethers.solidityPacked`, then `keccak256` it, then `bridgeWallet.signMessage(ethers.getBytes(digest))` which auto-applies EIP-191. Extract `(v, r, s)` with `ethers.Signature.from(sig)`.

- [ ] **Step 1: Add a signing helper and verify tests**

Add to `test/ComplianceRegistry.test.js` after the deployment tests:

```js
  // Helper to create a signed representation
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

  describe("Verify", function () {
    let registryAddr;
    const decisionId = ethers.id("decision-001");
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

    beforeEach(async function () {
      registryAddr = await registry.getAddress();
    });

    it("Should verify a valid signed representation", async function () {
      const params = {
        policySAID,
        wallet: other.address,
        expiry,
        decisionId,
        chainId: 31337n,
        registry: registryAddr,
      };
      const { v, r, s } = await signVerification(bridgeWallet, params);

      await expect(
        registry.verify(policySAID, other.address, expiry, decisionId, 31337n, registryAddr, v, r, s)
      ).to.emit(registry, "WalletVerified")
        .withArgs(other.address, policySAID, decisionId, expiry);
    });

    it("Should reject wrong signer", async function () {
      const params = {
        policySAID,
        wallet: other.address,
        expiry,
        decisionId,
        chainId: 31337n,
        registry: registryAddr,
      };
      // Sign with 'other' instead of bridgeWallet
      const { v, r, s } = await signVerification(other, params);

      await expect(
        registry.verify(policySAID, other.address, expiry, decisionId, 31337n, registryAddr, v, r, s)
      ).to.be.revertedWithCustomError(registry, "InvalidSigner");
    });

    it("Should reject wrong policySAID", async function () {
      const wrongPolicy = ethers.id("wrong-policy");
      const params = {
        policySAID: wrongPolicy,
        wallet: other.address,
        expiry,
        decisionId,
        chainId: 31337n,
        registry: registryAddr,
      };
      const { v, r, s } = await signVerification(bridgeWallet, params);

      await expect(
        registry.verify(wrongPolicy, other.address, expiry, decisionId, 31337n, registryAddr, v, r, s)
      ).to.be.revertedWithCustomError(registry, "PolicyMismatch");
    });

    it("Should reject wrong registry address", async function () {
      const fakeRegistry = owner.address;
      const params = {
        policySAID,
        wallet: other.address,
        expiry,
        decisionId,
        chainId: 31337n,
        registry: fakeRegistry,
      };
      const { v, r, s } = await signVerification(bridgeWallet, params);

      await expect(
        registry.verify(policySAID, other.address, expiry, decisionId, 31337n, fakeRegistry, v, r, s)
      ).to.be.revertedWithCustomError(registry, "RegistryMismatch");
    });

    it("Should reject wrong chainId", async function () {
      const params = {
        policySAID,
        wallet: other.address,
        expiry,
        decisionId,
        chainId: 1n, // wrong chain
        registry: registryAddr,
      };
      const { v, r, s } = await signVerification(bridgeWallet, params);

      await expect(
        registry.verify(policySAID, other.address, expiry, decisionId, 1n, registryAddr, v, r, s)
      ).to.be.revertedWithCustomError(registry, "ChainIdMismatch");
    });

    it("Should reject expired representation", async function () {
      const pastExpiry = BigInt(Math.floor(Date.now() / 1000) - 3600);
      const params = {
        policySAID,
        wallet: other.address,
        expiry: pastExpiry,
        decisionId,
        chainId: 31337n,
        registry: registryAddr,
      };
      const { v, r, s } = await signVerification(bridgeWallet, params);

      await expect(
        registry.verify(policySAID, other.address, pastExpiry, decisionId, 31337n, registryAddr, v, r, s)
      ).to.be.revertedWithCustomError(registry, "Expired");
    });

    it("Should reject replayed decisionId", async function () {
      const params = {
        policySAID,
        wallet: other.address,
        expiry,
        decisionId,
        chainId: 31337n,
        registry: registryAddr,
      };
      const { v, r, s } = await signVerification(bridgeWallet, params);

      // First call succeeds
      await registry.verify(policySAID, other.address, expiry, decisionId, 31337n, registryAddr, v, r, s);

      // Second call with same decisionId reverts
      await expect(
        registry.verify(policySAID, other.address, expiry, decisionId, 31337n, registryAddr, v, r, s)
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

      const registryAddr = await registry.getAddress();
      const decisionId = ethers.id("after-rotation");
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const params = {
        policySAID,
        wallet: owner.address,
        expiry,
        decisionId,
        chainId: 31337n,
        registry: registryAddr,
      };
      // Sign with 'other' (the new signer)
      const { v, r, s } = await signVerification(other, params);

      await expect(
        registry.verify(policySAID, owner.address, expiry, decisionId, 31337n, registryAddr, v, r, s)
      ).to.emit(registry, "WalletVerified");
    });
  });
```

- [ ] **Step 2: Run tests**

```bash
npx hardhat test test/ComplianceRegistry.test.js
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add test/ComplianceRegistry.test.js
git commit -m "test: add comprehensive ComplianceRegistry verify and rotation tests"
```

---

## Chunk 2: Bridge Library

### Task 5: JWT helpers — test fixtures

**Files:**
- Create: `test/helpers/jwt-fixtures.js`

This module generates JWTs for testing using ethers.js Wallet (secp256k1/ES256K).

- [ ] **Step 1: Write JWT fixture helpers**

```js
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

/**
 * Create a JWT signed with an ethers Wallet (secp256k1).
 * Uses Ethereum's personal_sign (keccak256 of payload, then signMessage).
 * This is ES256K-ish: we sign the keccak256 of the header.payload with EIP-191.
 */
async function createJwt(claims, signerWallet) {
  const header = { alg: "ES256K", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Sign the keccak256 of the signing input using EIP-191 (personal_sign)
  const digest = ethers.keccak256(ethers.toUtf8Bytes(signingInput));
  const signature = await signerWallet.signMessage(ethers.getBytes(digest));

  return `${signingInput}.${base64url(Buffer.from(ethers.getBytes(signature)))}`;
}

/**
 * Create standard test claims
 */
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

/**
 * Tamper with a JWT payload without re-signing
 */
function tamperJwt(jwt, claimOverrides) {
  const [header, payload, sig] = jwt.split(".");
  const claims = JSON.parse(base64urlDecode(payload).toString());
  Object.assign(claims, claimOverrides);
  const newPayload = base64url(JSON.stringify(claims));
  return `${header}.${newPayload}.${sig}`;
}

module.exports = { createJwt, makeTestClaims, tamperJwt, base64url, base64urlDecode };
```

- [ ] **Step 2: Commit**

```bash
git add test/helpers/jwt-fixtures.js
git commit -m "test: add JWT fixture helpers for bridge testing"
```

---

### Task 6: Bridge library — failing test

**Files:**
- Create: `test/bridge.test.js`

- [ ] **Step 1: Write bridge library tests**

```js
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
      exp: Math.floor(Date.now() / 1000) - 3600, // expired
      registry: registryAddr,
      policySAID,
    });
    const jwt = await createJwt(claims, issuerWallet);

    await expect(
      bridgeJwt({ jwt, issuerAddress: issuerWallet.address, bridgePrivateKey: bridgeWallet.privateKey })
    ).to.be.rejectedWith(/expired/i);
  });

  it("Should reject a tampered JWT", async function () {
    const claims = makeTestClaims({ registry: registryAddr, policySAID });
    const jwt = await createJwt(claims, issuerWallet);
    const tampered = tamperJwt(jwt, { sub: "0x0000000000000000000000000000000000000099" });

    await expect(
      bridgeJwt({ jwt: tampered, issuerAddress: issuerWallet.address, bridgePrivateKey: bridgeWallet.privateKey })
    ).to.be.rejectedWith(/signature/i);
  });

  it("Should reject a JWT signed by the wrong issuer", async function () {
    const wrongIssuer = ethers.Wallet.createRandom();
    const claims = makeTestClaims({ registry: registryAddr, policySAID });
    const jwt = await createJwt(claims, wrongIssuer);

    await expect(
      bridgeJwt({ jwt, issuerAddress: issuerWallet.address, bridgePrivateKey: bridgeWallet.privateKey })
    ).to.be.rejectedWith(/signature/i);
  });

  it("Should reject a JWT missing required claims", async function () {
    const claims = makeTestClaims({ registry: registryAddr });
    delete claims.policySAID;
    const jwt = await createJwt(claims, issuerWallet);

    await expect(
      bridgeJwt({ jwt, issuerAddress: issuerWallet.address, bridgePrivateKey: bridgeWallet.privateKey })
    ).to.be.rejectedWith(/missing/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx hardhat test test/bridge.test.js
```

Expected: Fails — `../lib/bridge.ts` doesn't exist.

---

### Task 7: Bridge library — implementation

**Files:**
- Create: `lib/jwt.ts`
- Create: `lib/bridge.ts`

Note: These files use ethers.js (available in the project) for keccak256, signature operations, and `solidityPacked`. They are `.ts` files but will be transpiled by Hardhat's ts-node when imported in tests.

- [ ] **Step 1: Create lib/jwt.ts**

```typescript
import { ethers } from "ethers";

function base64urlDecode(str: string): Buffer {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64");
}

export interface JwtParts {
  header: { alg: string; typ: string };
  payload: Record<string, unknown>;
  signingInput: string;
  signatureBytes: Uint8Array;
}

export function decodeJwt(jwt: string): JwtParts {
  const parts = jwt.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT: expected 3 parts");

  const header = JSON.parse(base64urlDecode(parts[0]).toString());
  const payload = JSON.parse(base64urlDecode(parts[1]).toString());
  const signatureBytes = new Uint8Array(base64urlDecode(parts[2]));
  const signingInput = `${parts[0]}.${parts[1]}`;

  return { header, payload, signingInput, signatureBytes };
}

export function verifyJwtSignature(
  signingInput: string,
  signatureBytes: Uint8Array,
  expectedAddress: string
): void {
  const digest = ethers.keccak256(ethers.toUtf8Bytes(signingInput));
  const recovered = ethers.verifyMessage(
    ethers.getBytes(digest),
    ethers.hexlify(signatureBytes)
  );
  if (recovered.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new Error("Invalid JWT signature: signer mismatch");
  }
}

const REQUIRED_CLAIMS = ["sub", "aud", "exp", "jti", "policySAID", "chainId"];

export function validateClaims(payload: Record<string, unknown>): void {
  for (const claim of REQUIRED_CLAIMS) {
    if (payload[claim] === undefined || payload[claim] === null) {
      throw new Error(`Missing required JWT claim: ${claim}`);
    }
  }

  const exp = Number(payload.exp);
  if (exp <= Math.floor(Date.now() / 1000)) {
    throw new Error("JWT expired");
  }
}
```

- [ ] **Step 2: Create lib/bridge.ts**

```typescript
import { ethers } from "ethers";
import { decodeJwt, verifyJwtSignature, validateClaims } from "./jwt";

export interface BridgeInput {
  jwt: string;
  issuerAddress: string;     // Ethereum address of the JWT issuer
  bridgePrivateKey: string;  // Bridge's secp256k1 private key (hex, 0x-prefixed)
}

export interface SignedRepresentation {
  policySAID: string;
  wallet: string;
  expiry: bigint;
  decisionId: string;
  chainId: bigint;
  registry: string;
  v: number;
  r: string;
  s: string;
}

export async function bridgeJwt(input: BridgeInput): Promise<SignedRepresentation> {
  const { jwt, issuerAddress, bridgePrivateKey } = input;

  // 1. Decode
  const { payload, signingInput, signatureBytes } = decodeJwt(jwt);

  // 2. Verify JWT signature
  verifyJwtSignature(signingInput, signatureBytes, issuerAddress);

  // 3. Validate claims
  validateClaims(payload);

  // 4. Extract claims
  const policySAID = payload.policySAID as string;
  const wallet = payload.sub as string;
  const expiry = BigInt(payload.exp as number);
  const decisionId = payload.jti as string;
  const chainId = BigInt(payload.chainId as number);
  const registry = payload.aud as string;

  // 5. Compute packed digest
  const digest = ethers.keccak256(
    ethers.solidityPacked(
      ["bytes32", "address", "uint64", "bytes32", "uint256", "address"],
      [policySAID, wallet, expiry, decisionId, chainId, registry]
    )
  );

  // 6. Sign with EIP-191 prefix
  const bridgeWallet = new ethers.Wallet(bridgePrivateKey);
  const signature = await bridgeWallet.signMessage(ethers.getBytes(digest));
  const { v, r, s } = ethers.Signature.from(signature);

  return { policySAID, wallet, expiry, decisionId, chainId, registry, v, r, s };
}
```

- [ ] **Step 3: Add ts-node support for .ts imports in hardhat tests**

The project already has `ts-node` in devDependencies. Add a `tsconfig.json` at root if not present. This is only for Hardhat/ts-node — the UI has its own `ui/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "strict": false
  },
  "include": ["lib/**/*", "test/**/*"]
}
```

Also add `dist/` to `.gitignore` if not already present.

Update `hardhat.config.js` to add at the top:

```js
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "commonjs" } });
```

**Note:** The bridge test uses `require("../lib/bridge")` (not dynamic `import()`) because Hardhat tests run as CommonJS. ts-node hooks into `require()` to transpile `.ts` files. The `lib/jwt.ts` uses `Buffer` which is Node-native; if the UI ever does client-side JWT bridging, a polyfill would be needed.

- [ ] **Step 4: Run bridge tests**

```bash
npx hardhat test test/bridge.test.js
```

Expected: All PASS.

- [ ] **Step 5: Run all existing tests to ensure nothing broke**

```bash
npx hardhat test
```

Expected: All existing tests still pass. Bridge tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/jwt.ts lib/bridge.ts tsconfig.json hardhat.config.js
git commit -m "feat: add bridge library for JWT-to-signed-representation translation"
```

---

### Task 8: Integration test — end-to-end

**Files:**
- Create: `test/integration/compliance-flow.test.js`

- [ ] **Step 1: Write end-to-end integration test**

```js
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { createJwt, makeTestClaims } = require("../helpers/jwt-fixtures");
const { bridgeJwt } = require("../../lib/bridge");

describe("Integration: Compliance Flow", function () {
  let registry, registryAddr;
  let owner, issuerWallet, bridgeWallet, walletA, walletB;
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
    // 1. Create JWT authorising walletA
    const claims = makeTestClaims({
      wallet: walletA.address,
      registry: registryAddr,
      policySAID,
      chainId: 31337,
    });
    const jwt = await createJwt(claims, issuerWallet);

    // 2. Bridge produces signed representation
    const rep = await bridgeJwt({
      jwt,
      issuerAddress: issuerWallet.address,
      bridgePrivateKey: bridgeWallet.privateKey,
    });

    // 3. Submit to contract
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

    // First: success
    await registry.verify(
      rep.policySAID, rep.wallet, rep.expiry, rep.decisionId,
      rep.chainId, rep.registry, rep.v, rep.r, rep.s
    );

    // Second: replay fails
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

    await expect(
      bridgeJwt({
        jwt,
        issuerAddress: issuerWallet.address,
        bridgePrivateKey: bridgeWallet.privateKey,
      })
    ).to.be.rejectedWith(/expired/i);
  });
});
```

- [ ] **Step 2: Run integration tests**

```bash
npx hardhat test test/integration/compliance-flow.test.js
```

Expected: All PASS.

- [ ] **Step 3: Commit**

```bash
git add test/integration/compliance-flow.test.js
git commit -m "test: add end-to-end compliance flow integration tests"
```

---

## Chunk 3: Makefile, README, Deploy Script

### Task 9: Makefile rewrite

**Files:**
- Modify: `Makefile`

- [ ] **Step 1: Rewrite the Makefile**

Replace the entire Makefile contents. The new Makefile should:
- Replace all "Bond Auction" references with "KeriToken Compliance"
- Add `NETWORK` variable (default: `localhost`)
- Add `test-bridge`, `test-contract`, `test-integration` targets
- Keep `test` as "run all tests"
- Keep `node`, `compile`, `clean`, `install`
- Add `deploy` that uses `NETWORK` variable
- Keep UI build targets

```makefile
# KeriToken — JWT Compliance Bridge
# Usage: make <target> [NETWORK=localhost|baseSepolia|base]

NETWORK ?= localhost

.PHONY: help install compile clean test test-contract test-bridge test-integration \
        deploy node dev build-ui

help:
	@echo "KeriToken — JWT Compliance Bridge"
	@echo ""
	@echo "Testing:"
	@echo "  make test                  Run all tests (local Hardhat)"
	@echo "  make test-contract         Run contract tests only"
	@echo "  make test-bridge           Run bridge library tests only"
	@echo "  make test-integration      Run integration tests"
	@echo "  make coverage              Generate coverage report"
	@echo ""
	@echo "Development:"
	@echo "  make install               Install dependencies"
	@echo "  make compile               Compile smart contracts"
	@echo "  make node                  Start local Hardhat node"
	@echo "  make dev                   Start UI dev server"
	@echo "  make clean                 Clean build artifacts"
	@echo ""
	@echo "Deployment (set NETWORK=localhost|baseSepolia|base):"
	@echo "  make deploy                Deploy ComplianceRegistry"
	@echo "  make deploy NETWORK=baseSepolia"
	@echo ""
	@echo "UI:"
	@echo "  make build-ui              Build UI for GitHub Pages"

install:
	npm install
	cd ui && npm install

compile:
	npx hardhat compile

clean:
	rm -rf artifacts/ cache/ typechain-types/

test: compile
	npx hardhat test

test-contract: compile
	npx hardhat test test/ComplianceRegistry.test.js test/GovernanceToken.test.js test/Token.test.js

test-bridge: compile
	npx hardhat test test/bridge.test.js

test-integration: compile
	npx hardhat test test/integration/*.test.js

coverage: compile
	npx hardhat coverage

node:
	npx hardhat node

deploy: compile
	npx hardhat run scripts/deploy-compliance.js --network $(NETWORK)

dev:
	cd ui && npm run dev

build-ui:
	cd ui && npm run build

env-setup:
	@if [ ! -f .env ]; then \
		echo "PRIVATE_KEY=" > .env; \
		echo "SEPOLIA_RPC_URL=" >> .env; \
		echo "BASE_RPC_URL=https://mainnet.base.org" >> .env; \
		echo "BASE_SEPOLIA_RPC_URL=https://sepolia.base.org" >> .env; \
		echo "BASESCAN_API_KEY=" >> .env; \
		echo "Created .env — fill in your values"; \
	else \
		echo ".env already exists"; \
	fi
```

- [ ] **Step 2: Verify Makefile works**

```bash
make help
make test
```

Expected: Help displays correctly. Tests pass.

- [ ] **Step 3: Commit**

```bash
git add Makefile
git commit -m "chore: rewrite Makefile for compliance bridge workflow"
```

---

### Task 10: Deploy script

**Files:**
- Create: `scripts/deploy-compliance.js`

- [ ] **Step 1: Write the deployment script**

```js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;

  console.log(`Network: ${network} (chainId: ${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH`);

  // These should be set via env or CLI args
  const bridgeSigner = process.env.BRIDGE_SIGNER;
  const policySAID = process.env.POLICY_SAID;

  if (!bridgeSigner || !policySAID) {
    console.error("Set BRIDGE_SIGNER and POLICY_SAID environment variables");
    console.error("Example:");
    console.error("  BRIDGE_SIGNER=0x... POLICY_SAID=0x... make deploy");
    process.exit(1);
  }

  console.log(`\nBridge Signer: ${bridgeSigner}`);
  console.log(`Policy SAID: ${policySAID}`);

  const Factory = await hre.ethers.getContractFactory("ComplianceRegistry");
  const registry = await Factory.deploy(bridgeSigner, policySAID);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();

  console.log(`\nComplianceRegistry deployed to: ${registryAddr}`);

  // Verify on block explorer if not local
  if (network !== "hardhat" && network !== "localhost") {
    console.log("Waiting for confirmations...");
    await registry.deploymentTransaction().wait(5);
    try {
      await hre.run("verify:verify", {
        address: registryAddr,
        constructorArguments: [bridgeSigner, policySAID],
      });
      console.log("Contract verified on block explorer");
    } catch (e) {
      console.log("Verification failed:", e.message);
    }
  }

  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log(`Network:          ${network} (${chainId})`);
  console.log(`Registry:         ${registryAddr}`);
  console.log(`Bridge Signer:    ${bridgeSigner}`);
  console.log(`Policy SAID:      ${policySAID}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Commit**

```bash
git add scripts/deploy-compliance.js
git commit -m "feat: add ComplianceRegistry deployment script"
```

---

### Task 11: README rewrite

**Files:**
- Modify: `readme.md`

- [ ] **Step 1: Rewrite README**

```markdown
# KeriToken — JWT Compliance Bridge

On-chain compliance verification for ERC-20 tokens using JWT-based policy decisions.

An off-chain bridge validates JWTs from a policy issuer and produces EVM-verifiable signed representations. The on-chain ComplianceRegistry verifies these signatures, ensuring that only wallets authorised by a specific policy can participate in token operations.

## Quick Start

```bash
make install          # install dependencies
make node             # start local Hardhat node (in a separate terminal)
make test             # run all tests
```

## Testing

```bash
make test                       # all tests (local Hardhat)
make test-contract              # contract tests only
make test-bridge                # bridge library tests only
make test-integration           # end-to-end: JWT → bridge → contract
make coverage                   # coverage report
```

## Deployment

Set environment variables, then deploy:

```bash
# Required
export BRIDGE_SIGNER=0x...      # Ethereum address of the bridge signing key
export POLICY_SAID=0x...        # bytes32 policy identifier

# Deploy to local Hardhat node
make deploy

# Deploy to Base Sepolia testnet
make deploy NETWORK=baseSepolia

# Deploy to Base mainnet
make deploy NETWORK=base
```

For testnet/mainnet, also set in `.env`:

```
PRIVATE_KEY=<deployer private key>
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_RPC_URL=https://mainnet.base.org
BASESCAN_API_KEY=<for contract verification>
```

Run `make env-setup` to create a template `.env` file.

## UI

```bash
make dev              # start dev server at http://localhost:5173
make build-ui         # production build
```

The UI shows:
- **Compliance Registry** — deploy registries, submit signed representations, view verification events
- **Tokens** — deploy and manage ERC-20 tokens with whitelist enforcement

Chain name and ID are displayed based on the connected MetaMask network.

## Architecture

```
JWT Issuer → Bridge (off-chain) → ComplianceRegistry (on-chain)
```

1. Policy issuer signs a JWT (ES256K) authorising a wallet for a policy
2. Bridge validates the JWT and produces a compact secp256k1-signed representation
3. Anyone submits the signed representation to the ComplianceRegistry contract
4. Contract recovers the bridge signer via `ecrecover`, validates claims, marks the decision ID as used

See `docs/superpowers/specs/2026-07-28-jwt-compliance-bridge-design.md` for the full design spec.

## Project Structure

```
contracts/
  ComplianceRegistry.sol   — on-chain signature verification + replay protection
  GovernanceToken.sol      — simple address whitelist (existing)
  Token.sol                — ERC-20 with whitelist enforcement (existing)
lib/
  bridge.ts                — JWT → signed representation
  jwt.ts                   — JWT decode and verify (ES256K)
test/
  ComplianceRegistry.test.js
  bridge.test.js
  integration/
    compliance-flow.test.js
    allowlist-flow.test.js
ui/                         — React + TypeScript frontend
scripts/
  deploy-compliance.js     — ComplianceRegistry deployment
```
```

- [ ] **Step 2: Commit**

```bash
git add readme.md
git commit -m "docs: rewrite README for compliance bridge workflow"
```

---

## Chunk 4: UI Updates

### Task 12: useWeb3 — add chain info

**Files:**
- Modify: `ui/src/hooks/useWeb3.ts`

- [ ] **Step 1: Add chainId and chainName to useWeb3**

Add state variables for `chainId` and `chainName`. Update them when provider/account changes. Return them from the hook.

Add after line 14 (`const [isConnected, setIsConnected] = useState(false);`):

```typescript
const [chainId, setChainId] = useState<number | null>(null);
const [chainName, setChainName] = useState<string | null>(null);
```

Add a chain name lookup helper inside the hook:

```typescript
function getChainName(id: number): string {
  const chains: Record<number, string> = {
    1: "Ethereum",
    11155111: "Sepolia",
    8453: "Base",
    84532: "Base Sepolia",
    31337: "Hardhat Local",
  };
  return chains[id] || `Chain ${id}`;
}
```

In the `useEffect`, after `ethersProvider.getSigner().then(setSigner)`, add:

```typescript
ethersProvider.getNetwork().then((net) => {
  const id = Number(net.chainId);
  setChainId(id);
  setChainName(getChainName(id));
});
```

Listen for chain changes — add after the `accountsChanged` listener:

```typescript
window.ethereum.on('chainChanged', () => {
  window.location.reload();
});
```

In the `connect` function, after setting signer, add the same network detection.

Update the return to include `chainId` and `chainName`:

```typescript
return { provider, signer, account, isConnected, connect, chainId, chainName };
```

- [ ] **Step 2: Verify UI compiles**

```bash
cd ui && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add ui/src/hooks/useWeb3.ts
git commit -m "feat: add chain ID and name to useWeb3 hook"
```

---

### Task 13: AppBar — show chain info

**Files:**
- Modify: `ui/src/components/AppBar.tsx`

- [ ] **Step 1: Add chain display to AppBar**

Destructure `chainId` and `chainName` from `useWeb3()`. Add a chain badge next to the account display.

After the green dot `<div>` and account span (around line 26-29), add:

```tsx
{chainName && (
  <div className="flex items-center gap-2 px-3 py-2 bg-accent rounded-lg text-sm">
    <span className="font-medium">{chainName}</span>
    <span className="text-muted-foreground">({chainId})</span>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add ui/src/components/AppBar.tsx
git commit -m "feat: display chain name and ID in AppBar"
```

---

### Task 14: Storage — add ComplianceRegistry type

**Files:**
- Modify: `ui/src/lib/storage.ts`

- [ ] **Step 1: Add DeployedComplianceRegistry type and methods**

Add after the `DeployedToken` interface (around line 23):

```typescript
export interface DeployedComplianceRegistry {
  address: string;
  name: string;
  bridgeSigner: string;
  policySAID: string;
  network: string;
  chainId: number;
  deployedAt: number;
}
```

Add methods to the `Storage` class (before the closing `}`):

```typescript
async getComplianceRegistries(): Promise<DeployedComplianceRegistry[]> {
  const registries = await this.get<DeployedComplianceRegistry[]>('complianceRegistries');
  return registries || [];
}

async addComplianceRegistry(registry: DeployedComplianceRegistry): Promise<void> {
  const registries = await this.getComplianceRegistries();
  registries.push(registry);
  return this.set('complianceRegistries', registries);
}

async removeComplianceRegistry(address: string): Promise<void> {
  const registries = await this.getComplianceRegistries();
  const filtered = registries.filter(r => r.address.toLowerCase() !== address.toLowerCase());
  return this.set('complianceRegistries', filtered);
}
```

- [ ] **Step 2: Commit**

```bash
git add ui/src/lib/storage.ts
git commit -m "feat: add ComplianceRegistry storage type"
```

---

### Task 15: Copy ABI to UI

**Files:**
- Create: `ui/public/contracts/ComplianceRegistry.json`

- [ ] **Step 1: Build the ABI extraction into the workflow**

After `npx hardhat compile`, the ABI lives at `artifacts/contracts/ComplianceRegistry.sol/ComplianceRegistry.json`. Copy the compiled artifact:

```bash
npx hardhat compile
cp artifacts/contracts/ComplianceRegistry.sol/ComplianceRegistry.json ui/public/contracts/ComplianceRegistry.json
```

- [ ] **Step 2: Commit**

```bash
git add ui/public/contracts/ComplianceRegistry.json
git commit -m "feat: add ComplianceRegistry ABI for UI"
```

---

### Task 16: useComplianceRegistry hook

**Files:**
- Create: `ui/src/hooks/useComplianceRegistry.ts`

- [ ] **Step 1: Write the hook**

```typescript
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import ComplianceRegistryArtifact from '../../public/contracts/ComplianceRegistry.json';

export interface VerificationEvent {
  wallet: string;
  policySAID: string;
  decisionId: string;
  expiry: bigint;
  blockNumber: number;
  transactionHash: string;
}

export function useComplianceRegistry(
  provider: ethers.BrowserProvider | null,
  signer: ethers.Signer | null,
  contractAddress: string | null
) {
  const [verificationEvents, setVerificationEvents] = useState<VerificationEvent[]>([]);
  const [bridgeSigner, setBridgeSigner] = useState<string | null>(null);
  const [policySAID, setPolicySAID] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (provider && contractAddress) {
      loadRegistryInfo();
      loadVerificationEvents();
    }
  }, [provider, contractAddress]);

  const loadRegistryInfo = async () => {
    if (!provider || !contractAddress) return;
    try {
      const contract = new ethers.Contract(contractAddress, ComplianceRegistryArtifact.abi, provider);
      setBridgeSigner(await contract.bridgeSigner());
      setPolicySAID(await contract.policySAID());
    } catch (e) {
      console.error("Error loading registry info:", e);
    }
  };

  const loadVerificationEvents = async () => {
    if (!provider || !contractAddress) return;
    setLoading(true);
    try {
      const contract = new ethers.Contract(contractAddress, ComplianceRegistryArtifact.abi, provider);
      const filter = contract.filters.WalletVerified();
      const events = await contract.queryFilter(filter);

      setVerificationEvents(
        events
          .filter((e): e is ethers.EventLog => 'args' in e)
          .map((e) => ({
            wallet: e.args.wallet,
            policySAID: e.args.policySAID,
            decisionId: e.args.decisionId,
            expiry: e.args.expiry,
            blockNumber: e.blockNumber,
            transactionHash: e.transactionHash,
          }))
      );
    } catch (e) {
      console.error("Error loading verification events:", e);
    } finally {
      setLoading(false);
    }
  };

  const deployRegistry = async (
    bridgeSignerAddr: string,
    policySAIDValue: string
  ): Promise<string> => {
    if (!signer) throw new Error("No signer available");
    const factory = new ethers.ContractFactory(
      ComplianceRegistryArtifact.abi,
      ComplianceRegistryArtifact.bytecode,
      signer
    );
    const contract = await factory.deploy(bridgeSignerAddr, policySAIDValue);
    await contract.waitForDeployment();
    return await contract.getAddress();
  };

  const submitVerification = async (
    policySAID_: string,
    wallet: string,
    expiry: bigint,
    decisionId: string,
    chainId: bigint,
    registry: string,
    v: number,
    r: string,
    s: string
  ): Promise<ethers.ContractTransactionReceipt> => {
    if (!signer || !contractAddress) throw new Error("No signer or contract");
    const contract = new ethers.Contract(contractAddress, ComplianceRegistryArtifact.abi, signer);
    const tx = await contract.verify(policySAID_, wallet, expiry, decisionId, chainId, registry, v, r, s);
    const receipt = await tx.wait();
    await loadVerificationEvents();
    return receipt;
  };

  return {
    verificationEvents,
    bridgeSigner,
    policySAID,
    loading,
    deployRegistry,
    submitVerification,
    reload: loadVerificationEvents,
  };
}
```

- [ ] **Step 2: Verify UI compiles**

```bash
cd ui && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add ui/src/hooks/useComplianceRegistry.ts
git commit -m "feat: add useComplianceRegistry hook"
```

---

### Task 17: Vite config — alias for root lib/

**Files:**
- Modify: `ui/vite.config.ts`

- [ ] **Step 1: Add alias for the root lib/ directory**

Add to the `resolve.alias` object:

```typescript
"@bridge": path.resolve(__dirname, "../lib"),
```

So the full alias section becomes:

```typescript
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
    "@bridge": path.resolve(__dirname, "../lib"),
  },
},
```

- [ ] **Step 2: Commit**

```bash
git add ui/vite.config.ts
git commit -m "chore: add @bridge alias for root lib/ in Vite config"
```

---

### Task 18: Compliance page

**Files:**
- Create: `ui/src/routes/Compliance.tsx`

- [ ] **Step 1: Write the Compliance page**

The page has three sections:
1. **Deploy** — form with bridge signer address + policySAID
2. **Verify** — paste signed representation JSON → submit to contract
3. **Event log** — list of WalletVerified events

```tsx
import { useState, useEffect } from 'react';
import { useWeb3 } from '@/hooks/useWeb3';
import { useComplianceRegistry, type VerificationEvent } from '@/hooks/useComplianceRegistry';
import { storage, type DeployedComplianceRegistry } from '@/lib/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Copy, Check, ExternalLink, ShieldCheck } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

function getBlockExplorerUrl(chainId: number, address: string): string | null {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io',
    11155111: 'https://sepolia.etherscan.io',
    8453: 'https://basescan.org',
    84532: 'https://sepolia.basescan.org',
  };
  const base = explorers[chainId];
  return base ? `${base}/address/${address}` : null;
}

export function Compliance() {
  const { provider, signer, isConnected, chainId, chainName } = useWeb3();
  const { theme } = useTheme();
  const [registries, setRegistries] = useState<DeployedComplianceRegistry[]>([]);
  const [selectedRegistry, setSelectedRegistry] = useState<string | null>(null);
  const [isDeployOpen, setIsDeployOpen] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployBridgeSigner, setDeployBridgeSigner] = useState('');
  const [deployPolicySAID, setDeployPolicySAID] = useState('');
  const [deployName, setDeployName] = useState('');
  const [verifyJson, setVerifyJson] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const {
    verificationEvents,
    bridgeSigner,
    policySAID,
    loading,
    deployRegistry,
    submitVerification,
  } = useComplianceRegistry(provider, signer, selectedRegistry);

  const bg = theme === 'dark' ? 'bg-slate-900' : 'bg-sky-50';

  useEffect(() => { loadRegistries(); }, []);

  const loadRegistries = async () => {
    const list = await storage.getComplianceRegistries();
    setRegistries(list);
    if (list.length > 0 && !selectedRegistry) setSelectedRegistry(list[0].address);
  };

  const handleDeploy = async () => {
    if (!signer || !deployBridgeSigner || !deployPolicySAID || !deployName) return;
    setDeploying(true);
    try {
      const address = await deployRegistry(deployBridgeSigner, deployPolicySAID);
      const network = await provider?.getNetwork();
      await storage.addComplianceRegistry({
        address,
        name: deployName,
        bridgeSigner: deployBridgeSigner,
        policySAID: deployPolicySAID,
        network: network?.name || 'unknown',
        chainId: Number(network?.chainId) || 0,
        deployedAt: Date.now(),
      });
      await loadRegistries();
      setSelectedRegistry(address);
      setIsDeployOpen(false);
      setDeployName('');
      setDeployBridgeSigner('');
      setDeployPolicySAID('');
    } catch (e: any) {
      alert(`Deploy failed: ${e.message}`);
    } finally {
      setDeploying(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyJson.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const rep = JSON.parse(verifyJson);
      await submitVerification(
        rep.policySAID, rep.wallet, BigInt(rep.expiry), rep.decisionId,
        BigInt(rep.chainId), rep.registry, rep.v, rep.r, rep.s
      );
      setVerifyResult('Verification successful');
      setVerifyJson('');
    } catch (e: any) {
      setVerifyResult(`Failed: ${e.reason || e.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleCopy = async (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleDelete = async (address: string) => {
    if (confirm('Remove this registry from the list?')) {
      await storage.removeComplianceRegistry(address);
      if (selectedRegistry === address) setSelectedRegistry(null);
      await loadRegistries();
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground text-lg">Please connect your wallet to continue</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Compliance Registry</h2>
          <p className="text-muted-foreground">
            Deploy registries and verify JWT-based compliance decisions on-chain
          </p>
        </div>
        <Dialog open={isDeployOpen} onOpenChange={setIsDeployOpen}>
          <DialogTrigger asChild>
            <Button className="cursor-pointer" variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Deploy New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deploy Compliance Registry</DialogTitle>
              <DialogDescription>
                Deploy a new registry with a bridge signer and policy SAID.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <input type="text" className="w-full p-2 border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600" placeholder="e.g., Production Registry" value={deployName} onChange={(e) => setDeployName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Bridge Signer Address</label>
                <input type="text" className="w-full p-2 border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 font-mono text-sm" placeholder="0x..." value={deployBridgeSigner} onChange={(e) => setDeployBridgeSigner(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Policy SAID (bytes32)</label>
                <input type="text" className="w-full p-2 border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 font-mono text-sm" placeholder="0x..." value={deployPolicySAID} onChange={(e) => setDeployPolicySAID(e.target.value)} />
              </div>
              <Button onClick={handleDeploy} disabled={deploying || !deployName || !deployBridgeSigner || !deployPolicySAID} className="w-full">
                {deploying ? 'Deploying...' : 'Deploy Registry'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Registry list */}
        <Card className={`md:col-span-1 ${bg}`}>
          <CardHeader>
            <CardTitle>Deployed Registries</CardTitle>
            <CardDescription>Select a registry to manage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {registries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No registries deployed yet</p>
            ) : registries.map((reg) => {
              const explorerUrl = getBlockExplorerUrl(reg.chainId, reg.address);
              return (
                <div key={reg.address} className={`group flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedRegistry === reg.address ? 'border-primary bg-accent' : 'hover:bg-accent'}`} onClick={() => setSelectedRegistry(reg.address)}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{reg.name}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{reg.address.substring(0, 10)}...</p>
                    <p className="text-xs text-muted-foreground truncate">Policy: {reg.policySAID.substring(0, 10)}...</p>
                    {explorerUrl && (
                      <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                        Explorer <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100" onClick={(e) => handleCopy(reg.address, e)}>
                      {copiedAddress === reg.address ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(reg.address); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Registry details */}
        <div className="md:col-span-2 space-y-6">
          {/* Info */}
          {selectedRegistry && (
            <Card className={bg}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Registry Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Address:</span> <span className="font-mono">{selectedRegistry}</span></div>
                <div><span className="text-muted-foreground">Bridge Signer:</span> <span className="font-mono">{bridgeSigner || '...'}</span></div>
                <div><span className="text-muted-foreground">Policy SAID:</span> <span className="font-mono break-all">{policySAID || '...'}</span></div>
                <div><span className="text-muted-foreground">Chain:</span> {chainName} ({chainId})</div>
              </CardContent>
            </Card>
          )}

          {/* Verify */}
          {selectedRegistry && (
            <Card className={bg}>
              <CardHeader>
                <CardTitle>Submit Verification</CardTitle>
                <CardDescription>Paste a signed representation JSON from the bridge</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <textarea className="w-full h-40 p-3 border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 font-mono text-xs" placeholder='{"policySAID":"0x...","wallet":"0x...","expiry":"...","decisionId":"0x...","chainId":"...","registry":"0x...","v":...,"r":"0x...","s":"0x..."}' value={verifyJson} onChange={(e) => setVerifyJson(e.target.value)} />
                <div className="flex items-center gap-4">
                  <Button onClick={handleVerify} disabled={verifying || !verifyJson.trim()}>
                    {verifying ? 'Verifying...' : 'Submit Verification'}
                  </Button>
                  {verifyResult && (
                    <span className={`text-sm ${verifyResult.startsWith('Failed') ? 'text-red-600' : 'text-green-600'}`}>
                      {verifyResult}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Event log */}
          {selectedRegistry && (
            <Card className={bg}>
              <CardHeader>
                <CardTitle>Verification Events</CardTitle>
                <CardDescription>{loading ? 'Loading...' : `${verificationEvents.length} verification(s)`}</CardDescription>
              </CardHeader>
              <CardContent>
                {verificationEvents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No verifications yet</p>
                ) : (
                  <div className="space-y-2">
                    {verificationEvents.map((evt, i) => (
                      <div key={i} className="p-3 rounded-lg border">
                        <p className="font-mono text-sm">{evt.wallet}</p>
                        <p className="text-xs text-muted-foreground">
                          Decision: {evt.decisionId.substring(0, 18)}... | Block: {evt.blockNumber}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!selectedRegistry && (
            <Card className={bg}>
              <CardContent className="py-12">
                <p className="text-muted-foreground text-center">Select a registry to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add ui/src/routes/Compliance.tsx
git commit -m "feat: add Compliance Registry page"
```

---

### Task 19: Wire up routes and sidebar

**Files:**
- Modify: `ui/src/App.tsx`
- Modify: `ui/src/components/Sidebar.tsx`

- [ ] **Step 1: Add Compliance route to App.tsx**

Add import:
```typescript
import { Compliance } from './routes/Compliance';
```

Add route after the governance route:
```tsx
<Route path="compliance" element={<Compliance />} />
```

Change the default redirect from `/governance` to `/compliance`:
```tsx
<Route index element={<Navigate to="/compliance" replace />} />
```

- [ ] **Step 2: Update Sidebar**

Add `ShieldCheck` to the lucide-react imports.

Add the Compliance nav item to the beginning of `navItems`:
```typescript
{
  path: '/compliance',
  label: 'Compliance',
  icon: ShieldCheck,
},
```

- [ ] **Step 3: Verify UI compiles and runs**

```bash
cd ui && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add ui/src/App.tsx ui/src/components/Sidebar.tsx
git commit -m "feat: wire up Compliance route and sidebar navigation"
```

---

### Task 20: Update Governance page explorer links

**Files:**
- Modify: `ui/src/routes/Governance.tsx`

- [ ] **Step 1: Add Base network explorers**

Update the `getBlockExplorerUrl` function's `explorers` map (around line 15-21) to include Base networks:

```typescript
const explorers: Record<number, string> = {
  1: 'https://etherscan.io',
  11155111: 'https://sepolia.etherscan.io',
  8453: 'https://basescan.org',
  84532: 'https://sepolia.basescan.org',
  31337: '', // local — no explorer
};
```

- [ ] **Step 2: Commit**

```bash
git add ui/src/routes/Governance.tsx
git commit -m "fix: add Base network explorer links to Governance page"
```

---

### Task 21: Final verification

- [ ] **Step 1: Run all tests**

```bash
make test
```

Expected: All tests pass (contract, bridge, integration, and existing GovernanceToken/Token tests).

- [ ] **Step 2: Verify UI builds**

```bash
make build-ui
```

Expected: Build succeeds.

- [ ] **Step 3: Run full integration test**

```bash
make test-integration
```

Expected: Both `compliance-flow.test.js` and `allowlist-flow.test.js` pass.

- [ ] **Step 4: Final commit if any uncommitted changes**

```bash
git status
# If clean, nothing to do. Otherwise stage and commit.
```
