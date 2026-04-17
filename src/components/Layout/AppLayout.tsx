import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';
import { QuickAccessBar } from './QuickAccessBar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const isWhatsappChatMobile =
    isMobile &&
    location.pathname === '/whatsapp/atendimento' &&
    new URLSearchParams(location.search).has('cid');

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        {!isWhatsappChatMobile && <QuickAccessBar />}
        <div className="flex-1 min-w-0 flex flex-col">
          {!isWhatsappChatMobile && <Header />}
          <main
            className={cn(
              'flex-1 min-w-0 overflow-x-hidden',
              isWhatsappChatMobile ? 'h-[100dvh] overflow-hidden bg-[#f0f2f5] p-0' : 'bg-muted/30 p-6'
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
