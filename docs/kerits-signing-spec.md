# Kerits Signing Spec

Interface contract for signing ComplianceRegistry verification requests.

## Input

A 32-byte hex string — the EIP-191 prefixed hash of a compact representation.

Example:
```
0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

This hash is already fully prepared (keccak256 of the EIP-191 prefix + inner digest). **Do not hash or prefix it further.**

## Signing

Sign the raw 32-byte hash using ECDSA over secp256k1. The input is the final message hash — feed it directly to the ECDSA signing algorithm with **no additional hashing** (no SHA-256, no keccak256). Use your library's "sign prehash" / "sign digest" function, not "sign message".

```
hash_bytes = decode_hex(input)           // 32 bytes
signature  = secp256k1_sign_prehash(private_key, hash_bytes)
```

The signing key must correspond to the `bridgeSigner` Ethereum address stored in the target ComplianceRegistry contract.

## Output

A 65-byte hex signature in Ethereum format:

```
0x<r: 32 bytes><s: 32 bytes><v: 1 byte>
```

- `r` — 32 bytes, the x-coordinate of the ephemeral public key
- `s` — 32 bytes, the signature proof
- `v` — 1 byte, recovery id: **27 or 28** (Ethereum convention). Raw values 0 or 1 are also accepted — the UI normalizes 0→27 and 1→28.

Example:
```
0x1234...abcd1b
```
(130 hex characters + `0x` prefix = 132 characters total)

## Verification

The signer's Ethereum address (derived from their secp256k1 public key) must match the `bridgeSigner` address stored in the target ComplianceRegistry contract. You can check this by running `ecrecover(hash, v, r, s)` and comparing the result.

## How the Hash is Computed

For reference, the keritoken UI computes the hash as:

```
inner_digest = keccak256(abi.encodePacked(
    policySAID,   // bytes32
    wallet,       // address
    expiry,       // uint64
    decisionId,   // bytes32
    chainId,      // uint256
    registry      // address
))

prefixed_hash = keccak256("\x19Ethereum Signed Message:\n32" || inner_digest)
```

The `prefixed_hash` is what you receive as input. The inner digest and field values are shown in the UI's debug panel for inspection.
