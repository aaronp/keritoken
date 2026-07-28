# Bridge Debug Clipboard Flow — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Bridge Debug section to the Compliance page for clipboard-based signing with the kerits app.

**Architecture:** A client-side digest utility (`compliance-digest.ts`) computes the same EIP-191 hash the contract verifies. The Compliance page gets a new card with generate/copy/paste/submit flow. No backend changes, no contract changes.

**Tech Stack:** React 19, ethers.js 6, Vite, TypeScript

**Spec:** `docs/superpowers/specs/2026-07-28-bridge-debug-clipboard-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `ui/src/lib/compliance-digest.ts` | Digest computation + signature splitting |
| Create | `test/compliance-digest.test.js` | Verify digest matches contract logic |
| Modify | `ui/src/routes/Compliance.tsx` | Add Bridge Debug card between registry details and verify |

---

## Chunk 1: Digest Utility

### Task 1: Create digest utility with tests

**Files:**
- Create: `ui/src/lib/compliance-digest.ts`
- Create: `test/compliance-digest.test.js`

- [ ] **Step 1: Write the test file**

Create `test/compliance-digest.test.js`:

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

// Import the same logic we'll put in the UI utility.
// We re-implement here to verify against the contract's behavior.
describe("Compliance Digest", function () {
  let registry;
  let bridgeWallet, other;
  const policySAID = ethers.id("test-policy-said");

  beforeEach(async function () {
    const [owner, bw, o] = await ethers.getSigners();
    bridgeWallet = bw;
    other = o;
    const Factory = await ethers.getContractFactory("ComplianceRegistry");
    registry = await Factory.deploy(bridgeWallet.address, policySAID);
    await registry.waitForDeployment();
  });

  it("Should produce a digest that the contract accepts when signed", async function () {
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const chainId = 31337n;
    const decisionId = ethers.id("digest-test-001");
    const registryAddress = registry.target;

    // Compute digest the same way the UI utility will
    const digest = ethers.keccak256(
      ethers.solidityPacked(
        ["bytes32", "address", "uint64", "bytes32", "uint256", "address"],
        [policySAID, other.address, expiry, decisionId, chainId, registryAddress]
      )
    );

    // Sign using EIP-191 personal sign (ethers.signMessage does the prefixing)
    const sig = await bridgeWallet.signMessage(ethers.getBytes(digest));
    const { v, r, s } = ethers.Signature.from(sig);

    // Submit to contract — if digest computation is wrong, this reverts
    await expect(
      registry.verify(policySAID, other.address, expiry, decisionId, chainId, registryAddress, v, r, s)
    ).to.emit(registry, "WalletVerified");
  });

  it("Should split a signature into v, r, s correctly", function () {
    // A known 65-byte signature (from ethers format)
    const fakeSig = "0x" + "ab".repeat(32) + "cd".repeat(32) + "1b";
    const { v, r, s } = ethers.Signature.from(fakeSig);
    expect(v).to.equal(27);
    expect(r).to.equal("0x" + "ab".repeat(32));
    expect(s).to.equal("0x" + "cd".repeat(32));
  });

  it("Should normalize v=0 to v=27", function () {
    // Signature with v=0 (raw recovery id)
    const rawSig = "0x" + "ab".repeat(32) + "cd".repeat(32) + "00";
    const { v } = ethers.Signature.from(rawSig);
    expect(v).to.equal(27);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx hardhat test test/compliance-digest.test.js
```

Expected: PASS (these tests use ethers directly, no UI import yet — they validate the approach).

Note: These tests validate that our digest computation approach matches the contract. They pass immediately because they use ethers inline. That's intentional — we're testing the algorithm, not the module. The module is next.

- [ ] **Step 3: Create the digest utility**

Create `ui/src/lib/compliance-digest.ts`:

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

export function generateDecisionId(): string {
  return ethers.hexlify(ethers.randomBytes(32));
}

