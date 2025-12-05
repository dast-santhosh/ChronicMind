import { useState } from "react";
import { signInWithGoogle } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { SiGoogle } from "react-icons/si";
import { Brain, Shield, Zap, Database } from "lucide-react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast({
        title: "Sign in failed",
        description: error.message || "Could not sign in with Google. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: Brain,
      title: "Smart Memory",
      description: "NLP-powered memory that learns from every conversation",
    },
    {
      icon: Zap,
      title: "Multi-Provider",
      description: "Use OpenAI, Claude, Gemini, and more with your own keys",
    },
    {
      icon: Shield,
      title: "Privacy-First",
      description: "Your data stays in your Google Drive, encrypted",
    },
    {
      icon: Database,
      title: "Persistent Context",
      description: "Every chat builds on your complete history",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-xl">
                  CM
                </div>
                <h1 className="text-3xl font-bold tracking-tight">ChronoMind</h1>
              </div>
              <p className="text-xl text-muted-foreground leading-relaxed">
                The AI memory engine that gives any LLM persistent, intelligent long-term memory.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {features.map((feature) => (
                <div key={feature.title} className="space-y-2 p-4 rounded-lg bg-card border border-card-border">
                  <feature.icon className="w-5 h-5 text-primary" />
                  <h3 className="font-medium text-sm">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          <Card className="border-card-border">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl">Welcome Back</CardTitle>
              <CardDescription>
                Sign in to access your AI memory assistant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button
                data-testid="button-google-signin"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full h-12 text-base gap-3"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <SiGoogle className="w-5 h-5" />
                )}
                {isLoading ? "Signing in..." : "Continue with Google"}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  By signing in, you agree to our Terms of Service and Privacy Policy.
                </p>
                <p className="text-xs text-muted-foreground">
                  Your API keys and data are encrypted and stored securely.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="py-4 text-center text-sm text-muted-foreground">
        ChronoMind - AI Memory Engine
      </footer>
    </div>
  );
}
