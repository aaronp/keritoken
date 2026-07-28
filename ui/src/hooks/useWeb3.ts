import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

function getChainName(id: number): string {
  const names: Record<number, string> = {
    1: 'Ethereum',
    11155111: 'Sepolia',
    8453: 'Base',
    84532: 'Base Sepolia',
    31337: 'Hardhat Local',
  };
  return names[id] || `Chain ${id}`;
}

export function useWeb3() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [chainName, setChainName] = useState<string | null>(null);

  useEffect(() => {
    if (window.ethereum) {
      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(ethersProvider);

      // Check if already connected
      window.ethereum.request({ method: 'eth_accounts' }).then(async (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          const s = await ethersProvider.getSigner();
          setSigner(s);
          const network = await ethersProvider.getNetwork();
          const id = Number(network.chainId);
          setChainId(id);
          setChainName(getChainName(id));
        }
      });

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          ethersProvider.getSigner().then(setSigner);
        } else {
          setAccount(null);
          setIsConnected(false);
          setSigner(null);
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
  }, []);

  const connect = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to use this application');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setIsConnected(true);
      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      const ethersSigner = await ethersProvider.getSigner();
      setProvider(ethersProvider);
      setSigner(ethersSigner);
      const network = await ethersProvider.getNetwork();
      const id = Number(network.chainId);
      setChainId(id);
      setChainName(getChainName(id));
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
    }
  };

  return { provider, signer, account, isConnected, connect, chainId, chainName };
}
