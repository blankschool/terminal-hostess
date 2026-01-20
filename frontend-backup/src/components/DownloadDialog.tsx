import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";

interface DownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFilename: string;
  mediaType: "video" | "image";
  onConfirm: (filename: string) => void;
}

export const DownloadDialog = ({
  open,
  onOpenChange,
  defaultFilename,
  mediaType,
  onConfirm,
}: DownloadDialogProps) => {
  const [filename, setFilename] = useState(defaultFilename);
  
  const handleConfirm = () => {
    const cleanFilename = filename.trim() || defaultFilename;
    onConfirm(cleanFilename);
    onOpenChange(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escolha o nome do arquivo</DialogTitle>
          <DialogDescription>
            Personalize o nome do arquivo antes de baixar
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="filename">Nome do arquivo</Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={defaultFilename}
              className="flex-1"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="gap-2">
            <Download className="h-4 w-4" />
            Baixar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
