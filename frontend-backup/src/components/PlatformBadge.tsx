import { SiInstagram, SiTiktok, SiYoutube, SiFacebook, SiX, SiPinterest, SiSnapchat, SiSoundcloud, SiVimeo, SiReddit, SiTwitch, SiTumblr, SiVk } from "react-icons/si";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Link2 } from "lucide-react";

interface PlatformBadgeProps {
  url: string;
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
  showBeta?: boolean;
}

type PlatformType = "instagram" | "tiktok" | "youtube" | "facebook" | "twitter" | "pinterest" | "snapchat" | "soundcloud" | "vimeo" | "reddit" | "dailymotion" | "bilibili" | "twitch" | "tumblr" | "vk" | "streamable" | "vine" | "rutube" | "ok" | "9gag" | "bandcamp" | "blogger" | "break" | "byte" | "coub" | "douyin" | "imgur" | "likee" | "linkedin" | "metacafe" | "other";

export const detectPlatform = (url: string): PlatformType | null => {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes("instagram.com")) return "instagram";
  if (lowerUrl.includes("tiktok.com")) return "tiktok";
  if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) return "youtube";
  if (lowerUrl.includes("facebook.com") || lowerUrl.includes("fb.watch")) return "facebook";
  if (lowerUrl.includes("twitter.com") || lowerUrl.includes("x.com")) return "twitter";
  if (lowerUrl.includes("pinterest.com")) return "pinterest";
  if (lowerUrl.includes("snapchat.com")) return "snapchat";
  if (lowerUrl.includes("soundcloud.com")) return "soundcloud";
  if (lowerUrl.includes("vimeo.com")) return "vimeo";
  if (lowerUrl.includes("reddit.com")) return "reddit";
  if (lowerUrl.includes("dailymotion.com")) return "dailymotion";
  if (lowerUrl.includes("bilibili.com") || lowerUrl.includes("bilibili.tv")) return "bilibili";
  if (lowerUrl.includes("twitch.tv")) return "twitch";
  if (lowerUrl.includes("tumblr.com")) return "tumblr";
  if (lowerUrl.includes("vk.com")) return "vk";
  if (lowerUrl.includes("streamable.com")) return "streamable";
  if (lowerUrl.includes("vine.co")) return "vine";
  if (lowerUrl.includes("rutube.ru")) return "rutube";
  if (lowerUrl.includes("ok.ru")) return "ok";
  if (lowerUrl.includes("9gag.com")) return "9gag";
  if (lowerUrl.includes("bandcamp.com")) return "bandcamp";
  if (lowerUrl.includes("blogger.com")) return "blogger";
  if (lowerUrl.includes("break.com")) return "break";
  if (lowerUrl.includes("byte.co")) return "byte";
  if (lowerUrl.includes("coub.com")) return "coub";
  if (lowerUrl.includes("douyin.com")) return "douyin";
  if (lowerUrl.includes("imgur.com")) return "imgur";
  if (lowerUrl.includes("likee.video")) return "likee";
  if (lowerUrl.includes("linkedin.com")) return "linkedin";
  if (lowerUrl.includes("metacafe.com")) return "metacafe";
  
  // Accept any valid URL with http/https protocol
  if ((lowerUrl.startsWith("http://") || lowerUrl.startsWith("https://")) && lowerUrl.includes(".")) {
    return "other";
  }
  
  return null;
};

