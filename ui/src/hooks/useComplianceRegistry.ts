import { useState } from 'react';
import { ethers } from 'ethers';
import ComplianceRegistryArtifact from '../../public/contracts/ComplianceRegistry.json';

export interface VerificationEvent {
  wallet: string;
  policySAID: string;
  decisionId: string;
  expiry: bigint;
  blockNumber: number;
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

  const loadRegistryInfo = async () => {
    if (!provider || !contractAddress) return;

    setLoading(true);
    try {
      const contract = new ethers.Contract(contractAddress, ComplianceRegistryArtifact.abi, provider);
      const [signerAddr, said] = await Promise.all([
        contract.bridgeSigner(),
        contract.policySAID(),
      ]);
      setBridgeSigner(signerAddr);
      setPolicySAID(said);
    } catch (error) {
      console.error('Error loading registry info:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVerificationEvents = async () => {
    if (!provider || !contractAddress) return;

    setLoading(true);
    try {
      const contract = new ethers.Contract(contractAddress, ComplianceRegistryArtifact.abi, provider);
      const filter = contract.filters.WalletVerified();
      const events = await contract.queryFilter(filter);

      const parsed = events
        .filter((event): event is ethers.EventLog => 'args' in event)
        .map((event) => ({
          wallet: event.args.wallet,
          policySAID: event.args.policySAID,
          decisionId: event.args.decisionId,
          expiry: event.args.expiry,
          blockNumber: event.blockNumber,
        }));

      setVerificationEvents(parsed);
    } catch (error) {
      console.error('Error loading verification events:', error);
    } finally {
      setLoading(false);
    }
  };

  const deployRegistry = async (
    bridgeSignerAddr: string,
    policySAIDValue: string
  ): Promise<string> => {
    if (!signer) throw new Error('No signer available');

    const factory = new ethers.ContractFactory(
      ComplianceRegistryArtifact.abi,
      ComplianceRegistryArtifact.bytecode,
      signer
    );

    const contract = await factory.deploy(bridgeSignerAddr, policySAIDValue);
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    return address;
  };

  const submitVerification = async (
    policySAID_: string,
    wallet: string,
    expiry: number,
    decisionId: string,
    chainId: number,
    registry: string,
    v: number,
    r: string,
    s: string
  ): Promise<boolean> => {
    if (!signer || !contractAddress) throw new Error('No signer or contract address');

    const contract = new ethers.Contract(contractAddress, ComplianceRegistryArtifact.abi, signer);
    const tx = await contract.verify(policySAID_, wallet, expiry, decisionId, chainId, registry, v, r, s);
    await tx.wait();

    // Reload events after verification
    await loadVerificationEvents();
    return true;
  };

  return {
    verificationEvents,
    bridgeSigner,
    policySAID,
    loading,
    loadRegistryInfo,
    loadVerificationEvents,
    deployRegistry,
    submitVerification,
  };
}