export function defaultExpiry(): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + 3600);
}
```

- [ ] **Step 4: Run all tests**

```bash
npx hardhat test test/compliance-digest.test.js test/ComplianceRegistry.test.js
```

Expected: All pass (compliance-digest: 3, ComplianceRegistry: 13).

- [ ] **Step 5: Commit**

```bash
git add ui/src/lib/compliance-digest.ts test/compliance-digest.test.js
git commit -m "feat: add compliance digest utility with tests"
```

---

## Chunk 2: Bridge Debug UI Card

### Task 2: Add Bridge Debug card to Compliance page

**Files:**
- Modify: `ui/src/routes/Compliance.tsx`

The Bridge Debug card goes between the Registry Details card and the Submit Verification card (around line 346 in current file). It has three states:

1. **Input state** — form fields, Generate button
2. **Hash state** — shows debug values, Copy Hash button, paste signature textarea
3. **Ready state** — shows assembled signed representation, Submit button

- [ ] **Step 1: Add imports and state variables**

At the top of `Compliance.tsx`:

1. Update the existing lucide-react import to add `RefreshCw` and `ClipboardCopy`:

```typescript
import { Plus, Trash2, Copy, Check, ExternalLink, RefreshCw, ClipboardCopy } from 'lucide-react';
```

2. Add the digest utility import:

```typescript
import { computeDigest, splitSignature, generateDecisionId, type CompactRepFields } from '@/lib/compliance-digest';
```

3. Update the `useWeb3()` destructure to include `account`:

```typescript
const { provider, signer, account, isConnected, chainId, chainName } = useWeb3();
```

(The `useWeb3` hook already exposes `account` — it's just not destructured in the current Compliance component.)

Add state variables inside the `Compliance` component, after the existing state declarations (around line 35):

```typescript
// Bridge Debug state
const [debugWallet, setDebugWallet] = useState('');
const [debugExpiry, setDebugExpiry] = useState('');
const [debugDecisionId, setDebugDecisionId] = useState('');
const [debugDigest, setDebugDigest] = useState<{ digest: string; prefixedHash: string } | null>(null);
const [debugFields, setDebugFields] = useState<CompactRepFields | null>(null);
const [debugSignature, setDebugSignature] = useState('');
const [debugResult, setDebugResult] = useState<{ v: number; r: string; s: string } | null>(null);
const [copiedHash, setCopiedHash] = useState(false);
```

- [ ] **Step 2: Add initialization effect and helper functions**

After the existing `useEffect` blocks (around line 61), add:

```typescript
// Initialize debug fields when registry or account changes
useEffect(() => {
  if (account) setDebugWallet(account);
  setDebugExpiry(String(Math.floor(Date.now() / 1000) + 3600));
  setDebugDecisionId(generateDecisionId());
  // Reset computed state
  setDebugDigest(null);
  setDebugFields(null);
  setDebugResult(null);
  setDebugSignature('');
}, [selectedRegistry, account]);

const handleGenerate = () => {
  if (!selectedRegistry || !contractPolicySAID || !chainId) return;
  const fields: CompactRepFields = {
    policySAID: contractPolicySAID,
    wallet: debugWallet,
    expiry: BigInt(debugExpiry),
    decisionId: debugDecisionId,
    chainId: BigInt(chainId),
    registry: selectedRegistry,
  };
  setDebugFields(fields);
  setDebugDigest(computeDigest(fields));
  setDebugResult(null);
  setDebugSignature('');
};

const handleCopyHash = async () => {
  if (!debugDigest) return;
  await navigator.clipboard.writeText(debugDigest.prefixedHash);
  setCopiedHash(true);
  setTimeout(() => setCopiedHash(false), 2000);
};

const handlePasteSignature = () => {
  if (!debugSignature.trim()) return;
  try {
    const result = splitSignature(debugSignature.trim());
    setDebugResult(result);
  } catch (e: any) {
    alert(`Invalid signature: ${e.message}`);
  }
};

