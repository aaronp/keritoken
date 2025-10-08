import { useState } from 'react';

interface AddAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (walletAddress: string, referenceId: string) => Promise<void>;
}

export function AddAddressModal({ isOpen, onClose, onSubmit }: AddAddressModalProps) {
  const [walletAddress, setWalletAddress] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(walletAddress, referenceId);
      // Reset form
      setWalletAddress('');
      setReferenceId('');
      onClose();
    } catch (error) {
      console.error('Error adding address:', error);
      alert('Failed to add address: ' + (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Add Whitelisted Address</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            disabled={submitting}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="walletAddress" className="block text-sm font-medium mb-1">
              Wallet Address
            </label>
            <input
              type="text"
              id="walletAddress"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="0x..."
              required
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            />
          </div>

          <div>
            <label htmlFor="referenceId" className="block text-sm font-medium mb-1">
              Reference ID <span className="text-muted-foreground text-xs">(e.g. KYC ID, email, user identifier)</span>
            </label>
            <input
              type="text"
              id="referenceId"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="user@example.com or KYC-12345"
              required
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {submitting ? 'Adding...' : 'Add Address'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
