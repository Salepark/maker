import { useState } from "react";
import { Share2, Check, Link as LinkIcon } from "lucide-react";
import { SiX, SiLinkedin, SiReddit, SiYcombinator } from "react-icons/si";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const SHARE_URL = typeof window !== "undefined" ? window.location.origin : "https://makelr.com";
const SHARE_TITLE = "Makelr — Design your own automation workflows";
const SHARE_TEXT = "Build personal automation bots: choose your sources, set schedules, and generate AI-powered reports. Your workflow, your rules.";

const platforms = [
  {
    name: "X (Twitter)",
    icon: SiX,
    getUrl: () =>
      `https://x.com/intent/tweet?text=${encodeURIComponent(SHARE_TITLE)}&url=${encodeURIComponent(SHARE_URL)}`,
  },
  {
    name: "LinkedIn",
    icon: SiLinkedin,
    getUrl: () =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_URL)}`,
  },
  {
    name: "Reddit",
    icon: SiReddit,
    getUrl: () =>
      `https://www.reddit.com/submit?url=${encodeURIComponent(SHARE_URL)}&title=${encodeURIComponent(SHARE_TITLE)}`,
  },
  {
    name: "Hacker News",
    icon: SiYcombinator,
    getUrl: () =>
      `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(SHARE_URL)}&t=${encodeURIComponent(SHARE_TITLE)}`,
  },
];

interface ShareButtonProps {
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "icon";
  showLabel?: boolean;
  className?: string;
}

export function ShareButton({ variant = "ghost", size = "icon", showLabel = false, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = SHARE_URL;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        {showLabel ? (
          <Button variant={variant} size={size} className={className} data-testid="button-share">
            <Share2 className="h-4 w-4" />
            <span className="ml-2">Share</span>
          </Button>
        ) : (
          <Button variant={variant} size="icon" className={className} data-testid="button-share">
            <Share2 className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">Share on</div>
        <div className="space-y-0.5">
          {platforms.map((platform) => (
            <a
              key={platform.name}
              href={platform.getUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-2 py-2 rounded-md text-sm hover-elevate cursor-pointer"
              data-testid={`link-share-${platform.name.toLowerCase().replace(/[\s()]/g, "-")}`}
            >
              <platform.icon className="h-4 w-4 shrink-0" />
              <span>{platform.name}</span>
            </a>
          ))}
        </div>
        <div className="border-t border-border mt-1 pt-1">
          <button
            onClick={copyLink}
            className="flex items-center gap-3 px-2 py-2 rounded-md text-sm w-full hover-elevate cursor-pointer"
            data-testid="button-copy-link"
          >
            {copied ? (
              <Check className="h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <LinkIcon className="h-4 w-4 shrink-0" />
            )}
            <span>{copied ? "Link copied!" : "Copy link"}</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
