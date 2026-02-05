import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

interface ProfileConfig {
  scheduleRule?: "DAILY" | "WEEKDAYS" | "WEEKENDS";
  sections?: {
    tldr?: boolean;
    drivers?: boolean;
    risk?: boolean;
    checklist?: boolean;
    sources?: boolean;
  };
  verbosity?: "short" | "normal" | "detailed";
  markdownLevel?: "minimal" | "normal";
  filters?: {
    minImportanceScore?: number;
    maxRiskLevelAllowed?: number;
    allowPromotionLinks?: boolean;
  };
}

interface Profile {
  id: number;
  userId: string;
  presetId: number;
  name: string;
  topic: string;
  variantKey: string | null;
  timezone: string;
  scheduleCron: string;
  configJson: ProfileConfig;
  isActive: boolean;
  createdAt: string;
  presetName: string;
}

interface Source {
  id: number;
  name: string;
  url: string;
  topic: string;
  enabled: boolean;
  isDefault: boolean;
  userId: string | null;
}

const timezones = [
  "Asia/Seoul",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "UTC",
];

const scheduleTimePresets = [
  { label: "7:00 AM", value: "07:00" },
  { label: "8:00 AM", value: "08:00" },
  { label: "9:00 AM", value: "09:00" },
  { label: "6:00 PM", value: "18:00" },
  { label: "10:00 PM", value: "22:00" },
];

const defaultSections = {
  tldr: true,
  drivers: true,
  risk: true,
  checklist: true,
  sources: true,
};