const platformConfig: Record<PlatformType, { icon: any; label: string; className: string; isBeta: boolean; betaTooltip: string }> = {
  instagram: {
    icon: SiInstagram,
    label: "Instagram",
    className: "bg-gradient-to-br from-[hsl(var(--instagram-start))] to-[hsl(var(--instagram-end))] text-white border-0",
    isBeta: false,
    betaTooltip: "",
  },
  tiktok: {
    icon: SiTiktok,
    label: "TikTok",
    className: "bg-[hsl(var(--tiktok-secondary))] text-[hsl(var(--tiktok-primary))] border-[hsl(var(--tiktok-primary))]",
    isBeta: false,
    betaTooltip: "",
  },
  youtube: {
    icon: SiYoutube,
    label: "YouTube",
    className: "bg-[hsl(var(--youtube-primary))] text-white border-0",
    isBeta: true,
    betaTooltip: "Recurso em fase beta. Downloads de shorts podem apresentar instabilidades. Melhorias em andamento.",
  },
  facebook: {
    icon: SiFacebook,
    label: "Facebook",
    className: "bg-[#1877F2] text-white border-0",
    isBeta: false,
    betaTooltip: "",
  },
  twitter: {
    icon: SiX,
    label: "X (Twitter)",
    className: "bg-foreground text-background border-0",
    isBeta: false,
    betaTooltip: "",
  },
  pinterest: {
    icon: SiPinterest,
    label: "Pinterest",
    className: "bg-[#E60023] text-white border-0",
    isBeta: false,
    betaTooltip: "",
  },
  snapchat: {
    icon: SiSnapchat,
    label: "Snapchat",
    className: "bg-[#FFFC00] text-black border-0",
    isBeta: false,
    betaTooltip: "",
  },
  soundcloud: {
    icon: SiSoundcloud,
    label: "SoundCloud",
    className: "bg-[#FF5500] text-white border-0",
    isBeta: false,
    betaTooltip: "",
  },
  vimeo: {
    icon: SiVimeo,
    label: "Vimeo",
    className: "bg-[#1AB7EA] text-white border-0",
    isBeta: false,
    betaTooltip: "",
  },
  reddit: {
    icon: SiReddit,
    label: "Reddit",
    className: "bg-[#FF4500] text-white border-0",
    isBeta: false,
    betaTooltip: "",
  },
  dailymotion: {
    icon: Link2,
    label: "Dailymotion",
    className: "bg-[#0066DC] text-white border-0",
    isBeta: false,
    betaTooltip: "",
  },
  bilibili: {
    icon: Link2,
    label: "Bilibili",
    className: "bg-[#00A1D6] text-white border-0",
    isBeta: false,
    betaTooltip: "",
  },
  twitch: {
    icon: SiTwitch,
    label: "Twitch",
    className: "bg-[#9146FF] text-white border-0",
    isBeta: false,
    betaTooltip: "",
  },
  tumblr: {
    icon: SiTumblr,
    label: "Tumblr",
    className: "bg-[#35465C] text-white border-0",
    isBeta: false,
    betaTooltip: "",
  },
  vk: {
    icon: SiVk,
    label: "VK",
    className: "bg-[#4C75A3] text-white border-0",
    isBeta: false,
    betaTooltip: "",
  },
  streamable: {
    icon: Link2,
    label: "Streamable",
    className: "bg-muted text-foreground border border-border",
    isBeta: false,
    betaTooltip: "",
  },
  vine: {
    icon: Link2,
    label: "Vine",
    className: "bg-[#00BF8F] text-white border-0",
    isBeta: false,
    betaTooltip: "",
  },
  rutube: {
    icon: Link2,
    label: "Rutube",
    className: "bg-muted text-foreground border border-border",
    isBeta: false,
    betaTooltip: "",
  },
  ok: {
    icon: Link2,
    label: "OK Video",
    className: "bg-[#EE8208] text-white border-0",
    isBeta: false,
    betaTooltip: "",
  },
  "9gag": {
    icon: Link2,
    label: "9GAG",
    className: "bg-foreground text-background border-0",
    isBeta: false,
    betaTooltip: "",
  },
  bandcamp: {
    icon: Link2,
    label: "Bandcamp",
    className: "bg-[#1DA0C3] text-white border-0",
    isBeta: false,
    betaTooltip: "",
  },
  blogger: {
    icon: Link2,
    label: "Blogger",
    className: "bg-[#FF5722] text-white border-0",
    isBeta: false,
    betaTooltip: "",
  },
  break: {
    icon: Link2,
    label: "Break",
    className: "bg-muted text-foreground border border-border",
    isBeta: false,
    betaTooltip: "",
  },
  byte: {
    icon: Link2,
    label: "Byte",
    className: "bg-muted text-foreground border border-border",
    isBeta: false,
    betaTooltip: "",
  },
  coub: {
    icon: Link2,
    label: "Coub",
    className: "bg-[#00A9FF] text-white border-0",
    isBeta: false,
    betaTooltip: "",
  },
  douyin: {
    icon: Link2,
    label: "Douyin",
    className: "bg-foreground text-background border-0",
    isBeta: false,
    betaTooltip: "",
  },
  imgur: {
    icon: Link2,
    label: "Imgur",
    className: "bg-[#1BB76E] text-white border-0",
    isBeta: false,
    betaTooltip: "",
  },
  likee: {
    icon: Link2,
    label: "Likee",
    className: "bg-muted text-foreground border border-border",
    isBeta: false,
    betaTooltip: "",
  },
  linkedin: {
    icon: Link2,
    label: "LinkedIn",
    className: "bg-[#0A66C2] text-white border-0",
    isBeta: false,
    betaTooltip: "",
  },
  metacafe: {
    icon: Link2,
    label: "Metacafe",
    className: "bg-muted text-foreground border border-border",
    isBeta: false,
    betaTooltip: "",
  },
  other: {
    icon: Link2,
    label: "Link",
    className: "bg-muted text-foreground border border-border",
    isBeta: false,
    betaTooltip: "",
  },
};

export const PlatformBadge = ({ url, className, showIcon = true, showText = true, showBeta = true }: PlatformBadgeProps) => {
  const platform = detectPlatform(url);
  
  if (!platform) return null;
  
  const config = platformConfig[platform];
  const Icon = config.icon;
  
  return (
    <div className="flex items-center gap-1.5">
      <Badge className={cn("gap-1.5 font-semibold", config.className, className)}>
        {showIcon && <Icon className="h-3 w-3" />}
        {showText && config.label}
      </Badge>
      {showBeta && config.isBeta && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="text-xs font-bold px-1.5 py-0 cursor-help">
                Beta
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">{config.betaTooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};
