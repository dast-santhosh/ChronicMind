import { Brain, Moon, Sun, Bell, Shield, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUIStore, useMemoryStore } from "@/lib/store";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { theme, setTheme } = useUIStore();
  const { isMemoryEnabled, setMemoryEnabled } = useMemoryStore();
  const { toast } = useToast();

  const clearMemoryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/memory/clear");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memory"] });
      toast({
        title: "Memory cleared",
        description: "All your AI memory has been deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to clear memory",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/conversations/clear");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "History cleared",
        description: "All your conversations have been deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to clear history",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Customize your ChronoMind experience
        </p>
      </div>

      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how ChronoMind looks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Dark Mode</Label>
              <p className="text-sm text-muted-foreground">
                Switch between light and dark themes
              </p>
            </div>
            <Switch
              data-testid="switch-dark-mode"
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Memory
          </CardTitle>
          <CardDescription>
            Configure AI memory behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Memory</Label>
              <p className="text-sm text-muted-foreground">
                Use memory context in AI responses
              </p>
            </div>
            <Switch
              data-testid="switch-memory-enabled"
              checked={isMemoryEnabled}
              onCheckedChange={setMemoryEnabled}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Clear All Memory</Label>
              <p className="text-sm text-muted-foreground">
                Delete all stored facts, summaries, and embeddings
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  data-testid="button-clear-memory"
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Memory
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Memory</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your AI memory including facts, summaries, and embeddings. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    data-testid="button-confirm-clear-memory"
                    onClick={() => clearMemoryMutation.mutate()}
                    className="bg-destructive text-destructive-foreground"
                  >
                    {clearMemoryMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Clear Memory"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Manage your conversation data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Clear Conversation History</Label>
              <p className="text-sm text-muted-foreground">
                Delete all past conversations
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  data-testid="button-clear-history"
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear History
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Conversation History</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your conversations. Your memory (facts, summaries) will be preserved. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    data-testid="button-confirm-clear-history"
                    onClick={() => clearHistoryMutation.mutate()}
                    className="bg-destructive text-destructive-foreground"
                  >
                    {clearHistoryMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Clear History"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Card className="border-card-border bg-muted/30">
        <CardContent className="p-4">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-lg font-semibold">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                CM
              </div>
              ChronoMind
            </div>
            <p className="text-sm text-muted-foreground">
              AI Memory Engine v1.0.0
            </p>
            <p className="text-xs text-muted-foreground">
              Built with privacy-first architecture
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
