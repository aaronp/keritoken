import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import TokenArtifact from '../../public/contracts/Token.json';

export interface TokenBalance {
  address: string;
  balance: string;
  blockNumber: number;
}

export function useToken(
  provider: ethers.BrowserProvider | null,
  signer: ethers.Signer | null,
  tokenAddress: string | null
) {
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [totalSupply, setTotalSupply] = useState<string>('0');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (provider && tokenAddress) {
      loadTokenData();
    }
  }, [provider, tokenAddress]);

  const loadTokenData = async () => {
    if (!provider || !tokenAddress) return;

    setLoading(true);
    try {
      const contract = new ethers.Contract(tokenAddress, TokenArtifact.abi, provider);

      // Get total supply
      const supply = await contract.totalSupply();
      setTotalSupply(ethers.formatEther(supply));

      // Get Transfer events to build balance list
      const transferFilter = contract.filters.Transfer();
      const events = await contract.queryFilter(transferFilter);

      // Build a map of addresses and their balances
      const addressMap = new Map<string, TokenBalance>();

      for (const event of events) {
        const to = (event.args as any).to;
        if (to !== ethers.ZeroAddress) {
          if (!addressMap.has(to)) {
            const balance = await contract.balanceOf(to);
            addressMap.set(to, {
              address: to,
              balance: ethers.formatEther(balance),
              blockNumber: event.blockNumber
            });
          }
        }
      }

      setBalances(Array.from(addressMap.values()));
    } catch (error) {
      console.error('Error loading token data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deployToken = async (governanceTokenAddress: string): Promise<string> => {
    if (!signer) throw new Error('No signer available');

    const factory = new ethers.ContractFactory(
      TokenArtifact.abi,
      TokenArtifact.bytecode,
      signer
    );

    const contract = await factory.deploy(governanceTokenAddress);
    await contract.waitForDeployment();
    const address = await contract.getAddress();

    return address;
  };

  const mintTokens = async (to: string, amount: string) => {
    if (!signer || !tokenAddress) throw new Error('No signer or token address');

    const contract = new ethers.Contract(tokenAddress, TokenArtifact.abi, signer);
    const amountInWei = ethers.parseEther(amount);
    const tx = await contract.mint(to, amountInWei);
    await tx.wait();

    // Reload data after minting
    await loadTokenData();
  };

  return {
    balances,
    totalSupply,
    loading,
    deployToken,
    mintTokens,
    reloadData: loadTokenData
  };
}
