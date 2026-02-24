import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageProvider } from "@/lib/language-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/lib/language-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { ShareButton } from "@/components/share-button";
import { PermissionRequestProvider } from "@/lib/permission-request-context";
import { ErrorBoundary } from "@/components/error-boundary";

import Dashboard from "@/pages/dashboard";
import Items from "@/pages/items";
import ItemDetail from "@/pages/item-detail";
import Drafts from "@/pages/drafts";
import Observe from "@/pages/observe";
import Reports from "@/pages/reports";
import Sources from "@/pages/sources";
import Settings from "@/pages/settings";
import Chat from "@/pages/chat";
import Profiles from "@/pages/profiles";
import ProfileDetail from "@/pages/profile-detail";
import BotDetail from "@/pages/bot-detail";
import Landing from "@/pages/landing";
import Guide from "@/pages/guide";
import Permissions from "@/pages/permissions";
import DemoProgress from "@/pages/DemoProgress";
import DemoReport from "@/pages/DemoReport";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/bots" component={Profiles} />
      <Route path="/profiles" component={Profiles} />
      <Route path="/profiles/:id" component={ProfileDetail} />
      <Route path="/bots/:id" component={BotDetail} />
      <Route path="/items" component={Items} />
      <Route path="/items/:id" component={ItemDetail} />
      <Route path="/drafts" component={Drafts} />
      <Route path="/observe" component={Observe} />
      <Route path="/reports" component={Reports} />
      <Route path="/sources" component={Sources} />
      <Route path="/settings" component={Settings} />
      <Route path="/permissions" component={Permissions} />
      <Route path="/chat" component={Chat} />
      <Route path="/guide" component={Guide} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.email?.[0]?.toUpperCase() || "U";

  return (
    <PermissionRequestProvider>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between p-3 border-b border-border bg-background shrink-0">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex items-center gap-3">
                <ShareButton />
                <LanguageSwitcher />
                <ThemeToggle />
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <Button variant="ghost" size="sm" asChild data-testid="button-logout">
                    <a href="/api/logout">{t("header.logout")}</a>
                  </Button>
                </div>
              </div>
            </header>
            <main className="flex-1 overflow-auto bg-muted/30">
              <ErrorBoundary>
                <Router />
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </PermissionRequestProvider>
  );
}

function AppContent() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/demo/progress/:jobId" component={DemoProgress} />
        <Route path="/demo/report/:jobId" component={DemoReport} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <LanguageProvider defaultLanguage="en">
          <TooltipProvider>
            <AppContent />
            <Toaster />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
