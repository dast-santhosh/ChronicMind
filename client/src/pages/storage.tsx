import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Cloud, HardDrive, Database, Check, RefreshCw, Loader2, Shield, ExternalLink } from "lucide-react";
import { SiGoogledrive, SiFirebase } from "react-icons/si";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useStorageStore } from "@/lib/store";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { StorageSettings, StorageMode } from "@shared/schema";
import { format } from "date-fns";

interface StorageOption {
  id: StorageMode;
  name: string;
  description: string;
  icon: React.ElementType;
  available: boolean;
  requiresSetup: boolean;
}

const storageOptions: StorageOption[] = [
  {
    id: "googledrive",
    name: "Google Drive",
    description: "Store encrypted memory files in your personal Google Drive",
    icon: SiGoogledrive,
    available: true,
    requiresSetup: true,
  },
  {
    id: "local",
    name: "Local Storage",
    description: "Store memory on your device (Desktop app only)",
    icon: HardDrive,
    available: false,
    requiresSetup: false,
  },
  {
    id: "firestore",
    name: "Cloud Sync",
    description: "Sync across devices with Firebase (Coming soon)",
    icon: SiFirebase,
    available: false,
    requiresSetup: true,
  },
];

export default function StoragePage() {
  const { toast } = useToast();
  const { storageMode, setStorageMode, driveConnected, setDriveConnected, lastSyncAt, setLastSyncAt } = useStorageStore();

  const { data: settings, isLoading } = useQuery<StorageSettings>({
    queryKey: ["/api/storage/settings"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<StorageSettings>) => {
      const response = await apiRequest("PATCH", "/api/storage/settings", updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/storage/settings"] });
      toast({
        title: "Settings updated",
        description: "Your storage settings have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update settings",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const connectDriveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/storage/drive/connect");
      return response.json();
    },
    onSuccess: (data) => {
      setDriveConnected(true);
      queryClient.invalidateQueries({ queryKey: ["/api/storage/settings"] });
      toast({
        title: "Google Drive connected",
        description: "Your memory will be stored in your Google Drive.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to connect",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/storage/sync");
      return response.json();
    },
    onSuccess: () => {
      setLastSyncAt(new Date());
      queryClient.invalidateQueries({ queryKey: ["/api/storage/settings"] });
      toast({
        title: "Sync complete",
        description: "Your memory has been synchronized.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const displaySettings = settings || {
    storageMode,
    driveConnected,
    encryptionEnabled: true,
    autoSync: true,
    lastSyncAt,
  };

  const handleStorageChange = (mode: StorageMode) => {
    if (!storageOptions.find(o => o.id === mode)?.available) {
      toast({
        title: "Not available",
        description: "This storage option is not available for web.",
        variant: "destructive",
      });
      return;
    }
    setStorageMode(mode);
    updateSettingsMutation.mutate({ storageMode: mode });
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Storage</h1>
        <p className="text-muted-foreground">
          Configure where your AI memory is stored
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Storage Location</h2>
        <div className="grid gap-4">
          {storageOptions.map((option) => {
            const isSelected = displaySettings.storageMode === option.id;
            const Icon = option.icon;

            return (
              <Card
                key={option.id}
                data-testid={`storage-option-${option.id}`}
                className={`border-card-border cursor-pointer transition-all ${
                  isSelected ? "ring-2 ring-primary" : ""
                } ${!option.available ? "opacity-50" : ""}`}
                onClick={() => handleStorageChange(option.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${isSelected ? "bg-primary/10" : "bg-muted"}`}>
                      <Icon className={`w-6 h-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{option.name}</h3>
                        {!option.available && (
                          <Badge variant="secondary" className="text-xs">
                            Web Not Supported
                          </Badge>
                        )}
                        {isSelected && (
                          <Badge variant="default" className="text-xs gap-1">
                            <Check className="w-3 h-3" />
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {option.description}
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {displaySettings.storageMode === "googledrive" && (
        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SiGoogledrive className="w-5 h-5" />
              Google Drive Connection
            </CardTitle>
            <CardDescription>
              Manage your Google Drive integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {displaySettings.driveConnected ? (
              <>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="font-medium text-green-700 dark:text-green-400">
                      Connected to Google Drive
                    </span>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Last Synced</p>
                    <p className="text-sm text-muted-foreground">
                      {displaySettings.lastSyncAt
                        ? format(new Date(displaySettings.lastSyncAt), "MMM d, yyyy h:mm a")
                        : "Never"}
                    </p>
                  </div>
                  <Button
                    data-testid="button-sync"
                    variant="outline"
                    size="sm"
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending}
                  >
                    {syncMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Sync Now
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Connect your Google Drive to securely store your AI memory files.
                </p>
                <Button
                  data-testid="button-connect-drive"
                  onClick={() => connectDriveMutation.mutate()}
                  disabled={connectDriveMutation.isPending}
                  className="w-full"
                >
                  {connectDriveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <SiGoogledrive className="w-4 h-4 mr-2" />
                  )}
                  Connect Google Drive
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Configure encryption and sync options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Encryption</Label>
              <p className="text-sm text-muted-foreground">
                Encrypt memory files before storage
              </p>
            </div>
            <Switch
              data-testid="switch-encryption"
              checked={displaySettings.encryptionEnabled}
              onCheckedChange={(checked) => {
                updateSettingsMutation.mutate({ encryptionEnabled: checked });
              }}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Sync</Label>
              <p className="text-sm text-muted-foreground">
                Automatically sync after each conversation
              </p>
            </div>
            <Switch
              data-testid="switch-autosync"
              checked={displaySettings.autoSync}
              onCheckedChange={(checked) => {
                updateSettingsMutation.mutate({ autoSync: checked });
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-card-border bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Your data is private</p>
              <p className="text-sm text-muted-foreground">
                ChronoMind stores your memory in your own Google Drive account. 
                Files are encrypted before upload and only you have access.
                We never store or access your memory data on our servers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
