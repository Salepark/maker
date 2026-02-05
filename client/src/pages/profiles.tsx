import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Bot, Copy, Trash2, Settings, Loader2 } from "lucide-react";

interface Preset {
  id: number;
  key: string;
  name: string;
  outputType: string;
  description: string | null;
  variantsJson: string[];
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
  configJson: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  presetName: string;
}

export default function Profiles() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [profileName, setProfileName] = useState("");

  const { data: profiles = [], isLoading: profilesLoading } = useQuery<Profile[]>({
    queryKey: ["/api/profiles"],
  });

  const { data: presets = [] } = useQuery<Preset[]>({
    queryKey: ["/api/presets"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { presetId: number; name: string; topic: string; variantKey: string | null }) => {
      return apiRequest("POST", "/api/profiles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      toast({ title: "Profile created successfully" });
      resetWizard();
    },
    onError: () => {
      toast({ title: "Failed to create profile", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest("PUT", `/api/profiles/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/profiles/${id}/clone`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      toast({ title: "Profile cloned successfully" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/profiles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      toast({ title: "Profile deleted successfully" });
    },
  });

  const resetWizard = () => {
    setWizardOpen(false);
    setWizardStep(1);
    setSelectedPreset(null);
    setSelectedVariant("");
    setProfileName("");
  };

  const handlePresetSelect = (preset: Preset) => {
    setSelectedPreset(preset);
    const variants = preset.variantsJson || [];
    if (variants.length === 1) {
      setSelectedVariant(variants[0]);
      setProfileName(`My ${preset.name}`);
      setWizardStep(3);
    } else if (variants.length > 1) {
      setWizardStep(2);
    } else {
      setProfileName(`My ${preset.name}`);
      setWizardStep(3);
    }
  };

  const handleVariantSelect = (variant: string) => {
    setSelectedVariant(variant);
    setProfileName(`My ${selectedPreset?.name} - ${variant}`);
    setWizardStep(3);
  };

  const handleCreateProfile = () => {
    if (!selectedPreset || !profileName) return;
    
    createMutation.mutate({
      presetId: selectedPreset.id,
      name: profileName,
      topic: selectedVariant || "general",
      variantKey: selectedVariant || null,
    });
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

  const getOutputTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      report: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      draft: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      alert: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  if (profilesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Bots</h1>
          <p className="text-muted-foreground">Create and manage your automated bot profiles</p>
        </div>
        <Dialog open={wizardOpen} onOpenChange={(open) => open ? setWizardOpen(true) : resetWizard()}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-profile">
              <Plus className="h-4 w-4 mr-2" />
              New Bot
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Bot</DialogTitle>
              <DialogDescription>
                {wizardStep === 1 && "Choose a bot type to get started"}
                {wizardStep === 2 && "Select a topic for your bot"}
                {wizardStep === 3 && "Give your bot a name"}
              </DialogDescription>
            </DialogHeader>
            
            {wizardStep === 1 && (
              <div className="grid gap-3 py-4">
                {presets.map((preset) => (
                  <Card 
                    key={preset.id} 
                    className="cursor-pointer hover-elevate"
                    onClick={() => handlePresetSelect(preset)}
                    data-testid={`preset-${preset.key}`}
                  >
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base">{preset.name}</CardTitle>
                        <Badge className={getOutputTypeColor(preset.outputType)}>
                          {preset.outputType}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm">
                        {preset.description || "No description"}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}

            {wizardStep === 2 && selectedPreset && (
              <div className="grid gap-3 py-4">
                <Label>Select Topic</Label>
                {(selectedPreset.variantsJson || []).map((variant) => (
                  <Button
                    key={variant}
                    variant="outline"
                    className="justify-start"
                    onClick={() => handleVariantSelect(variant)}
                    data-testid={`variant-${variant}`}
                  >
                    <Badge className={`mr-2 ${getTopicColor(variant)}`}>{variant}</Badge>
                    {variant.charAt(0).toUpperCase() + variant.slice(1).replace(/_/g, " ")}
                  </Button>
                ))}
                <Button variant="ghost" onClick={() => setWizardStep(1)}>
                  Back
                </Button>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Bot Name</Label>
                  <Input
                    id="name"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Enter bot name"
                    data-testid="input-profile-name"
                  />
                </div>
                {selectedVariant && (
                  <div className="flex items-center gap-2">
                    <Label>Topic:</Label>
                    <Badge className={getTopicColor(selectedVariant)}>{selectedVariant}</Badge>
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setWizardStep(selectedPreset?.variantsJson?.length ? 2 : 1)}>
                    Back
                  </Button>
                  <Button 
                    onClick={handleCreateProfile}
                    disabled={!profileName || createMutation.isPending}
                    data-testid="button-confirm-create"
                  >
                    {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Bot
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {profiles.length === 0 ? (
        <Card className="p-8 text-center">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No bots yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first bot to start monitoring content and generating reports
          </p>
          <Button onClick={() => setWizardOpen(true)} data-testid="button-create-first">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Bot
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <Card key={profile.id} className="overflow-visible" data-testid={`profile-card-${profile.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{profile.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1 flex-wrap">
                      <span>{profile.presetName}</span>
                      <Badge className={getTopicColor(profile.topic)}>{profile.topic}</Badge>
                    </CardDescription>
                  </div>
                  <Switch
                    checked={profile.isActive}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: profile.id, isActive: checked })}
                    data-testid={`toggle-active-${profile.id}`}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground mb-3">
                  <div>Schedule: {profile.scheduleCron}</div>
                  <div>Timezone: {profile.timezone}</div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setLocation(`/profiles/${profile.id}`)}
                    data-testid={`button-edit-${profile.id}`}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => cloneMutation.mutate(profile.id)}
                    disabled={cloneMutation.isPending}
                    data-testid={`button-clone-${profile.id}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this bot?")) {
                        deleteMutation.mutate(profile.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-${profile.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
