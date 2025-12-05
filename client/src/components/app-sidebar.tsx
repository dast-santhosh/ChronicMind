import { MessageSquare, Brain, Key, HardDrive, History, Settings, LogOut, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuthStore, useUIStore } from "@/lib/store";
import { logOut } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

const menuItems = [
  { id: "chat" as const, title: "Chat", icon: MessageSquare },
  { id: "memory" as const, title: "Memory", icon: Brain },
  { id: "providers" as const, title: "Providers", icon: Key },
  { id: "storage" as const, title: "Storage", icon: HardDrive },
  { id: "history" as const, title: "History", icon: History },
  { id: "settings" as const, title: "Settings", icon: Settings },
];

export function AppSidebar() {
  const { firebaseUser } = useAuthStore();
  const { activeView, setActiveView } = useUIStore();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const userInitials = firebaseUser?.displayName
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "CM";

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            CM
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sidebar-foreground">ChronoMind</span>
            <span className="text-xs text-muted-foreground">AI Memory Engine</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={activeView === item.id}
                    className="w-full"
                  >
                    <button
                      data-testid={`nav-${item.id}`}
                      onClick={() => setActiveView(item.id)}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors"
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Separator className="mb-4" />
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9">
            <AvatarImage src={firebaseUser?.photoURL || ""} alt={firebaseUser?.displayName || "User"} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-sidebar-foreground">
              {firebaseUser?.displayName || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {firebaseUser?.email || ""}
            </p>
          </div>
          <Button
            data-testid="button-logout"
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppSidebarTrigger() {
  return (
    <SidebarTrigger data-testid="button-sidebar-toggle" className="p-2">
      <Menu className="w-5 h-5" />
    </SidebarTrigger>
  );
}
