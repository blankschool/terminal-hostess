import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface UrlQueueProps {
  urls: string[];
  onRemoveUrl: (index: number) => void;
}

export const UrlQueue = ({ urls, onRemoveUrl }: UrlQueueProps) => {
  if (urls.length === 0) return null;

  const truncateUrl = (url: string, maxLength: number = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + "...";
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-muted-foreground">
          {urls.length} {urls.length === 1 ? "link" : "links"}
        </span>
      </div>
      <AnimatePresence mode="popLayout">
        {urls.map((url, index) => (
          <motion.div
            key={url + index}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg p-3 group hover:bg-muted transition-colors"
          >
            <span
              className="flex-1 text-xs text-foreground/80 truncate font-mono" 
              title={url}
            >
              {truncateUrl(url, 60)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemoveUrl(index)}
              className="h-7 w-7 flex-shrink-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