export default function ProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [timezone, setTimezone] = useState("Asia/Seoul");
  const [scheduleTime, setScheduleTime] = useState("07:00");
  const [scheduleRule, setScheduleRule] = useState<"DAILY" | "WEEKDAYS" | "WEEKENDS">("DAILY");
  const [verbosity, setVerbosity] = useState<"short" | "normal" | "detailed">("normal");
  const [markdownLevel, setMarkdownLevel] = useState<"minimal" | "normal">("minimal");
  const [sections, setSections] = useState(defaultSections);
  const [minImportanceScore, setMinImportanceScore] = useState(30);
  const [selectedSourceIds, setSelectedSourceIds] = useState<number[]>([]);

  const { data: profile, isLoading: profileLoading } = useQuery<Profile>({
    queryKey: ["/api/profiles", id],
    enabled: !!id,
  });

  const { data: availableSources = [] } = useQuery<Source[]>({
    queryKey: ["/api/user-sources", "topic", profile?.topic],
    enabled: !!profile?.topic,
    queryFn: async () => {
      const res = await fetch(`/api/user-sources?topic=${profile?.topic}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sources");
      return res.json();
    },
  });

  const { data: profileSources = [] } = useQuery<Source[]>({
    queryKey: ["/api/profiles", id, "sources"],
    enabled: !!id,
  });

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setIsActive(profile.isActive);
      setTimezone(profile.timezone);
      
      // Parse cron to get time (format: "0 H * * *" or "0 H * * 1-5")
      const cronParts = profile.scheduleCron.split(" ");
      if (cronParts.length >= 2) {
        const hour = cronParts[1].padStart(2, "0");
        setScheduleTime(`${hour}:00`);
      }
      
      const config = profile.configJson || {};
      setScheduleRule(config.scheduleRule || "DAILY");
      setVerbosity(config.verbosity || "normal");
      setMarkdownLevel(config.markdownLevel || "minimal");
      setSections({ ...defaultSections, ...config.sections });
      setMinImportanceScore(config.filters?.minImportanceScore ?? 30);
    }
  }, [profile]);

  useEffect(() => {
    if (profileSources.length > 0) {
      setSelectedSourceIds(profileSources.map((s) => s.id));
    }
  }, [profileSources]);

  // Build cron from scheduleTime and scheduleRule
  const buildCron = () => {
    const hour = parseInt(scheduleTime.split(":")[0]);
    switch (scheduleRule) {
      case "WEEKDAYS":
        return `0 ${hour} * * 1-5`;
      case "WEEKENDS":
        return `0 ${hour} * * 0,6`;
      default:
        return `0 ${hour} * * *`;
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const configJson: ProfileConfig = {
        scheduleRule,
        sections,
        verbosity,
        markdownLevel,
        filters: {
          minImportanceScore,
        },
      };
      
      await apiRequest("PUT", `/api/profiles/${id}`, {
        name,
        isActive,
        timezone,
        scheduleCron: buildCron(),
        configJson,
      });
      
      await apiRequest("PUT", `/api/profiles/${id}/sources`, {
        sourceIds: selectedSourceIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", id] });
      toast({ title: "Profile saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save profile", variant: "destructive" });
    },
  });

  const toggleSource = (sourceId: number) => {
    setSelectedSourceIds((prev) =>
      prev.includes(sourceId)
        ? prev.filter((id) => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getTopicColor = (topic: string) => {
    const colors: Record<string, string> = {
      investing: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      ai_art: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      tech: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      crypto: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    };
    return colors[topic] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <p className="text-muted-foreground">Profile not found</p>
        <Button variant="ghost" onClick={() => setLocation("/profiles")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Profiles
        </Button>
      </div>
    );
  }

  const filteredSources = availableSources.filter((s) => s.topic === profile.topic);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/profiles")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Edit Bot</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-muted-foreground">{profile.presetName}</span>
            <Badge className={getTopicColor(profile.topic)}>{profile.topic}</Badge>
          </div>
        </div>
        <Button 
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          data-testid="button-save"
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Settings</CardTitle>
            <CardDescription>Configure your bot's name and activation status</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Bot Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-name"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">Enable or disable this bot</p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                data-testid="toggle-active"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>When should this bot run?</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger data-testid="select-timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Run Days</Label>
              <Select value={scheduleRule} onValueChange={(v) => setScheduleRule(v as typeof scheduleRule)}>
                <SelectTrigger data-testid="select-schedule-rule">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Every Day</SelectItem>
                  <SelectItem value="WEEKDAYS">Weekdays Only (Mon-Fri)</SelectItem>
                  <SelectItem value="WEEKENDS">Weekends Only (Sat-Sun)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Run Time</Label>
              <Select value={scheduleTime} onValueChange={setScheduleTime}>
                <SelectTrigger data-testid="select-schedule-time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scheduleTimePresets.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Report Format</CardTitle>
            <CardDescription>Customize how your reports look</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-2">
              <Label>Report Length</Label>
              <Select value={verbosity} onValueChange={(v) => setVerbosity(v as typeof verbosity)}>
                <SelectTrigger data-testid="select-verbosity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short (Brief summary)</SelectItem>
                  <SelectItem value="normal">Normal (Balanced)</SelectItem>
                  <SelectItem value="detailed">Detailed (Comprehensive)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Markdown Style</Label>
              <Select value={markdownLevel} onValueChange={(v) => setMarkdownLevel(v as typeof markdownLevel)}>
                <SelectTrigger data-testid="select-markdown">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal (Clean, less formatting)</SelectItem>
                  <SelectItem value="normal">Normal (Standard formatting)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3">
              <Label>Report Sections</Label>
              <div className="grid gap-2">
                {[
                  { key: "tldr", label: "TL;DR Summary" },
                  { key: "drivers", label: "Market Drivers" },
                  { key: "risk", label: "Risk Radar" },
                  { key: "checklist", label: "Action Checklist" },
                  { key: "sources", label: "Source References" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      checked={sections[key as keyof typeof sections]}
                      onCheckedChange={() => toggleSection(key as keyof typeof sections)}
                      data-testid={`checkbox-section-${key}`}
                    />
                    <Label className="font-normal">{label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Set minimum criteria for items to be included</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Minimum Importance Score: {minImportanceScore}%</Label>
              <Slider
                value={[minImportanceScore]}
                onValueChange={([v]) => setMinImportanceScore(v)}
                min={0}
                max={100}
                step={10}
                data-testid="slider-importance"
              />
              <p className="text-xs text-muted-foreground">
                Items scoring below this threshold will be excluded from reports
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sources</CardTitle>
            <CardDescription>
              Select which sources this bot should monitor (showing {profile.topic} sources only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSources.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No sources available for {profile.topic}. Add some sources first.
              </p>
            ) : (
              <div className="grid gap-3">
                {filteredSources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center gap-3 p-3 border rounded-md"
                    data-testid={`source-${source.id}`}
                  >
                    <Checkbox
                      checked={selectedSourceIds.includes(source.id)}
                      onCheckedChange={() => toggleSource(source.id)}
                      data-testid={`checkbox-source-${source.id}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{source.name}</span>
                        {source.isDefault && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{source.url}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
