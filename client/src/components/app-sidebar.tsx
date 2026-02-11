import { LayoutDashboard, FileText, Rss, CheckCircle, Settings, Eye, FileBarChart, MessageCircle, Bot, BookOpen } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-provider";

interface BotInfo {
  id: number;
  key: string;
  name: string;
  isEnabled: boolean;
}

type MenuItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  translationKey: string;
};

export function AppSidebar() {
  const [location] = useLocation();
  const { t } = useLanguage();

  const menuItems: MenuItem[] = [
    { title: t("sidebar.dashboard"), url: "/", icon: LayoutDashboard, translationKey: "sidebar.dashboard" },
    { title: t("sidebar.myBots"), url: "/bots", icon: Bot, translationKey: "sidebar.myBots" },
    { title: t("sidebar.sources"), url: "/sources", icon: Rss, translationKey: "sidebar.sources" },
    { title: t("sidebar.reports"), url: "/reports", icon: FileBarChart, translationKey: "sidebar.reports" },
    { title: t("sidebar.drafts"), url: "/drafts", icon: CheckCircle, translationKey: "sidebar.drafts" },
    { title: t("sidebar.items"), url: "/items", icon: FileText, translationKey: "sidebar.items" },
    { title: t("sidebar.observe"), url: "/observe", icon: Eye, translationKey: "sidebar.observe" },
    { title: t("sidebar.console"), url: "/chat", icon: MessageCircle, translationKey: "sidebar.console" },
    { title: t("sidebar.guide"), url: "/guide", icon: BookOpen, translationKey: "sidebar.guide" },
    { title: t("sidebar.settings"), url: "/settings", icon: Settings, translationKey: "sidebar.settings" },
  ];

  const { data: botsResponse } = useQuery<{ bots: BotInfo[] }>({
    queryKey: ["/api/bots"],
    queryFn: () => fetch("/api/bots", { credentials: "include" }).then(r => {
      if (!r.ok) return { bots: [] };
      return r.json();
    }),
  });

  const activeBots = (botsResponse?.bots ?? []).filter(b => b.isEnabled);

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">M</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">Makelr</span>
            <span className="text-xs text-muted-foreground">{t("sidebar.subtitle")}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {activeBots.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("sidebar.activeBots")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-2 pb-1 flex flex-wrap gap-1" data-testid="active-bots-list">
                {activeBots.map(bot => (
                  <Link key={bot.id} href={`/bots/${bot.id}`}>
                    <Badge
                      variant="secondary"
                      className="cursor-pointer text-xs"
                      data-testid={`badge-bot-${bot.key}`}
                    >
                      {bot.key}
                    </Badge>
                  </Link>
                ))}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url || (item.url !== "/" && location.startsWith(item.url))}
                  >
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-muted-foreground">
          {t("sidebar.footer")}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
