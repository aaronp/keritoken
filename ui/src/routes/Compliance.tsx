import { useState, useEffect } from 'react';
import { useWeb3 } from '@/hooks/useWeb3';
import { useComplianceRegistry } from '@/hooks/useComplianceRegistry';
import { storage, type DeployedComplianceRegistry } from '@/lib/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Copy, Check, ExternalLink } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

function getBlockExplorerUrl(chainId: number, address: string): string | null {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io',
    11155111: 'https://sepolia.etherscan.io',
    8453: 'https://basescan.org',
    84532: 'https://sepolia.basescan.org',
  };
  const baseUrl = explorers[chainId];
  return baseUrl ? `${baseUrl}/address/${address}` : null;
}

export function Compliance() {
  const { provider, signer, isConnected, chainId, chainName } = useWeb3();
  const { theme } = useTheme();
  const [deployedRegistries, setDeployedRegistries] = useState<DeployedComplianceRegistry[]>([]);
  const [selectedRegistry, setSelectedRegistry] = useState<string | null>(null);
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [registryName, setRegistryName] = useState('');
  const [bridgeSignerInput, setBridgeSignerInput] = useState('');
  const [policySAIDInput, setPolicySAIDInput] = useState('');
  const [verifyJson, setVerifyJson] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const {
    verificationEvents,
    bridgeSigner: contractBridgeSigner,
    policySAID: contractPolicySAID,
    loading,
    loadRegistryInfo,
    loadVerificationEvents,
    deployRegistry,
    submitVerification,
  } = useComplianceRegistry(provider, signer, selectedRegistry);

  const getCardBackgroundClasses = () => {
    return theme === 'dark' ? 'bg-slate-900' : 'bg-sky-50';
  };

  useEffect(() => {
    loadDeployedRegistries();
  }, []);

  useEffect(() => {
    if (selectedRegistry && provider) {
      loadRegistryInfo();
      loadVerificationEvents();
    }
  }, [selectedRegistry, provider]);

  const loadDeployedRegistries = async () => {
    const registries = await storage.getComplianceRegistries();
    setDeployedRegistries(registries);
    if (registries.length > 0 && !selectedRegistry) {
      setSelectedRegistry(registries[0].address);
    }
  };

  const handleDeploy = async () => {
    if (!signer) {
      alert('Please connect your wallet first');
      return;
    }
    if (!registryName.trim() || !bridgeSignerInput.trim() || !policySAIDInput.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setDeploying(true);
    try {
      const policyBytes = policySAIDInput.startsWith('0x')
        ? policySAIDInput
        : '0x' + policySAIDInput;

      const address = await deployRegistry(bridgeSignerInput.trim(), policyBytes);
      const network = await provider?.getNetwork();

      const newRegistry: DeployedComplianceRegistry = {
        address,
        name: registryName.trim(),
        bridgeSigner: bridgeSignerInput.trim(),
        policySAID: policySAIDInput.trim(),
        network: network?.name || 'unknown',
        chainId: Number(network?.chainId) || 0,
        deployedAt: Date.now(),
      };

      await storage.addComplianceRegistry(newRegistry);
      await loadDeployedRegistries();
      setSelectedRegistry(address);
      setIsDeployDialogOpen(false);
      setRegistryName('');
      setBridgeSignerInput('');
      setPolicySAIDInput('');
      alert('Compliance Registry deployed successfully!');
    } catch (error) {
      console.error('Error deploying:', error);
      alert('Failed to deploy compliance registry');
    } finally {
      setDeploying(false);
    }
  };

  const handleDelete = async (address: string) => {
    if (confirm('Are you sure you want to remove this registry from the list?')) {
      await storage.removeComplianceRegistry(address);
      if (selectedRegistry === address) {
        setSelectedRegistry(null);
      }
      await loadDeployedRegistries();
    }
  };

  const handleVerify = async () => {
    if (!signer || !selectedRegistry) {
      alert('Please connect wallet and select a registry');
      return;
    }

    setVerifying(true);
    setVerifyResult(null);
    try {
      const rep = JSON.parse(verifyJson);
      await submitVerification(
        rep.policySAID,
        rep.wallet,
        rep.expiry,
        rep.decisionId,
        rep.chainId,
        rep.registry,
        rep.v,
        rep.r,
        rep.s
      );
      setVerifyResult('Verification submitted successfully!');
      setVerifyJson('');
    } catch (error: any) {
      console.error('Error verifying:', error);
      setVerifyResult(`Verification failed: ${error?.reason || error?.message || 'Unknown error'}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyAddress = async (address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  const selectedRegistryData = deployedRegistries.find(
    (r) => r.address === selectedRegistry
  );

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
          <h2 className="text-3xl font-bold tracking-tight">Compliance Registry</h2>
          <p className="text-muted-foreground">
            Deploy registries and submit on-chain verifications
          </p>
        </div>
        <Dialog open={isDeployDialogOpen} onOpenChange={setIsDeployDialogOpen}>
          <DialogTrigger asChild>
            <Button className="cursor-pointer" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Deploy New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deploy Compliance Registry</DialogTitle>
              <DialogDescription>
                Deploy a new compliance registry contract with a bridge signer and policy SAID.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                  placeholder="e.g., My Compliance Registry"
                  value={registryName}
                  onChange={(e) => setRegistryName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Bridge Signer Address</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 font-mono text-sm"
                  placeholder="0x..."
                  value={bridgeSignerInput}
                  onChange={(e) => setBridgeSignerInput(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Policy SAID</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 font-mono text-sm"
                  placeholder="0x... (bytes32)"
                  value={policySAIDInput}
                  onChange={(e) => setPolicySAIDInput(e.target.value)}
                />
              </div>
              <Button
                onClick={handleDeploy}
                disabled={deploying || !registryName.trim() || !bridgeSignerInput.trim() || !policySAIDInput.trim()}
                className="w-full"
              >
                {deploying ? 'Deploying...' : 'Deploy Contract'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Registry List */}
        <Card className={`md:col-span-1 ${getCardBackgroundClasses()}`}>
          <CardHeader>
            <CardTitle>Deployed Registries</CardTitle>
            <CardDescription>Select a registry to manage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {deployedRegistries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No registries deployed yet</p>
            ) : (
              deployedRegistries.map((registry) => {
                const explorerUrl = getBlockExplorerUrl(registry.chainId, registry.address);
                return (
                  <div
                    key={registry.address}
                    className={`group flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedRegistry === registry.address
                        ? 'border-primary bg-accent'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => setSelectedRegistry(registry.address)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{registry.name}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {registry.address.substring(0, 10)}...
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
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleCopyAddress(registry.address, e)}
                        title="Copy address"
                      >
                        {copiedAddress === registry.address ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(registry.address);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Registry Details + Verify + Events */}
        <div className="md:col-span-2 space-y-6">
          {/* Info Card */}
          {selectedRegistryData && (
            <Card className={getCardBackgroundClasses()}>
              <CardHeader>
                <CardTitle>{selectedRegistryData.name}</CardTitle>
                <CardDescription>Registry details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Address: </span>
                  <span className="font-mono">{selectedRegistryData.address}</span>
                </div>
                <div>
                  <span className="font-medium">Bridge Signer: </span>
                  <span className="font-mono">{contractBridgeSigner || selectedRegistryData.bridgeSigner}</span>
                </div>
                <div>
                  <span className="font-medium">Policy SAID: </span>
                  <span className="font-mono break-all">{contractPolicySAID || selectedRegistryData.policySAID}</span>
                </div>
                <div>
                  <span className="font-medium">Chain: </span>
                  <span>{chainName || selectedRegistryData.network} ({chainId || selectedRegistryData.chainId})</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Verify Section */}
          <Card className={getCardBackgroundClasses()}>
            <CardHeader>
              <CardTitle>Submit Verification</CardTitle>
              <CardDescription>
                {selectedRegistry
                  ? 'Paste a signed representation JSON to submit on-chain'
                  : 'Select a registry first'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedRegistry ? (
                <p className="text-muted-foreground text-center py-8">
                  Select a registry from the list to submit verifications
                </p>
              ) : (
                <div className="space-y-4">
                  <textarea
                    className="w-full p-3 border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 font-mono text-sm min-h-[120px]"
                    placeholder='{"policySAID": "0x...", "wallet": "0x...", "expiry": 123, "decisionId": "0x...", "chainId": 1, "registry": "0x...", "v": 27, "r": "0x...", "s": "0x..."}'
                    value={verifyJson}
                    onChange={(e) => setVerifyJson(e.target.value)}
                  />
                  <Button
                    onClick={handleVerify}
                    disabled={verifying || !verifyJson.trim()}
                    className="w-full"
                  >
                    {verifying ? 'Submitting...' : 'Submit Verification'}
                  </Button>
                  {verifyResult && (
                    <p
                      className={`text-sm ${
                        verifyResult.startsWith('Verification submitted')
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {verifyResult}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Log */}
          <Card className={getCardBackgroundClasses()}>
            <CardHeader>
              <CardTitle>Verification Events</CardTitle>
              <CardDescription>
                WalletVerified events from the selected registry
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedRegistry ? (
                <p className="text-muted-foreground text-center py-8">
                  Select a registry to view events
                </p>
              ) : loading ? (
                <p className="text-muted-foreground text-center py-8">Loading events...</p>
              ) : verificationEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No verification events yet</p>
              ) : (
                <div className="space-y-2">
                  {verificationEvents.map((event, index) => (
                    <div
                      key={index}
                      className="flex flex-col p-3 rounded-lg border gap-1"
                    >
                      <p className="font-mono text-sm">{event.wallet}</p>
                      <p className="text-xs text-muted-foreground">
                        Decision: {event.decisionId.substring(0, 18)}... | Block: {event.blockNumber} | Expiry: {new Date(Number(event.expiry) * 1000).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
