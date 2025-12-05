import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, MessageSquare, Calendar, Trash2, ChevronDown, ChevronRight, Download, FileText, FileJson, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChatStore } from "@/lib/store";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Conversation, Message } from "@shared/schema";
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";

interface ConversationWithMessages extends Conversation {
  messages?: Message[];
  messageCount?: number;
}

function groupConversationsByDate(conversations: ConversationWithMessages[]) {
  const groups: Record<string, ConversationWithMessages[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    "This Month": [],
    Earlier: [],
  };

  conversations.forEach((conv) => {
    const date = new Date(conv.createdAt);
    if (isToday(date)) {
      groups["Today"].push(conv);
    } else if (isYesterday(date)) {
      groups["Yesterday"].push(conv);
    } else if (isThisWeek(date)) {
      groups["This Week"].push(conv);
    } else if (isThisMonth(date)) {
      groups["This Month"].push(conv);
    } else {
      groups["Earlier"].push(conv);
    }
  });

  return Object.entries(groups).filter(([_, convs]) => convs.length > 0);
}

function ConversationCard({ conversation, onSelect, onDelete }: {
  conversation: ConversationWithMessages;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", conversation.id],
    enabled: isOpen,
  });

  const firstMessage = messages?.[0]?.content?.slice(0, 100);

  return (
    <Card
      data-testid={`conversation-card-${conversation.id}`}
      className="border-card-border"
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="p-4">
          <div className="flex items-start justify-between gap-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-start gap-3 text-left flex-1 hover-elevate active-elevate-2 rounded-md p-1 -m-1">
                <div className="mt-1">
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{conversation.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(conversation.createdAt), "h:mm a")}
                    </span>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      {conversation.provider}
                    </Badge>
                    {conversation.messageCount && (
                      <span className="text-xs text-muted-foreground">
                        {conversation.messageCount} messages
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </CollapsibleTrigger>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                data-testid={`button-open-${conversation.id}`}
                variant="ghost"
                size="sm"
                onClick={onSelect}
              >
                Open
              </Button>
              <Button
                data-testid={`button-delete-${conversation.id}`}
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {messages.slice(0, 6).map((message) => (
                  <div
                    key={message.id}
                    className={`text-sm p-2 rounded-lg ${
                      message.role === "user"
                        ? "bg-primary/10 ml-8"
                        : "bg-muted mr-8"
                    }`}
                  >
                    <p className="text-xs font-medium mb-1 capitalize text-muted-foreground">
                      {message.role}
                    </p>
                    <p className="line-clamp-3">{message.content}</p>
                  </div>
                ))}
                {messages.length > 6 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{messages.length - 6} more messages
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No messages</p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConversation, setDeleteConversation] = useState<Conversation | null>(null);
  const { setCurrentConversation, setMessages } = useChatStore();
  const { toast } = useToast();

  const { data: conversations, isLoading } = useQuery<ConversationWithMessages[]>({
    queryKey: ["/api/conversations"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/conversations/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setDeleteConversation(null);
      toast({
        title: "Conversation deleted",
        description: "The conversation has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSelectConversation = async (conversation: Conversation) => {
    setCurrentConversation(conversation);
    const response = await apiRequest("GET", `/api/messages?conversationId=${conversation.id}`);
    const messages = await response.json();
    setMessages(messages);
  };

  const handleExport = async (format: "json" | "txt") => {
    try {
      const response = await apiRequest("GET", `/api/conversations/export?format=${format}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chronomind-history.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredConversations = conversations?.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const groupedConversations = groupConversationsByDate(filteredConversations);

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">History</h1>
            <p className="text-muted-foreground">
              Browse and manage your conversation history
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button data-testid="button-export" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("json")}>
                <FileJson className="w-4 h-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("txt")}>
                <FileText className="w-4 h-4 mr-2" />
                Export as Text
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-history-search"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="border-card-border">
                  <CardHeader className="p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="w-4 h-4" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : groupedConversations.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-1">No conversations yet</h3>
              <p className="text-sm text-muted-foreground">
                Start a chat to see your history here
              </p>
            </div>
          ) : (
            groupedConversations.map(([group, convs]) => (
              <div key={group} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">{group}</h2>
                  <span className="text-xs text-muted-foreground">({convs.length})</span>
                </div>
                <div className="space-y-2">
                  {convs.map((conv) => (
                    <ConversationCard
                      key={conv.id}
                      conversation={conv}
                      onSelect={() => handleSelectConversation(conv)}
                      onDelete={() => setDeleteConversation(conv)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <AlertDialog open={!!deleteConversation} onOpenChange={() => setDeleteConversation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConversation?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete-conversation"
              onClick={() => deleteConversation && deleteMutation.mutate(deleteConversation.id)}
              className="bg-destructive text-destructive-foreground"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
