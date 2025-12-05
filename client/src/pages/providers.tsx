import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, Check, X, Loader2, ExternalLink, Trash2 } from "lucide-react";
import { SiOpenai, SiGooglegemini } from "react-icons/si";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useProviderStore } from "@/lib/store";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { LLMProvider, ProviderKey } from "@shared/schema";

interface ProviderInfo {
  id: LLMProvider;
  name: string;
  description: string;
  docsUrl: string;
  color: string;
  icon: React.ElementType | null;
}

const providers: ProviderInfo[] = [
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o, GPT-4 Turbo, and GPT-3.5 models",
    docsUrl: "https://platform.openai.com/api-keys",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    icon: SiOpenai,
  },
  {
    id: "claude",
    name: "Anthropic Claude",
    description: "Claude 3.5 Sonnet, Claude 3 Opus, and more",
    docsUrl: "https://console.anthropic.com/settings/keys",
    color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    icon: null,
  },
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Gemini Pro and Gemini Flash models",
    docsUrl: "https://aistudio.google.com/app/apikey",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    icon: SiGooglegemini,
  },
  {
    id: "perplexity",
    name: "Perplexity",
    description: "AI search with real-time web access",
    docsUrl: "https://www.perplexity.ai/settings/api",
    color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    icon: null,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Access multiple AI models through one API",
    docsUrl: "https://openrouter.ai/keys",
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    icon: null,
  },
];

function ProviderIcon({ provider }: { provider: ProviderInfo }) {
  if (provider.icon) {
    const Icon = provider.icon;
    return <Icon className="w-6 h-6" />;
  }
  return (
    <div className="w-6 h-6 rounded bg-current/20 flex items-center justify-center text-xs font-bold">
      {provider.name[0]}
    </div>
  );
}

export default function ProvidersPage() {
  const [editingProvider, setEditingProvider] = useState<ProviderInfo | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [deleteProvider, setDeleteProvider] = useState<ProviderInfo | null>(null);
  const { toast } = useToast();
  const { setProviders, providers: storeProviders, activeProvider, setActiveProvider } = useProviderStore();

  const { data: providerKeys, isLoading } = useQuery<ProviderKey[]>({
    queryKey: ["/api/providers"],
  });

  const hasKey = (providerId: LLMProvider) => {
    return providerKeys?.some(pk => pk.provider === providerId && pk.isActive);
  };

  const saveKeyMutation = useMutation({
    mutationFn: async ({ provider, key }: { provider: LLMProvider; key: string }) => {
      const response = await apiRequest("POST", "/api/providers", {
        provider,
        apiKey: key,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/providers"] });
      setEditingProvider(null);
      setApiKey("");
      toast({
        title: "API key saved",
        description: "Your API key has been securely stored.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save key",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (provider: LLMProvider) => {
      const response = await apiRequest("DELETE", `/api/providers/${provider}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/providers"] });
      setDeleteProvider(null);
      toast({
        title: "API key removed",
        description: "Your API key has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove key",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const testKeyMutation = useMutation({
    mutationFn: async ({ provider, key }: { provider: LLMProvider; key: string }) => {
      const response = await apiRequest("POST", "/api/providers/test", {
        provider,
        apiKey: key,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Connection successful",
        description: "Your API key is valid and working.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection failed",
        description: error.message || "The API key appears to be invalid.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!editingProvider || !apiKey.trim()) return;
    saveKeyMutation.mutate({ provider: editingProvider.id, key: apiKey.trim() });
  };

  const handleTest = () => {
    if (!editingProvider || !apiKey.trim()) return;
    testKeyMutation.mutate({ provider: editingProvider.id, key: apiKey.trim() });
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Providers</h1>
        <p className="text-muted-foreground">
          Connect your API keys to use different AI models
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((provider) => {
          const connected = hasKey(provider.id);
          const isActive = activeProvider === provider.id;

          return (
            <Card
              key={provider.id}
              data-testid={`provider-card-${provider.id}`}
              className={`border-card-border transition-all ${isActive ? "ring-2 ring-primary" : ""}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${provider.color}`}>
                      <ProviderIcon provider={provider} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{provider.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {provider.description}
                      </CardDescription>
                    </div>
                  </div>
                  {connected && (
                    <Badge variant="secondary" className="gap-1 shrink-0">
                      <Check className="w-3 h-3" />
                      Connected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Provider</span>
                  <Switch
                    data-testid={`switch-provider-${provider.id}`}
                    checked={isActive}
                    onCheckedChange={() => setActiveProvider(provider.id)}
                    disabled={!connected}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    data-testid={`button-configure-${provider.id}`}
                    variant={connected ? "secondary" : "default"}
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditingProvider(provider);
                      setApiKey("");
                      setShowKey(false);
                    }}
                  >
                    {connected ? "Update Key" : "Add Key"}
                  </Button>
                  {connected && (
                    <Button
                      data-testid={`button-remove-${provider.id}`}
                      variant="outline"
                      size="icon"
                      onClick={() => setDeleteProvider(provider)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editingProvider} onOpenChange={() => setEditingProvider(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingProvider && (
                <div className={`p-1.5 rounded-lg ${editingProvider.color}`}>
                  <ProviderIcon provider={editingProvider} />
                </div>
              )}
              Configure {editingProvider?.name}
            </DialogTitle>
            <DialogDescription>
              Enter your API key to connect this provider
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  data-testid="input-api-key"
                  type={showKey ? "text" : "password"}
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {editingProvider && (
              <a
                href={editingProvider.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Get your API key
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              data-testid="button-test-key"
              variant="outline"
              onClick={handleTest}
              disabled={!apiKey.trim() || testKeyMutation.isPending}
            >
              {testKeyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Test Connection"
              )}
            </Button>
            <Button
              data-testid="button-save-key"
              onClick={handleSave}
              disabled={!apiKey.trim() || saveKeyMutation.isPending}
            >
              {saveKeyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save Key"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteProvider} onOpenChange={() => setDeleteProvider(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove your {deleteProvider?.name} API key? You'll need to add it again to use this provider.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete"
              onClick={() => deleteProvider && deleteKeyMutation.mutate(deleteProvider.id)}
              className="bg-destructive text-destructive-foreground"
            >
              {deleteKeyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
