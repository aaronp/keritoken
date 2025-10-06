import { useState } from 'react';

interface DeployGovernanceTokenProps {
  onDeploy: () => Promise<void>;
}

export function DeployGovernanceToken({ onDeploy }: DeployGovernanceTokenProps) {
  const [deploying, setDeploying] = useState(false);

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      await onDeploy();
    } catch (error) {
      console.error('Deployment failed:', error);
      alert('Failed to deploy GovernanceToken: ' + (error as Error).message);
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md">
        <h2 className="text-2xl font-bold">No Governance Token Found</h2>
        <p className="text-muted-foreground">
          You need to deploy a GovernanceToken contract to get started.
        </p>
        <button
          onClick={handleDeploy}
          disabled={deploying}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {deploying ? 'Deploying...' : 'Deploy GovernanceToken'}
        </button>
      </div>
    </div>
  );
}
