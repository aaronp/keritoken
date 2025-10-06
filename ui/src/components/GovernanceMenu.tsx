import type { WhitelistedAddress } from "@/hooks/useGovernanceToken";

interface GovernanceMenuProps {
  whitelistedAddresses: WhitelistedAddress[];
  loading: boolean;
  onAddAddress: () => void;
}

export function GovernanceMenu({ whitelistedAddresses, loading, onAddAddress }: GovernanceMenuProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Governance - Whitelisted Addresses</h2>
        <button
          onClick={onAddAddress}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium"
        >
          Add Address
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : whitelistedAddresses.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No whitelisted addresses yet
        </div>
      ) : (
        <div className="space-y-4">
          {whitelistedAddresses.map((address, index) => (
            <div
              key={`${address.walletAddress}-${address.blockNumber}`}
              className="border border-border rounded-lg p-4 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="font-semibold text-sm text-muted-foreground">
                    Address #{index + 1}
                  </div>
                  <div className="font-mono text-sm break-all">{address.walletAddress}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div>
                  <span className="font-semibold">Challenge: </span>
                  <span className="text-muted-foreground">{address.challenge}</span>
                </div>
                <div>
                  <span className="font-semibold">Hash: </span>
                  <span className="font-mono text-xs break-all text-muted-foreground">
                    {address.hash}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Signature: </span>
                  <span className="font-mono text-xs break-all text-muted-foreground">
                    {address.signature}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
