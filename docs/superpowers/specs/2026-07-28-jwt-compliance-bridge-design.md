# JWT Compliance Bridge — PoC Design

## Goal

Prove that an off-chain bridge service can translate standard JWTs into EVM-verifiable signed representations, and that a Solidity compliance registry can verify those representations on-chain.

## Scope

This PoC covers two components:

1. **Bridge** — TypeScript library + UI that validates a JWT and produces a secp256k1-signed representation of its claims.
2. **ComplianceRegistry** — Solidity contract that verifies the bridge's signature, validates claims, and records used decision IDs for replay protection.

Out of scope: token integration (`CompliantToken`, `transferWithData`), multi-policy registries, key rotation registries (JWKS), non-ES256K JWT algorithms.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐
│  JWT Issuer  │────▶│    Bridge    │────▶│ ComplianceRegistry  │
│  (off-chain) │     │  (off-chain) │     │    (on-chain)       │
└─────────────┘     └──────────────┘     └─────────────────────┘

1. Issuer signs JWT (ES256K) with claims including policySAID, wallet, expiry
2. Bridge validates JWT, extracts claims, signs compact representation with bridge key
3. Anyone submits signed representation to ComplianceRegistry
4. Contract recovers signer via ecrecover, validates claims, marks decisionId used
```

## JWT Structure

The issuer produces a standard JWT (ES256K) with these claims:

```json
{
  "iss": "<issuerIdentifier>",
  "sub": "0x<walletAddress>",
  "aud": "0x<complianceRegistryAddress>",
  "exp": 1720000000,
  "iat": 1719000000,
  "jti": "0x<bytes32DecisionId>",
  "policySAID": "0x<bytes32PolicyId>",
  "chainId": 31337
}
```

## Signed Representation

The bridge produces a compact, EVM-friendly message:

```
message = abi.encodePacked(
    policySAID,    // bytes32
    wallet,        // address
    expiry,        // uint64
    decisionId,    // bytes32
    chainId,       // uint256
    registry       // address
)

digest = keccak256(message)
ethSignedDigest = keccak256("\x19Ethereum Signed Message:\n32" + digest)
signature = ecSign(ethSignedDigest, bridgePrivateKey) → (v, r, s)
```

The bridge uses EIP-191 personal-sign prefixing. The contract recovers the signer using OpenZeppelin's `ECDSA.recover` (which expects the EIP-191 prefix). This prevents cross-domain signature reuse.

**The `abi.encodePacked` field ordering is canonical.** Both the bridge TypeScript and the Solidity contract must use this exact field order — any reordering silently produces different digests.

Output struct:

```
{
  policySAID:  bytes32,
  wallet:      address,
  expiry:      uint64,
  decisionId:  bytes32,
  chainId:     uint256,
  registry:    address,
  v:           uint8,
  r:           bytes32,
  s:           bytes32
}
```

## Component 1: Bridge

### Library (`lib/bridge.ts`)

```typescript
interface BridgeInput {
  jwt: string;              // raw JWT string
  bridgePrivateKey: string; // secp256k1 private key (hex)
}

interface SignedRepresentation {
  policySAID: string;   // bytes32 hex
  wallet: string;       // address
  expiry: bigint;       // uint64
  decisionId: string;   // bytes32 hex
  chainId: bigint;      // uint256
  registry: string;     // address
  v: number;
  r: string;            // bytes32 hex
  s: string;            // bytes32 hex
}

