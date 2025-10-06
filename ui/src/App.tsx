import { useState, useEffect } from 'react';
import './App.css';
import { storage } from './lib/storage';
import { useWeb3 } from './hooks/useWeb3';
import { useGovernanceToken } from './hooks/useGovernanceToken';
import { DeployGovernanceToken } from './components/DeployGovernanceToken';
import { GovernanceMenu } from './components/GovernanceMenu';
import { AddAddressModal } from './components/AddAddressModal';

type ActiveMenu = 'governance' | 'token';

function App() {
  const [governanceTokenAddress, setGovernanceTokenAddress] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('governance');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const { provider, signer, account, isConnected, connect } = useWeb3();
  const {
    whitelistedAddresses,
    loading: loadingAddresses,
    deployGovernanceToken,
    addAddress
  } = useGovernanceToken(provider, signer, governanceTokenAddress);

  // Load governance token address from storage on mount
  useEffect(() => {
    const loadAddress = async () => {
      const address = await storage.getGovernanceTokenAddress();
      setGovernanceTokenAddress(address || null);
      setLoading(false);
    };
    loadAddress();
  }, []);

  const handleDeploy = async () => {
    if (!signer) {
      alert('Please connect your wallet first');
      return;
    }

    const address = await deployGovernanceToken();
    await storage.setGovernanceTokenAddress(address);
    setGovernanceTokenAddress(address);
  };

  const handleAddAddress = async (
    walletAddress: string,
    challenge: string,
    hash: string,
    signature: string
  ) => {
    await addAddress(walletAddress, challenge, hash, signature);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Governance Token</h1>

          {/* Wallet Connection */}
          <div className="flex items-center gap-4">
            {isConnected ? (
              <div className="text-sm">
                <span className="text-muted-foreground">Connected: </span>
                <span className="font-mono">{account?.substring(0, 6)}...{account?.substring(account.length - 4)}</span>
              </div>
            ) : (
              <button
                onClick={connect}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium"
              >
                Connect Wallet
              </button>
            )}

            {governanceTokenAddress && (
              <div className="text-sm">
                <span className="text-muted-foreground">Contract: </span>
                <span className="font-mono">{governanceTokenAddress.substring(0, 6)}...{governanceTokenAddress.substring(governanceTokenAddress.length - 4)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        {!isConnected ? (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">
              Please connect your wallet to continue
            </p>
          </div>
        ) : !governanceTokenAddress ? (
          <DeployGovernanceToken onDeploy={handleDeploy} />
        ) : (
          <>
            {/* Menu Tabs */}
            <div className="flex gap-2 mb-6 border-b border-border">
              <button
                onClick={() => setActiveMenu('governance')}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeMenu === 'governance'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Governance
              </button>
              <button
                onClick={() => setActiveMenu('token')}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeMenu === 'token'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Token
              </button>
            </div>

            {/* Menu Content */}
            {activeMenu === 'governance' && (
              <GovernanceMenu
                whitelistedAddresses={whitelistedAddresses}
                loading={loadingAddresses}
                onAddAddress={() => setIsAddModalOpen(true)}
              />
            )}

            {activeMenu === 'token' && (
              <div className="text-center py-12">
                <p className="text-xl text-muted-foreground">
                  Token management coming soon
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Address Modal */}
      <AddAddressModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddAddress}
      />
    </div>
  );
}

export default App;
