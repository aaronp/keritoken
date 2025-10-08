import { useState, useEffect } from 'react';
import { useWeb3 } from '@/hooks/useWeb3';
import { useGovernanceToken } from '@/hooks/useGovernanceToken';
import { storage, type DeployedGovernanceToken } from '@/lib/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Users } from 'lucide-react';
import { AddAddressModal } from '@/components/AddAddressModal';
import { ExternalLink } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

// Helper function to get block explorer URL based on chain ID
function getBlockExplorerUrl(chainId: number, address: string): string | null {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io',
    11155111: 'https://sepolia.etherscan.io', // Sepolia
    5: 'https://goerli.etherscan.io', // Goerli
    137: 'https://polygonscan.com', // Polygon
    80001: 'https://mumbai.polygonscan.com', // Mumbai
  };

  const baseUrl = explorers[chainId];
  return baseUrl ? `${baseUrl}/address/${address}` : null;
}

export function Governance() {
  const { provider, signer, isConnected } = useWeb3();
  const { theme } = useTheme();
  const [deployedTokens, setDeployedTokens] = useState<DeployedGovernanceToken[]>([]);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [contractName, setContractName] = useState('');

  const {
    whitelistedAddresses,
    loading: loadingAddresses,
    deployGovernanceToken,
    addAddress
  } = useGovernanceToken(provider, signer, selectedToken);

  const getCardBackgroundClasses = () => {
    if (theme === 'dark') {
      return 'bg-slate-900';
    } else {
      return 'bg-sky-50';
    }
  };

  useEffect(() => {
    loadDeployedTokens();
  }, []);

  const loadDeployedTokens = async () => {
    const tokens = await storage.getGovernanceTokens();
    setDeployedTokens(tokens);
    if (tokens.length > 0 && !selectedToken) {
      setSelectedToken(tokens[0].address);
    }
  };

  const handleDeploy = async () => {
    if (!signer) {
      alert('Please connect your wallet first');
      return;
    }

    if (!contractName.trim()) {
      alert('Please enter a contract name');
      return;
    }

    setDeploying(true);
    try {
      const address = await deployGovernanceToken();
      const network = await provider?.getNetwork();

      const newToken: DeployedGovernanceToken = {
        address,
        name: contractName.trim(),
        network: network?.name || 'unknown',
        chainId: Number(network?.chainId) || 0,
        deployedAt: Date.now()
      };

      await storage.addGovernanceToken(newToken);
      await loadDeployedTokens();
      setSelectedToken(address);
      setIsDeployDialogOpen(false);
      setContractName('');
      alert('Governance token deployed successfully!');
    } catch (error) {
      console.error('Error deploying:', error);
      alert('Failed to deploy governance token');
    } finally {
      setDeploying(false);
    }
  };

  const handleDelete = async (address: string) => {
    if (confirm('Are you sure you want to remove this token from the list?')) {
      await storage.removeGovernanceToken(address);
      if (selectedToken === address) {
        setSelectedToken(null);
      }
      await loadDeployedTokens();
    }
  };

  const handleAddAddress = async (
    walletAddress: string,
    referenceId: string
  ) => {
    try {
      await addAddress(walletAddress, referenceId);
      setIsAddModalOpen(false);
      alert('Address added successfully!');
    } catch (error) {
      console.error('Error adding address:', error);
      alert('Failed to add address');
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground text-lg">Please connect your wallet to continue</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Governance Tokens</h2>
          <p className="text-muted-foreground">
            Deploy and manage governance tokens for whitelisting
          </p>
        </div>
        <Dialog open={isDeployDialogOpen} onOpenChange={setIsDeployDialogOpen}>
          <DialogTrigger asChild>
            <Button className='cursor-pointer' variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Deploy New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deploy Governance Token</DialogTitle>
              <DialogDescription>
                Deploy a new governance token contract to manage whitelisted addresses.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Contract Name</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg"
                  placeholder="e.g., My Governance Token"
                  value={contractName}
                  onChange={(e) => setContractName(e.target.value)}
                />
              </div>
              <Button onClick={handleDeploy} disabled={deploying || !contractName.trim()} className="w-full">
                {deploying ? 'Deploying...' : 'Deploy Contract'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Token List */}
        <Card className={`md:col-span-1 ${getCardBackgroundClasses()}`}>
          <CardHeader>
            <CardTitle>Deployed Tokens</CardTitle>
            <CardDescription>Select a token to manage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {deployedTokens.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tokens deployed yet</p>
            ) : (
              deployedTokens.map((token) => {
                const explorerUrl = getBlockExplorerUrl(token.chainId, token.address);
                return (
                  <div
                    key={token.address}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedToken === token.address
                      ? 'border-primary bg-accent'
                      : 'hover:bg-accent'
                      }`}
                    onClick={() => setSelectedToken(token.address)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{token.name}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {token.address.substring(0, 10)}...
                      </p>
                      {explorerUrl && (
                        <a
                          href={explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View on Explorer <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(token.address);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Token Details */}
        <Card className={`md:col-span-2 ${getCardBackgroundClasses()}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Whitelisted Addresses</CardTitle>
                <CardDescription>
                  {selectedToken
                    ? `Manage addresses for ${selectedToken.substring(0, 10)}...`
                    : 'Select a token to view addresses'}
                </CardDescription>
              </div>
              {selectedToken && (
                <Button onClick={() => setIsAddModalOpen(true)}>
                  <Users className="mr-2 h-4 w-4" />
                  Add Address
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedToken ? (
              <p className="text-muted-foreground text-center py-8">
                Select a token from the list to view whitelisted addresses
              </p>
            ) : loadingAddresses ? (
              <p className="text-muted-foreground text-center py-8">Loading addresses...</p>
            ) : whitelistedAddresses.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No addresses whitelisted yet</p>
            ) : (
              <div className="space-y-2">
                {whitelistedAddresses.map((addr, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex-1">
                      <p className="font-mono text-sm">{addr.walletAddress}</p>
                      <p className="text-xs text-muted-foreground">
                        Reference: {addr.referenceId} • Block: {addr.blockNumber}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Address Modal */}
      {selectedToken && (
        <AddAddressModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddAddress}
        />
      )}
    </div>
  );
}
