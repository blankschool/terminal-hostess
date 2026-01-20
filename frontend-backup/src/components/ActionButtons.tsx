import { Button } from "@/components/ui/button";
import { Trash2, StopCircle } from "lucide-react";

interface ActionButtonsProps {
  hasUrls: boolean;
  onClear: () => void;
  onStop?: () => void;
  isLoading: boolean;
}

export const ActionButtons = ({ hasUrls, onClear, onStop, isLoading }: ActionButtonsProps) => {
  if (!hasUrls && !isLoading) return null;

  return (
    <div className="flex gap-2 w-full justify-center">
      {isLoading ? (
        <Button
          onClick={onStop}
          variant="destructive"
          size="default"
          className="h-11 px-6 font-medium rounded-xl"
        >
          <StopCircle className="mr-2 h-4 w-4" />
          stop
        </Button>
      ) : (
        <Button
          onClick={onClear}
          variant="outline"
          size="default"
          className="h-11 px-6 font-medium rounded-xl"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          clear
        </Button>
      )}
    </div>
  );
};
