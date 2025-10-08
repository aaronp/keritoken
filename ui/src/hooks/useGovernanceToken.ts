import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import GovernanceTokenArtifact from '../../public/contracts/GovernanceToken.json';

export interface WhitelistedAddress {
  walletAddress: string;
  referenceId: string;
  blockNumber: number;
}

export function useGovernanceToken(
  provider: ethers.BrowserProvider | null,
  signer: ethers.Signer | null,
  contractAddress: string | null
) {
  const [whitelistedAddresses, setWhitelistedAddresses] = useState<WhitelistedAddress[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (provider && contractAddress) {
      loadWhitelistedAddresses();
    }
  }, [provider, contractAddress]);

  const loadWhitelistedAddresses = async () => {
    if (!provider || !contractAddress) return;

    setLoading(true);
    try {
      const contract = new ethers.Contract(contractAddress, GovernanceTokenArtifact.abi, provider);

      // Get AddressAdded events
      const addedFilter = contract.filters.AddressAdded();
      const addedEvents = await contract.queryFilter(addedFilter);

      // Get AddressRemoved events
      const removedFilter = contract.filters.AddressRemoved();
      const removedEvents = await contract.queryFilter(removedFilter);

      // Build a set of removed addresses
      const removedAddresses = new Set(
        removedEvents.map(event => (event.args as any).walletAddress.toLowerCase())
      );

      // Filter out removed addresses and map to WhitelistedAddress
      const addresses = addedEvents
        .filter(event => !removedAddresses.has((event.args as any).walletAddress.toLowerCase()))
        .map(event => ({
          walletAddress: (event.args as any).walletAddress,
          referenceId: (event.args as any).referenceId,
          blockNumber: event.blockNumber
        }));

      setWhitelistedAddresses(addresses);
    } catch (error) {
      console.error('Error loading whitelisted addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const deployGovernanceToken = async (): Promise<string> => {
    if (!signer) throw new Error('No signer available');

    const factory = new ethers.ContractFactory(
      GovernanceTokenArtifact.abi,
      GovernanceTokenArtifact.bytecode,
      signer
    );

    const contract = await factory.deploy();
    await contract.waitForDeployment();
    const address = await contract.getAddress();

    return address;
  };

  const addAddress = async (
    walletAddress: string,
    referenceId: string
  ) => {
    if (!signer || !contractAddress) throw new Error('No signer or contract address');

    const contract = new ethers.Contract(contractAddress, GovernanceTokenArtifact.abi, signer);
    const tx = await contract.addAddress(walletAddress, referenceId);
    await tx.wait();

    // Reload addresses after adding
    await loadWhitelistedAddresses();
  };

  return {
    whitelistedAddresses,
    loading,
    deployGovernanceToken,
    addAddress,
    reloadAddresses: loadWhitelistedAddresses
  };
}
