import { useState, useEffect } from 'react';
import { useWeb3 } from '@/hooks/useWeb3';
import { useToken } from '@/hooks/useToken';
import { storage, type DeployedToken, type DeployedGovernanceToken } from '@/lib/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Coins } from 'lucide-react';

export function Tokens() {
  const { provider, signer, isConnected } = useWeb3();
  const [deployedTokens, setDeployedTokens] = useState<DeployedToken[]>([]);
  const [governanceTokens, setGovernanceTokens] = useState<DeployedGovernanceToken[]>([]);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  const [isMintDialogOpen, setIsMintDialogOpen] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [selectedGovernance, setSelectedGovernance] = useState<string>('');
  const [mintTo, setMintTo] = useState('');
  const [mintAmount, setMintAmount] = useState('');

  const {
    balances,
    totalSupply,
    loading: loadingBalances,
    deployToken,
    mintTokens,
  } = useToken(provider, signer, selectedToken);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const tokens = await storage.getTokens();
    const govTokens = await storage.getGovernanceTokens();
    setDeployedTokens(tokens);
    setGovernanceTokens(govTokens);
    if (tokens.length > 0 && !selectedToken) {
      setSelectedToken(tokens[0].address);
    }
    if (govTokens.length > 0 && !selectedGovernance) {
      setSelectedGovernance(govTokens[0].address);
    }
  };

  const handleDeploy = async () => {
    if (!signer || !selectedGovernance) {
      alert('Please connect your wallet and select a governance token');
      return;
    }

    setDeploying(true);
    try {
      const address = await deployToken(selectedGovernance);
      const network = await provider?.getNetwork();

      const newToken: DeployedToken = {
        address,
        name: `Token ${deployedTokens.length + 1}`,
        symbol: 'TKN',
        governanceTokenAddress: selectedGovernance,
        network: network?.name || 'unknown',
        chainId: Number(network?.chainId) || 0,
        deployedAt: Date.now()
      };

      await storage.addToken(newToken);
      await loadData();
      setSelectedToken(address);
      setIsDeployDialogOpen(false);
      alert('Token deployed successfully!');
    } catch (error) {
      console.error('Error deploying:', error);
      alert('Failed to deploy token');
    } finally {
      setDeploying(false);
    }
  };

  const handleMint = async () => {
    if (!mintTo || !mintAmount) {
      alert('Please enter address and amount');
      return;
    }

    try {
      await mintTokens(mintTo, mintAmount);
      setIsMintDialogOpen(false);
      setMintTo('');
      setMintAmount('');
      alert('Tokens minted successfully!');
    } catch (error) {
      console.error('Error minting:', error);
      alert('Failed to mint tokens. Make sure the recipient is whitelisted.');
    }
  };

  const handleDelete = async (address: string) => {
    if (confirm('Are you sure you want to remove this token from the list?')) {
      await storage.removeToken(address);
      if (selectedToken === address) {
        setSelectedToken(null);
      }
      await loadData();
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
          <h2 className="text-3xl font-bold tracking-tight">Tokens</h2>
          <p className="text-muted-foreground">
            Deploy and manage tokens with governance whitelist
          </p>
        </div>
        <Dialog open={isDeployDialogOpen} onOpenChange={setIsDeployDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={governanceTokens.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Deploy New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deploy Token</DialogTitle>
              <DialogDescription>
                Deploy a new token contract linked to a governance token for whitelist management.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Governance Token</label>
                <select
                  className="w-full p-2 border rounded-lg"
                  value={selectedGovernance}
                  onChange={(e) => setSelectedGovernance(e.target.value)}
                >
                  {governanceTokens.map((token) => (
                    <option key={token.address} value={token.address}>
                      {token.name} ({token.address.substring(0, 10)}...)
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={handleDeploy} disabled={deploying} className="w-full">
                {deploying ? 'Deploying...' : 'Deploy Contract'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {governanceTokens.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Please deploy a governance token first on the Governance page
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Token List */}
        <Card className="md:col-span-1 bg-panel">
          <CardHeader>
            <CardTitle>Deployed Tokens</CardTitle>
            <CardDescription>Select a token to manage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {deployedTokens.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tokens deployed yet</p>
            ) : (
              deployedTokens.map((token) => (
                <div
                  key={token.address}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedToken === token.address
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
              ))
            )}
          </CardContent>
        </Card>

        {/* Token Details */}
        <Card className="md:col-span-2 bg-panel">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Token Balances</CardTitle>
                <CardDescription>
                  {selectedToken
                    ? `View balances for ${selectedToken.substring(0, 10)}...`
                    : 'Select a token to view balances'}
                </CardDescription>
              </div>
              {selectedToken && (
                <Dialog open={isMintDialogOpen} onOpenChange={setIsMintDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Coins className="mr-2 h-4 w-4" />
                      Mint Tokens
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Mint Tokens</DialogTitle>
                      <DialogDescription>
                        Mint tokens to a whitelisted address
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Recipient Address</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded-lg font-mono text-sm"
                          placeholder="0x..."
                          value={mintTo}
                          onChange={(e) => setMintTo(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Amount</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded-lg"
                          placeholder="100"
                          value={mintAmount}
                          onChange={(e) => setMintAmount(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleMint} className="w-full">
                        Mint Tokens
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedToken ? (
              <p className="text-muted-foreground text-center py-8">
                Select a token from the list to view balances
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
                  <span className="text-sm font-medium">Total Supply</span>
                  <span className="text-lg font-bold">{totalSupply} TKN</span>
                </div>

                {loadingBalances ? (
                  <p className="text-muted-foreground text-center py-8">Loading balances...</p>
                ) : balances.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No balances yet</p>
                ) : (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground">Holders</h3>
                    {balances.map((balance, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div>
                          <p className="font-mono text-sm">{balance.address}</p>
                          <p className="text-xs text-muted-foreground">
                            Block: {balance.blockNumber}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{balance.balance} TKN</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