function bridgeJwt(input: BridgeInput): SignedRepresentation
```

The `registry` address is extracted from the JWT `aud` claim. The mapping is: `iss` → bridge validates off-chain only, `sub` → `wallet`, `aud` → `registry`, `exp` → `expiry`, `jti` → `decisionId`, `policySAID` → `policySAID`, `chainId` → `chainId`.

Steps:
1. Decode JWT header and payload (base64url)
2. Verify JWT signature (ES256K) against issuer's public key
3. Validate: `exp > now`, required fields present
4. Extract claims into the struct fields (see mapping above)
5. Compute `keccak256(abi.encodePacked(...))` of the claims
6. Apply EIP-191 prefix and sign with the bridge private key
7. Return the signed representation

### Issuer Key Management

For the PoC, the bridge is constructed with the JWT issuer's public key (to verify incoming JWTs) and the bridge's own private key (to sign representations). Both come from environment/config.

```typescript
interface BridgeConfig {
  issuerPublicKey: string;   // ES256K public key for JWT verification
  bridgePrivateKey: string;  // secp256k1 key for signing representations
}
```

### UI

A single page added to the existing UI at `/compliance` (or integrated into the renamed Governance page):

- **Input:** Paste JWT text area
- **Output:** Decoded claims (read-only), signed representation (hex, copyable)
- **Errors:** Invalid JWT, expired, missing fields
- **Display:** Connected chain name, bridge signer address

For the PoC, the bridge private key is held client-side (from a config/env variable injected at build time or pasted into the UI). In production, the bridge would run server-side.

## Component 2: ComplianceRegistry.sol

Solidity `^0.8.20` (matching existing project configuration). Inherits OpenZeppelin `Ownable(msg.sender)` and uses OpenZeppelin `ECDSA` for signature recovery.

### Constructor

```solidity
constructor(address bridgeSigner_, bytes32 policySAID_) Ownable(msg.sender)
```

- `bridgeSigner_`: Ethereum address of the bridge's signing key
- `policySAID_`: The policy identifier this registry enforces

### State

```solidity
address public bridgeSigner;
bytes32 public policySAID;
mapping(bytes32 => bool) public usedDecisionIds;
```

### Core Function

```solidity
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
) external returns (bool)
```

**Access control:** Anyone may call `verify`. The function validates the cryptographic proof regardless of `msg.sender`. This is by design — the signed representation is self-authenticating. Front-running is not a concern: if an attacker submits a valid representation, the `decisionId` is consumed and the `WalletVerified` event is emitted for the correct wallet. The attacker gains nothing; the wallet is verified either way.

**Return behaviour:** `verify` always either returns `true` or reverts. There is no `false` return path.

Verification steps:
1. Compute `digest = keccak256(abi.encodePacked(policySAID_, wallet, expiry, decisionId, chainId_, registry))`
2. Apply EIP-191 prefix: `ethSignedDigest = ECDSA.toEthSignedMessageHash(digest)`
3. `ECDSA.recover(ethSignedDigest, v, r, s)` → must equal `bridgeSigner`
4. `policySAID_` must equal `policySAID`
5. `registry` must equal `address(this)`
6. `chainId_` must equal `block.chainid`
7. `expiry` must be > `block.timestamp`
8. `decisionId` must not be in `usedDecisionIds`
9. Mark `decisionId` as used
10. Emit `WalletVerified(wallet, policySAID_, decisionId, expiry)` event
11. Return `true`

### Owner Functions

```solidity
function rotateSigner(address newSigner) external onlyOwner
```

### Events

```solidity
event WalletVerified(address indexed wallet, bytes32 indexed policySAID, bytes32 decisionId, uint64 expiry);
event SignerRotated(address indexed oldSigner, address indexed newSigner);
```

## Testing

### Bridge Tests (TypeScript, Hardhat/Mocha)

| Test | Input | Expected |
|------|-------|----------|
| Valid JWT → signed representation | Well-formed JWT signed by known key | Correct struct, valid signature |
| Expired JWT | JWT with `exp` in the past | Rejection |
| Tampered JWT | Modified payload, original signature | Rejection |
| Wrong issuer key | JWT signed by unknown key | Rejection |
| Missing required claims | JWT without `policySAID` | Rejection |

### Registry Tests (Solidity, Hardhat)

| Test | Input | Expected |
|------|-------|----------|
| Valid signed representation | Bridge-signed struct | `verify` returns true, event emitted |
| Wrong signer | Signed by non-bridge key | Revert |
| Wrong policySAID | Mismatched policy | Revert |
| Wrong chainId | Different chain | Revert |
| Wrong registry address | Different address | Revert |
| Expired | `expiry` < block.timestamp | Revert |
| Replay | Same `decisionId` twice | Second call reverts |
| Signer rotation | Rotate then verify with new signer | Succeeds |

### Integration Tests

End-to-end flow:
1. Generate JWT with known issuer key
2. Bridge produces signed representation
3. Deploy ComplianceRegistry with bridge address and policySAID
4. Submit signed representation to contract
5. Verify it succeeds
6. Replay same representation → fails
7. Submit expired representation → fails

## UI Updates

### Renamed Pages

- **Governance → Compliance Registry** — deploy registry, submit signed representations, view verification results
- **Tokens** — unchanged for now (existing functionality preserved)

### Compliance Registry Page

- **Deploy section:** bridge signer address + policySAID → deploy
- **Verify section:** paste signed representation (or paste JWT if bridge is integrated) → submit → show result
- **Info display:** chain name, chain ID, policySAID, bridge signer, explorer links
- **Event log:** list of `WalletVerified` events for the deployed registry

### Global UI

- Connected chain name and ID shown in the app bar
- Block explorer links adapt to connected network

## Makefile

```makefile
# Run all tests (bridge + contract, local hardhat)
make test

# Run only bridge library tests
make test-bridge

# Run only contract tests
make test-contract

# Run integration tests (end-to-end: JWT → bridge → contract)
make test-integration

# Deploy contracts to a specific network
make deploy NETWORK=localhost
make deploy NETWORK=baseSepolia
make deploy NETWORK=base

# Start local hardhat node
make node

# Build and dev UI
make build-ui
make dev
```

The `NETWORK` variable selects the Hardhat network (default: `localhost`). `.env` supplies RPC URLs and keys.

## Cleanup

- Rename root `package.json` from `bond-auction` to `keritoken`
- Create `jwt-compliance` branch for this work
- Update README with clear Makefile usage examples

## Known Limitations

- **`iss` not verified on-chain.** The JWT issuer claim is validated by the bridge off-chain but does not appear in the signed representation or on-chain verification. This means on-chain there is no proof of _which_ issuer made the compliance decision — only that the bridge approved it. Multi-issuer traceability requires the future JwksKeyRegistry design.
- **`decisionId` serves dual duty** as both a semantic identifier (which compliance decision) and replay protection nonce. In production these concepts may need separation.
- **Bridge private key client-side** in the PoC. Production deployment would run the bridge server-side.

## Bridge Library Location

The bridge library lives at `lib/bridge.ts` at the project root (alongside `contracts/`). This location allows it to be imported by both Hardhat tests and the UI build. The UI's Vite config may need an alias or symlink to resolve imports from outside `ui/src/`.

## Future Work (Out of Scope)

- **CompliantToken** with `transferWithData` / `mintWithData`
- **Multi-policy registries** — `mapping(bytes32 policySAID => ...)`
- **JwksKeyRegistry** — separate contract for issuer key management
- **Non-ES256K algorithms** — Ed25519, RS256 via the bridge abstraction
- **Bridge as HTTP service** — currently a library, could become a standalone service
