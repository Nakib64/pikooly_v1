"use client";
import { useState, useEffect } from "react";
import { Download, Check, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/seo/SEOHead";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <main className="min-h-[45vh] flex items-center justify-center px-4 py-16 pb-24 md:pb-16">
      <SEOHead title="Install Pikooly App" description="Install the Pikooly app on your phone for a faster, offline shopping experience." noindex />
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Smartphone className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground">Install Pikooly App</h1>
        <p className="text-muted-foreground">
          Install our app on your phone for a faster, offline-ready shopping experience. No app store needed!
        </p>

        {isInstalled ? (
          <div className="flex items-center justify-center gap-2 text-primary font-medium">
            <Check className="w-5 h-5" /> App is already installed!
          </div>
        ) : deferredPrompt ? (
          <Button size="lg" onClick={handleInstall} className="gap-2">
            <Download className="w-5 h-5" /> Install Now
          </Button>
        ) : (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">How to install:</p>
            <div className="text-left space-y-2 bg-muted/50 rounded-xl p-4">
              <p><strong>Android (Chrome):</strong> Tap the menu (⋮) → "Add to Home screen"</p>
              <p><strong>iPhone (Safari):</strong> Tap Share (□↑) → "Add to Home Screen"</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default Install;
