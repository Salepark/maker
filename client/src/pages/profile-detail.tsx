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

interface Profile {
  id: number;
  userId: string;
  presetId: number;
  name: string;
  topic: string;
  variantKey: string | null;
  timezone: string;
  scheduleCron: string;
  configJson: Record<string, unknown>;
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

const cronPresets = [
  { label: "Every day at 7 AM", value: "0 7 * * *" },
  { label: "Every day at 9 AM", value: "0 9 * * *" },
  { label: "Every day at 10 PM", value: "0 22 * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Weekdays at 8 AM", value: "0 8 * * 1-5" },
];

export default function ProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [timezone, setTimezone] = useState("Asia/Seoul");
  const [scheduleCron, setScheduleCron] = useState("0 7 * * *");
  const [importanceWeight, setImportanceWeight] = useState(50);
  const [riskWeight, setRiskWeight] = useState(50);
  const [reportLength, setReportLength] = useState("standard");
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
      setScheduleCron(profile.scheduleCron);
      
      const config = profile.configJson as Record<string, unknown>;
      setImportanceWeight((config.importanceWeight as number) || 50);
      setRiskWeight((config.riskWeight as number) || 50);
      setReportLength((config.length as string) || "standard");
    }
  }, [profile]);

  useEffect(() => {
    if (profileSources.length > 0) {
      setSelectedSourceIds(profileSources.map((s) => s.id));
    }
  }, [profileSources]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const configJson = {
        importanceWeight,
        riskWeight,
        length: reportLength,
      };
      
      await apiRequest("PUT", `/api/profiles/${id}`, {
        name,
        isActive,
        timezone,
        scheduleCron,
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
              <Label htmlFor="timezone">Timezone</Label>
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
              <Label htmlFor="schedule">Schedule</Label>
              <Select value={scheduleCron} onValueChange={setScheduleCron}>
                <SelectTrigger data-testid="select-schedule">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cronPresets.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Cron expression: {scheduleCron}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Output Options</CardTitle>
            <CardDescription>Customize how your bot generates content</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-2">
              <Label>Importance Weight: {importanceWeight}%</Label>
              <Slider
                value={[importanceWeight]}
                onValueChange={([v]) => setImportanceWeight(v)}
                min={0}
                max={100}
                step={10}
                data-testid="slider-importance"
              />
            </div>
            <div className="grid gap-2">
              <Label>Risk Weight: {riskWeight}%</Label>
              <Slider
                value={[riskWeight]}
                onValueChange={([v]) => setRiskWeight(v)}
                min={0}
                max={100}
                step={10}
                data-testid="slider-risk"
              />
            </div>
            <div className="grid gap-2">
              <Label>Report Length</Label>
              <Select value={reportLength} onValueChange={setReportLength}>
                <SelectTrigger data-testid="select-length">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="long">Long</SelectItem>
                </SelectContent>
              </Select>
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
