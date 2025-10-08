# Contract Testing DSL

A Domain-Specific Language for testing governance tokens and allowlist-controlled ERC20 tokens.

## Overview

This DSL provides:
- **Simple deployment helpers** for quick test setup
- **Contract wrapper classes** for ergonomic interaction
- **Event utilities** for reading and auditing on-chain events
- **Error constants** for consistent error checking
- **Shared with UI** - Same code works in tests and frontend

## Quick Start

```javascript
const { setupScenario } = require('./helpers/dsl');
const { GovernanceContract, TokenContract } = require('./helpers/contracts');
const ERRORS = require('./helpers/errors');

// Setup complete test scenario
const { governance, token, owner, user1, user2 } = await setupScenario();

// Wrap with convenience classes
const gov = new GovernanceContract(governance);
const tok = new TokenContract(token);

// Whitelist and mint
await gov.whitelist(user1.address, "KYC-001");
await tok.mint(user1.address, "1000");

// Transfer
await tok.transfer(user1, user2.address, "100");

// Verify balance
const balance = await tok.balanceOf(user2.address);
expect(balance).to.equal("100.0");
```

## Core Functions

### Deployment (`dsl.js`)

```javascript
const { deployGovernance, deployToken, setupScenario } = require('./helpers/dsl');

// Deploy governance token
const governance = await deployGovernance();

// Deploy token linked to governance
const token = await deployToken(governance);

// Or setup everything at once
const scenario = await setupScenario();
// Returns: { governance, token, owner, user1, user2, user3, users }
```

### Whitelist Management

```javascript
const { whitelistAddress, removeAddress, isWhitelisted } = require('./helpers/dsl');

// Add to whitelist
await whitelistAddress(governance, user1.address, "KYC-12345");

// Check whitelist status
const whitelisted = await isWhitelisted(governance, user1.address);

// Remove from whitelist
await removeAddress(governance, user1.address, "Account suspended");
```

### Token Operations

```javascript
const { mintTokens, transferTokens, getBalance } = require('./helpers/dsl');

// Mint tokens
await mintTokens(token, user1.address, "1000");

// Transfer tokens
await transferTokens(token, user1, user2.address, "250");

// Get balance
const balance = await getBalance(token, user2.address); // Returns "250.0"
```

## Contract Wrappers

### GovernanceContract

```javascript
const { GovernanceContract } = require('./helpers/contracts');

const gov = new GovernanceContract(governance);

// Whitelist management
await gov.whitelist(address, "referenceId");
await gov.remove(address, "reason");
const isWhitelisted = await gov.isWhitelisted(address);

// Event reading
const whitelist = await gov.getWhitelist(); // Current whitelist from events
const added = await gov.getAddedEvents(); // All AddressAdded events
const removed = await gov.getRemovedEvents(); // All AddressRemoved events

// Audit trail
const audit = await gov.getAuditTrail(address);
// Returns: { address, isCurrentlyWhitelisted, events, addCount, removeCount }
```

### TokenContract

```javascript
const { TokenContract } = require('./helpers/contracts');

const tok = new TokenContract(token);

// Token operations
await tok.mint(address, "100");
await tok.transfer(fromSigner, toAddress, "50");

// Balances
const balance = await tok.balanceOf(address); // "50.0"
const supply = await tok.totalSupply(); // "100.0"

// Event reading
const holders = await tok.getHolders(); // All holders with balances
const transfers = await tok.getTransfers(); // All transfer events
```

## Event Utilities

### Reading Events (`events.js`)

```javascript
const events = require('./helpers/events');

// Get AddressAdded events
const added = await events.getAddressAddedEvents(governance, {
  address: user1.address, // Optional filter
  fromBlock: 0,
  toBlock: 'latest'
});
// Returns: [{ walletAddress, referenceId, blockNumber, transactionHash }]

// Get current whitelist (computed from events)
const whitelist = await events.getCurrentWhitelist(governance);
// Returns: [{ address, referenceId, addedBlock }]

// Get token holders (computed from Transfer events)
const holders = await events.getTokenHolders(token);
// Returns: [{ address, balance, balanceFormatted }]

// Get audit trail
const audit = await events.getAuditTrail(governance, user1.address);
// Returns: { address, isCurrentlyWhitelisted, events, addCount, removeCount }
```

### Event Mapping

Map wallet addresses to reference IDs:

```javascript
const whitelist = await gov.getWhitelist();
const refMap = {};
whitelist.forEach(entry => {
  refMap[entry.address] = entry.referenceId;
});

console.log(refMap[user1.address]); // "KYC-001"
```

## Error Handling

```javascript
const ERRORS = require('./helpers/errors');

// Use constants for consistent error checking
await expect(
  tok.mint(user1.address, "100")
).to.be.revertedWith(ERRORS.RECIPIENT_NOT_WHITELISTED);

// Available errors:
// - RECIPIENT_NOT_WHITELISTED
// - SENDER_NOT_WHITELISTED
// - ALREADY_WHITELISTED
// - NOT_WHITELISTED
// - ZERO_ADDRESS
// - INVALID_GOVERNANCE
// - UNAUTHORIZED
```

## Test Patterns

### Happy Path

```javascript
it("Should allow transfer when all parties are whitelisted", async function () {
  const { governance, token, user1, user2 } = await setupScenario();
  const gov = new GovernanceContract(governance);
  const tok = new TokenContract(token);

  await gov.whitelist(user1.address, "USER-1");
  await gov.whitelist(user2.address, "USER-2");
  await tok.mint(user1.address, "1000");
  await tok.transfer(user1, user2.address, "100");

  expect(await tok.balanceOf(user2.address)).to.equal("100.0");
});
```

### Failure Cases

