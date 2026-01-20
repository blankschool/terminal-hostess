import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Link2 } from "lucide-react";
import { detectPlatform } from "@/components/PlatformBadge";
import { SiInstagram, SiTiktok, SiYoutube, SiFacebook, SiX, SiPinterest, SiSnapchat, SiSoundcloud, SiVimeo, SiReddit, SiTwitch, SiTumblr, SiVk } from "react-icons/si";
import { cn } from "@/lib/utils";

interface UrlInputProps {
  onAddUrl: (url: string) => void;
}

export const UrlInput = ({ onAddUrl }: UrlInputProps) => {
  const [url, setUrl] = useState("");
  const platform = url ? detectPlatform(url) : null;
  
  // Validate only URL format, not specific domains
  const isValid = url.trim() && (
    url.includes('http://') || 
    url.includes('https://') || 
    url.includes('www.') ||
    /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(url)
  );

  const handleAdd = () => {
    if (url.trim()) {
      onAddUrl(url.trim());
      setUrl("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdd();
    }
  };
  
  const getPlatformIcon = () => {
    if (!platform) return <Link2 className="h-5 w-5 text-muted-foreground" />;
    
    const iconMap: Record<string, JSX.Element> = {
      instagram: <SiInstagram className="h-5 w-5 text-[hsl(var(--instagram-start))]" />,
      tiktok: <SiTiktok className="h-5 w-5 text-[hsl(var(--tiktok-primary))]" />,
      youtube: <SiYoutube className="h-5 w-5 text-[hsl(var(--youtube-primary))]" />,
      facebook: <SiFacebook className="h-5 w-5 text-[#1877F2]" />,
      twitter: <SiX className="h-5 w-5 text-foreground" />,
      pinterest: <SiPinterest className="h-5 w-5 text-[#E60023]" />,
      snapchat: <SiSnapchat className="h-5 w-5 text-[#FFFC00]" />,
      soundcloud: <SiSoundcloud className="h-5 w-5 text-[#FF5500]" />,
      vimeo: <SiVimeo className="h-5 w-5 text-[#1AB7EA]" />,
      reddit: <SiReddit className="h-5 w-5 text-[#FF4500]" />,
      twitch: <SiTwitch className="h-5 w-5 text-[#9146FF]" />,
      tumblr: <SiTumblr className="h-5 w-5 text-[#35465C]" />,
      vk: <SiVk className="h-5 w-5 text-[#4C75A3]" />,
      other: <Link2 className="h-5 w-5 text-muted-foreground" />,
    };
    
    return iconMap[platform] || <Link2 className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <div className="relative w-full">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
        {getPlatformIcon()}
      </div>
      <Input
        type="text"
        placeholder="paste a link"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyPress={handleKeyPress}
        className={cn(
          "w-full h-14 pl-12 pr-32 text-base transition-colors",
          "bg-input border-2 border-border",
          "focus:border-foreground",
          "rounded-2xl font-mono"
        )}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <Button
          onClick={handleAdd}
          disabled={!isValid}
          className="h-10 w-10 rounded-xl"
          size="icon"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