const handleSubmitDebug = async () => {
  if (!debugFields || !debugResult || !signer || !selectedRegistry) return;
  setVerifying(true);
  setVerifyResult(null);
  try {
    await submitVerification(
      debugFields.policySAID,
      debugFields.wallet,
      Number(debugFields.expiry),
      debugFields.decisionId,
      Number(debugFields.chainId),
      debugFields.registry,
      debugResult.v,
      debugResult.r,
      debugResult.s
    );
    setVerifyResult('Verification submitted successfully!');
    // Reset debug state for next round
    setDebugDecisionId(generateDecisionId());
    setDebugDigest(null);
    setDebugFields(null);
    setDebugResult(null);
    setDebugSignature('');
  } catch (error: any) {
    setVerifyResult(`Verification failed: ${error?.reason || error?.message || 'Unknown error'}`);
  } finally {
    setVerifying(false);
  }
};
```

- [ ] **Step 3: Add the Bridge Debug card JSX**

Insert this JSX block inside the `<div className="md:col-span-2 space-y-6">` wrapper, after the Registry Details `</Card>` closing tag and before the `{/* Verify Section */}` comment:

```tsx
{/* Bridge Debug */}
{selectedRegistryData && (
  <Card className={getCardBackgroundClasses()}>
    <CardHeader>
      <CardTitle>Bridge Debug</CardTitle>
      <CardDescription>
        Generate a signing request, sign externally with kerits, paste the signature back
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Input Fields */}
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Policy SAID (from registry)</label>
          <input
            type="text"
            className="w-full p-2 border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 font-mono text-xs"
            value={contractPolicySAID || ''}
            disabled
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Wallet (address to verify)</label>
          <input
            type="text"
            className="w-full p-2 border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 font-mono text-xs"
            value={debugWallet}
            onChange={(e) => setDebugWallet(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Expiry (unix seconds)</label>
            <input
              type="text"
              className="w-full p-2 border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 font-mono text-xs"
              value={debugExpiry}
              onChange={(e) => setDebugExpiry(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Chain ID (from MetaMask)</label>
            <input
              type="text"
              className="w-full p-2 border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 font-mono text-xs"
              value={chainId || ''}
              disabled
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Decision ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 p-2 border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 font-mono text-xs"
              value={debugDecisionId}
              onChange={(e) => setDebugDecisionId(e.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => setDebugDecisionId(generateDecisionId())}
              title="Regenerate"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Registry (selected)</label>
          <input
            type="text"
            className="w-full p-2 border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 font-mono text-xs"
            value={selectedRegistry || ''}
            disabled
          />
        </div>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={!debugWallet || !debugExpiry || !debugDecisionId}
        className="w-full cursor-pointer"
        variant="outline"
      >
        Generate Signing Request
      </Button>

      {/* Debug Output */}
      {debugDigest && (
        <div className="space-y-3 pt-2 border-t">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Inner Digest (keccak256 of packed fields)</label>
            <p className="font-mono text-xs break-all p-2 bg-white dark:bg-slate-800 rounded border border-gray-300 dark:border-gray-600">
              {debugDigest.digest}
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">EIP-191 Prefixed Hash (copy this to kerits)</label>
            <div className="flex gap-2 items-start">
              <p className="flex-1 font-mono text-xs break-all p-2 bg-white dark:bg-slate-800 rounded border border-gray-300 dark:border-gray-600">
                {debugDigest.prefixedHash}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer shrink-0"
                onClick={handleCopyHash}
              >
                {copiedHash ? <Check className="h-4 w-4 text-green-600" /> : <ClipboardCopy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Signature Paste */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Paste signature from kerits (65-byte hex)</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 p-2 border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 font-mono text-xs"
                placeholder="0x..."
                value={debugSignature}
                onChange={(e) => setDebugSignature(e.target.value)}
              />
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={handlePasteSignature}
                disabled={!debugSignature.trim()}
              >
                Parse
              </Button>
            </div>
          </div>

          {/* Parsed Signature + Submit */}
          {debugResult && (
            <div className="space-y-3 pt-2 border-t">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="font-medium text-muted-foreground">v</label>
                  <p className="font-mono p-1 bg-white dark:bg-slate-800 rounded border border-gray-300 dark:border-gray-600">{debugResult.v}</p>
                </div>
                <div>
                  <label className="font-medium text-muted-foreground">r</label>
                  <p className="font-mono p-1 bg-white dark:bg-slate-800 rounded border border-gray-300 dark:border-gray-600 truncate" title={debugResult.r}>{debugResult.r}</p>
                </div>
                <div>
                  <label className="font-medium text-muted-foreground">s</label>
                  <p className="font-mono p-1 bg-white dark:bg-slate-800 rounded border border-gray-300 dark:border-gray-600 truncate" title={debugResult.s}>{debugResult.s}</p>
                </div>
              </div>
              {/* Assembled signed representation JSON */}
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground font-medium">Signed Representation JSON</summary>
                <pre className="mt-1 p-2 bg-white dark:bg-slate-800 rounded border border-gray-300 dark:border-gray-600 overflow-x-auto font-mono">
                  {JSON.stringify({
                    policySAID: debugFields?.policySAID,
                    wallet: debugFields?.wallet,
                    expiry: Number(debugFields?.expiry),
                    decisionId: debugFields?.decisionId,
                    chainId: Number(debugFields?.chainId),
                    registry: debugFields?.registry,
                    v: debugResult.v,
                    r: debugResult.r,
                    s: debugResult.s,
                  }, null, 2)}
                </pre>
              </details>
              <Button
                onClick={handleSubmitDebug}
                disabled={verifying}
                className="w-full cursor-pointer"
              >
                {verifying ? 'Submitting...' : 'Submit to Contract'}
              </Button>
              {verifyResult && (
                <p className={`text-sm ${
                  verifyResult.startsWith('Verification submitted')
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {verifyResult}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </CardContent>
  </Card>
)}
```

- [ ] **Step 4: Verify the UI compiles**

```bash
cd ui && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 5: Run all tests**

```bash
npx hardhat test test/compliance-digest.test.js test/ComplianceRegistry.test.js
```

Expected: All pass (compliance-digest: 3, ComplianceRegistry: 13).

- [ ] **Step 6: Manual smoke test**

```bash
# Terminal 1:
make node

# Terminal 2:
make dev
```

Open browser, connect MetaMask to localhost:8545. Navigate to Compliance page:
1. Deploy a new registry (use any Hardhat account as bridge signer)
2. Select the registry — Bridge Debug card should appear
3. Fields should be pre-populated (wallet = connected account, expiry = 1hr from now, etc.)
4. Click Generate — should show digest and prefixed hash
5. Click Copy Hash — should copy to clipboard
6. Paste a signature and click Parse — should show v/r/s split

- [ ] **Step 7: Commit**

```bash
git add ui/src/lib/compliance-digest.ts ui/src/routes/Compliance.tsx test/compliance-digest.test.js
git commit -m "feat: add Bridge Debug card with clipboard signing flow"
```
