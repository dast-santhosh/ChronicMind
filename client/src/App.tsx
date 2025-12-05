import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider, ThemeToggle } from "@/components/theme-provider";
import { AppSidebar, AppSidebarTrigger } from "@/components/app-sidebar";
import { useAuthStore, useUIStore, useProviderStore } from "@/lib/store";
import { onAuthChange, getIdToken } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import LoginPage from "@/pages/login";
import ChatPage from "@/pages/chat";
import MemoryPage from "@/pages/memory";
import ProvidersPage from "@/pages/providers";
import StoragePage from "@/pages/storage";
import HistoryPage from "@/pages/history";
import SettingsPage from "@/pages/settings";

function MainContent() {
  const { activeView } = useUIStore();

  switch (activeView) {
    case "chat":
      return <ChatPage />;
    case "memory":
      return <MemoryPage />;
    case "providers":
      return <ProvidersPage />;
    case "storage":
      return <StoragePage />;
    case "history":
      return <HistoryPage />;
    case "settings":
      return <SettingsPage />;
    default:
      return <ChatPage />;
  }
}

function AuthenticatedLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-4 p-3 border-b border-border shrink-0">
            <AppSidebarTrigger />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-hidden">
            <MainContent />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { firebaseUser, isLoading, setFirebaseUser, setUser, setLoading } = useAuthStore();
  const { setProviders } = useProviderStore();

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setFirebaseUser(user);
      
      if (user) {
        try {
          const token = await getIdToken();
          if (token) {
            const response = await apiRequest("POST", "/api/auth/login", {
              idToken: token,
            });
            const userData = await response.json();
            setUser(userData.user);
            
            if (userData.providers) {
              const providerConfigs = userData.providers.map((p: any) => ({
                provider: p.provider,
                hasKey: true,
                isActive: p.isActive,
              }));
              setProviders(providerConfigs);
            }
          }
        } catch (error) {
          console.error("Failed to sync user:", error);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setFirebaseUser, setUser, setLoading, setProviders]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl animate-pulse">
            CM
          </div>
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <LoginPage />;
  }

  return <AuthenticatedLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
