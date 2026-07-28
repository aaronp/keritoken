# Bridge Debug Clipboard Flow — Design Spec

> **Goal:** Add a "Bridge Debug" section to the Compliance page that lets users generate signing requests, copy them to an external signing app (kerits), and paste back signatures for on-chain submission.

## Architecture

The UI computes the same EIP-191 prefixed hash that the ComplianceRegistry contract will verify. The user copies this hash, signs it externally with their secp256k1 key in kerits, and pastes the signature back. The UI splits v/r/s and submits to the contract.

No backend. No bridge service. Pure client-side digest computation + manual clipboard signing.

## Components

### 1. Bridge Debug Card (UI)

New card on the Compliance page, between Registry Details and Submit Verification. Visible only when a registry is selected.

**Fields (pre-filled where possible):**

| Field | Source | Editable |
|-------|--------|----------|
| policySAID | Selected registry | No |
| wallet | Connected MetaMask address | Yes |
| expiry | Now + 1 hour (unix seconds: `Math.floor(Date.now()/1000) + 3600`) | Yes |
| decisionId | Random `bytes32` | Yes (regenerate button) |
| chainId | MetaMask | No |
| registry | Selected registry address | No |

**Flow:**

1. User reviews/edits fields, clicks **Generate**
2. UI computes:
   - `digest = keccak256(abi.encodePacked(policySAID, wallet, expiry, decisionId, chainId, registry))`
   - `prefixedHash = keccak256("\x19Ethereum Signed Message:\n32" + digest)`
3. Debug panel displays all six input field values plus both intermediate hashes (digest, prefixed hash)
4. **Copy Hash** button copies the prefixed hash hex string to clipboard
5. User signs in kerits, pastes 65-byte hex signature back
6. UI extracts v/r/s, shows assembled signed representation JSON
7. **Submit to Contract** button calls `verify()` on the selected registry

### 2. Digest Utility (client-side)

A small function in `ui/src/lib/compliance-digest.ts`:

```typescript
import { ethers } from "ethers";

export interface CompactRepFields {
  policySAID: string;
  wallet: string;
  expiry: bigint;
  decisionId: string;
  chainId: bigint;
  registry: string;
}

export function computeDigest(fields: CompactRepFields): {
  digest: string;
  prefixedHash: string;
} {
  const digest = ethers.keccak256(
    ethers.solidityPacked(
      ["bytes32", "address", "uint64", "bytes32", "uint256", "address"],
      [fields.policySAID, fields.wallet, fields.expiry, fields.decisionId, fields.chainId, fields.registry]
    )
  );
  const prefixedHash = ethers.hashMessage(ethers.getBytes(digest));
  return { digest, prefixedHash };
}

export function splitSignature(sigHex: string): { v: number; r: string; s: string } {
  const { v, r, s } = ethers.Signature.from(sigHex);
  return { v, r, s };
}
```

### 3. Kerits Signing Spec

Minimal interface contract between the two apps:

**Input:** A 32-byte hex string (EIP-191 prefixed hash), e.g.:
```
0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

**Operation:** Sign the raw 32-byte value using ECDSA over secp256k1. The input is already the final message hash — it must be fed directly to the ECDSA signing algorithm as `z` with **no additional hashing** (no SHA-256, no keccak256, no further transformation). Use your library's "sign prehash" or "sign digest" function, not "sign message".

**Output:** A 65-byte hex signature in compact format (r || s || v), e.g.:
```
0x<r: 32 bytes><s: 32 bytes><v: 1 byte>
```

The v byte may be 0, 1, 27, or 28. The UI normalizes 0→27 and 1→28 automatically. This matches the Ethereum signature convention.

**Important:** The signing key must correspond to the `bridgeSigner` address stored in the ComplianceRegistry contract. This is NOT the MetaMask wallet — the wallet field is the address being granted compliance status.

**Verification:** The Ethereum address derived from `ecrecover(prefixedHash, v, r, s)` must match the bridge signer address stored in the ComplianceRegistry contract.

## File Changes

| Action | File | Purpose |
|--------|------|---------|
| Create | `ui/src/lib/compliance-digest.ts` | Digest computation + signature splitting |
| Modify | `ui/src/routes/Compliance.tsx` | Add Bridge Debug card |
| Create | `docs/kerits-signing-spec.md` | Signing interface spec for kerits app |

## What Doesn't Change

- `contracts/ComplianceRegistry.sol` — no contract changes
- `lib/bridge.ts` — bridge library unchanged (this is the manual equivalent)
- Existing deploy/verify UI sections — unchanged
- Test suite — unchanged (this is UI-only)
