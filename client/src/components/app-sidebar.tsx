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

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "My Bots", url: "/bots", icon: Bot },
  { title: "Sources", url: "/sources", icon: Rss },
  { title: "Reports", url: "/reports", icon: FileBarChart },
  { title: "Drafts", url: "/drafts", icon: CheckCircle },
  { title: "Items", url: "/items", icon: FileText },
  { title: "Observe", url: "/observe", icon: Eye },
  { title: "Console", url: "/chat", icon: MessageCircle },
  { title: "Guide", url: "/guide", icon: BookOpen },
  { title: "Settings", url: "/settings", icon: Settings },
];

interface BotInfo {
  id: number;
  key: string;
  name: string;
  isEnabled: boolean;
}

export function AppSidebar() {
  const [location] = useLocation();

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
            <span className="text-xs text-muted-foreground">Workflow Designer</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {activeBots.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Active Bots</SidebarGroupLabel>
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
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
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
          makelr.com Bot v1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
