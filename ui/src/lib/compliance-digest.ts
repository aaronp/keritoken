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
