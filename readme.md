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
