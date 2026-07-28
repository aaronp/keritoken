import { ethers } from "ethers";
import { decodeJwt, verifyJwtSignature, validateClaims } from "./jwt";

export interface BridgeInput {
  jwt: string;
  issuerAddress: string;
  bridgePrivateKey: string;
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
  const { payload, signingInput, signatureBytes } = decodeJwt(jwt);
  verifyJwtSignature(signingInput, signatureBytes, issuerAddress);
  validateClaims(payload);

  const policySAID = payload.policySAID as string;
  const wallet = payload.sub as string;
  const expiry = BigInt(payload.exp as number);
  const decisionId = payload.jti as string;
  const chainId = BigInt(payload.chainId as number);
  const registry = payload.aud as string;

  const digest = ethers.keccak256(
    ethers.solidityPacked(
      ["bytes32", "address", "uint64", "bytes32", "uint256", "address"],
      [policySAID, wallet, expiry, decisionId, chainId, registry]
    )
  );

  const bridgeWallet = new ethers.Wallet(bridgePrivateKey);
  const signature = await bridgeWallet.signMessage(ethers.getBytes(digest));
  const { v, r, s } = ethers.Signature.from(signature);

  return { policySAID, wallet, expiry, decisionId, chainId, registry, v, r, s };
}
