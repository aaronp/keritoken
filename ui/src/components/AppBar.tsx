import { useWeb3 } from '@/hooks/useWeb3';
import { useTheme } from './theme-provider';

export function AppBar() {
  const { account, isConnected, connect } = useWeb3();
  const { theme } = useTheme();

  const getHeaderClasses = () => {
    if (theme === 'dark') {
      return 'bg-blue-950 border-blue-900';
    } else {
      return 'bg-blue-100 border-blue-200';
    }
  };

  return (
    <header className={`border-b ${getHeaderClasses()}`}>
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Token Management</h1>
        </div>

        <div className="flex items-center gap-4">
          {isConnected ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-accent rounded-lg">
              <div className="h-2 w-2 bg-green-500 rounded-full" />
              <span className="text-sm font-mono">
                {account?.substring(0, 6)}...{account?.substring(account.length - 4)}
              </span>
            </div>
          ) : (
            <button
              onClick={connect}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium transition-opacity"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
