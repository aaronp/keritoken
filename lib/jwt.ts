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
