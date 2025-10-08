import { Outlet } from 'react-router-dom';
import { AppBar } from './AppBar';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <AppBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
