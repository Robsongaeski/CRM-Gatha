import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';
import { QuickAccessBar } from './QuickAccessBar';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <QuickAccessBar />
        <div className="flex-1 min-w-0 flex flex-col">
          <Header />
          <main className="flex-1 min-w-0 p-6 bg-muted/30 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
