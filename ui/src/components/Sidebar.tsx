import { Link, useLocation } from 'react-router-dom';
import { Shield, Coins, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './theme-provider';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    {
      path: '/governance',
      label: 'Governance',
      icon: Shield,
    },
    {
      path: '/tokens',
      label: 'Tokens',
      icon: Coins,
    },
  ];

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-full">
      <div className="p-6">
        <h2 className="text-2xl font-bold tracking-tight">Keritoken</h2>
      </div>
      <nav className="space-y-1 px-3 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="w-full justify-start gap-3"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="h-5 w-5" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="h-5 w-5" />
              <span>Dark Mode</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