```javascript
it("Should fail when recipient not whitelisted", async function () {
  const { governance, token, user1, user2 } = await setupScenario();
  const gov = new GovernanceContract(governance);
  const tok = new TokenContract(token);

  await gov.whitelist(user1.address, "USER-1");
  await tok.mint(user1.address, "1000");

  // user2 NOT whitelisted - should fail
  await expect(
    tok.transfer(user1, user2.address, "100")
  ).to.be.revertedWith(ERRORS.RECIPIENT_NOT_WHITELISTED);
});
```

### Dynamic Whitelist

```javascript
it("Should handle dynamic whitelist changes", async function () {
  const { governance, token, user1, user2 } = await setupScenario();
  const gov = new GovernanceContract(governance);
  const tok = new TokenContract(token);

  // Whitelist both
  await gov.whitelist(user1.address, "USER-1");
  await gov.whitelist(user2.address, "USER-2");
  await tok.mint(user1.address, "1000");

  // Transfer works
  await tok.transfer(user1, user2.address, "100");

  // Remove user2
  await gov.remove(user2.address, "Suspended");

  // Transfer now fails
  await expect(
    tok.transfer(user1, user2.address, "100")
  ).to.be.revertedWith(ERRORS.RECIPIENT_NOT_WHITELISTED);

  // Re-add user2
  await gov.whitelist(user2.address, "Re-verified");

  // Transfer works again
  await tok.transfer(user1, user2.address, "100");
  expect(await tok.balanceOf(user2.address)).to.equal("200.0");
});
```

### Audit Trail Verification

```javascript
it("Should track complete audit trail", async function () {
  const { governance, user1 } = await setupScenario();
  const gov = new GovernanceContract(governance);

  await gov.whitelist(user1.address, "Initial-KYC");
  await gov.remove(user1.address, "Suspended");
  await gov.whitelist(user1.address, "Re-verified");

  const audit = await gov.getAuditTrail(user1.address);

  expect(audit.events).to.have.lengthOf(3);
  expect(audit.events[0].type).to.equal("ADDED");
  expect(audit.events[0].referenceId).to.equal("Initial-KYC");
  expect(audit.events[1].type).to.equal("REMOVED");
  expect(audit.events[2].type).to.equal("ADDED");
  expect(audit.isCurrentlyWhitelisted).to.be.true;
});
```

## Using in UI

The same DSL works in the UI with ethers.js `BrowserProvider`:

```typescript
import { GovernanceContract, TokenContract } from '@/lib/contracts';
import { ethers } from 'ethers';

// Connect to MetaMask
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Create contract instances
const gov = new GovernanceContract(governanceAddress, signer);
const tok = new TokenContract(tokenAddress, signer);

// Use same API as in tests
await gov.whitelist(address, "KYC-001");
await tok.mint(address, "1000");

// Read events
const whitelist = await gov.getWhitelist();
const holders = await tok.getHolders();
```

## Makefile Commands

```bash
# Compile contracts
make compile

# Run integration tests
make test-integration

# Start local network in background
make network-start

# Stop local network
make network-stop

# Run tests on local network
make test-with-network

# Start foreground network (for debugging)
make node
```

## Best Practices

1. **Use `setupScenario()`** for most tests - it's the fastest way to get started
2. **Use wrapper classes** for cleaner test code and better ergonomics
3. **Use error constants** for consistent error checking
4. **Read events** to verify on-chain state and build audit trails
5. **Test failure cases** - they're just as important as happy paths
6. **Use meaningful referenceIds** - they show up in audit trails

## Architecture

```
test/helpers/
├── dsl.js           # Core deployment and operation functions
├── contracts.js     # GovernanceContract and TokenContract wrappers
├── events.js        # Event reading and audit utilities
├── errors.js        # Error message constants
└── README.md        # This file

test/integration/
└── allowlist-flow.test.js  # Integration test examples

ui/src/lib/
└── contracts.ts     # TypeScript version for UI (same API)
```

## Example: Complete Integration Test

```javascript
const { expect } = require("chai");
const { setupScenario } = require("./helpers/dsl");
const { GovernanceContract, TokenContract } = require("./helpers/contracts");
const ERRORS = require("./helpers/errors");

describe("Token Allowlist Flow", function () {
  it("Should enforce allowlist for all operations", async function () {
    // Setup
    const { governance, token, user1, user2, user3 } = await setupScenario();
    const gov = new GovernanceContract(governance);
    const tok = new TokenContract(token);

    // Whitelist user1 and user2
    await gov.whitelist(user1.address, "alice@example.com");
    await gov.whitelist(user2.address, "bob@example.com");

    // Mint to user1
    await tok.mint(user1.address, "1000");

    // Transfer to user2 (both whitelisted - works)
    await tok.transfer(user1, user2.address, "300");
    expect(await tok.balanceOf(user2.address)).to.equal("300.0");

    // Try transfer to user3 (not whitelisted - fails)
    await expect(
      tok.transfer(user1, user3.address, "100")
    ).to.be.revertedWith(ERRORS.RECIPIENT_NOT_WHITELISTED);

    // Remove user2 from whitelist
    await gov.remove(user2.address, "Account closed");

    // user2 can't send anymore
    await expect(
      tok.transfer(user2, user1.address, "100")
    ).to.be.revertedWith(ERRORS.SENDER_NOT_WHITELISTED);

    // Verify audit trail
    const whitelist = await gov.getWhitelist();
    expect(whitelist).to.have.lengthOf(1); // Only user1
    expect(whitelist[0].address).to.equal(user1.address);
    expect(whitelist[0].referenceId).to.equal("alice@example.com");
  });
});
```

This DSL makes it easy to write comprehensive, readable tests that verify both success and failure cases while maintaining a complete audit trail of all whitelist changes.
