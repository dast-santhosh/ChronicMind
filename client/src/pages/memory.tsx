import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Brain, Lightbulb, Target, Wrench, FolderKanban, User, Clock, Hash, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemoryStore } from "@/lib/store";
import type { MemoryFact, MemorySummary } from "@shared/schema";
import { format } from "date-fns";

const categoryIcons: Record<string, React.ElementType> = {
  preferences: Lightbulb,
  goals: Target,
  constraints: Wrench,
  skills: TrendingUp,
  projects: FolderKanban,
  personal: User,
};

const categoryColors: Record<string, string> = {
  preferences: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  goals: "bg-green-500/10 text-green-500 border-green-500/20",
  constraints: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  skills: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  projects: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  personal: "bg-pink-500/10 text-pink-500 border-pink-500/20",
};

function FactCard({ fact }: { fact: MemoryFact }) {
  const Icon = categoryIcons[fact.category] || Brain;
  const colorClass = categoryColors[fact.category] || "bg-muted text-muted-foreground";

  return (
    <Card data-testid={`fact-card-${fact.id}`} className="border-card-border">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className={`${colorClass} gap-1`}>
            <Icon className="w-3 h-3" />
            {fact.category}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(fact.updatedAt), "MMM d, yyyy")}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="font-medium text-sm">{fact.key}</p>
        <p className="text-sm text-muted-foreground">{fact.value}</p>
        {fact.confidence < 1 && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${fact.confidence * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {Math.round(fact.confidence * 100)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryCard({ summary }: { summary: MemorySummary }) {
  return (
    <Card data-testid={`summary-card-${summary.id}`} className="border-card-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {format(new Date(summary.periodStart), "MMM d")} - {format(new Date(summary.periodEnd), "MMM d, yyyy")}
            </span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {summary.messageCount} messages
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed">{summary.content}</p>
      </CardContent>
    </Card>
  );
}

function StatsCard({ title, value, icon: Icon, description }: {
  title: string;
  value: number;
  icon: React.ElementType;
  description: string;
}) {
  return (
    <Card className="border-card-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MemoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const { facts, summaries, embeddingCount, setFacts, setSummaries, setEmbeddingCount } = useMemoryStore();

  const { data: factsData, isLoading: factsLoading } = useQuery<MemoryFact[]>({
    queryKey: ["/api/memory/facts"],
  });

  const { data: summariesData, isLoading: summariesLoading } = useQuery<MemorySummary[]>({
    queryKey: ["/api/memory/summaries"],
  });

  const { data: statsData } = useQuery<{ embeddingCount: number }>({
    queryKey: ["/api/memory/stats"],
  });

  const displayFacts = factsData || facts;
  const displaySummaries = summariesData || summaries;
  const displayEmbeddingCount = statsData?.embeddingCount || embeddingCount;

  const filteredFacts = displayFacts.filter(fact => {
    const matchesSearch = searchQuery === "" || 
      fact.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fact.value.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || fact.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", ...Object.keys(categoryIcons)];

  const categoryStats = displayFacts.reduce((acc, fact) => {
    acc[fact.category] = (acc[fact.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Memory</h1>
            <p className="text-muted-foreground">Your AI's learned knowledge and context</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard title="Facts" value={displayFacts.length} icon={Brain} description="Stored knowledge" />
          <StatsCard title="Summaries" value={displaySummaries.length} icon={Clock} description="Context snapshots" />
          <StatsCard title="Embeddings" value={displayEmbeddingCount} icon={Hash} description="Semantic vectors" />
          <StatsCard title="Categories" value={Object.keys(categoryStats).length} icon={FolderKanban} description="Knowledge types" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="facts" className="h-full flex flex-col">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between gap-4">
              <TabsList>
                <TabsTrigger data-testid="tab-facts" value="facts">Facts</TabsTrigger>
                <TabsTrigger data-testid="tab-summaries" value="summaries">Summaries</TabsTrigger>
                <TabsTrigger data-testid="tab-embeddings" value="embeddings">Embeddings</TabsTrigger>
              </TabsList>

              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  data-testid="input-memory-search"
                  placeholder="Search memories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <TabsContent value="facts" className="mt-0 p-6">
              <div className="flex gap-2 mb-6 flex-wrap">
                {categories.map((cat) => (
                  <Badge
                    key={cat}
                    data-testid={`filter-${cat}`}
                    variant={activeCategory === cat ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat === "all" ? "All" : cat}
                    {cat !== "all" && categoryStats[cat] && (
                      <span className="ml-1 opacity-60">({categoryStats[cat]})</span>
                    )}
                  </Badge>
                ))}
              </div>

              {factsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="border-card-border">
                      <CardHeader className="pb-2">
                        <Skeleton className="h-5 w-20" />
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredFacts.length === 0 ? (
                <div className="text-center py-12">
                  <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-1">No memories yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Start chatting to build your AI's memory
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFacts.map((fact) => (
                    <FactCard key={fact.id} fact={fact} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="summaries" className="mt-0 p-6">
              {summariesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="border-card-border">
                      <CardHeader className="pb-2">
                        <Skeleton className="h-5 w-40" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-16 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : displaySummaries.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-1">No summaries yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Summaries are generated as you have more conversations
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-w-3xl">
                  {displaySummaries.map((summary) => (
                    <SummaryCard key={summary.id} summary={summary} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="embeddings" className="mt-0 p-6">
              <div className="max-w-3xl">
                <Card className="border-card-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Hash className="w-5 h-5" />
                      Vector Embeddings
                    </CardTitle>
                    <CardDescription>
                      Semantic representations of your conversations for intelligent retrieval
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">Total Embeddings</p>
                        <p className="text-sm text-muted-foreground">
                          Vector representations stored for semantic search
                        </p>
                      </div>
                      <p className="text-3xl font-bold">{displayEmbeddingCount}</p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">How it works</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">1.</span>
                          Each message is converted into a vector embedding
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">2.</span>
                          When you send a new message, we find similar past conversations
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">3.</span>
                          Relevant context is injected into your AI's prompt
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}
