import { Download } from 'lucide-react';
import { motion } from 'motion/react';
import { Badge } from './ui/badge';

interface VideoResultProps {
  filename: string;
  platform: string;
  onDownload: () => void;
  isDark: boolean;
  blob?: Blob;
}

export function VideoResult({ filename, platform, onDownload, isDark, blob }: VideoResultProps) {
  const platformColors: Record<string, string> = {
    youtube: 'bg-red-500',
    instagram: 'bg-pink-500',
    tiktok: 'bg-cyan-500',
    twitter: 'bg-blue-500',
    other: 'bg-gray-500',
  };

  const platformColor = platformColors[platform] || platformColors.other;

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const fileSize = blob ? formatFileSize(blob.size) : null;

  return (
    <motion.div
      className={`${
        isDark ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-[#e0e0e0]'
      } border rounded-xl p-6`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={`${platformColor} text-white capitalize`}>
              {platform}
            </Badge>
          </div>
          <p className="font-medium truncate">{filename}</p>
          <p className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#666666]'} mt-1`}>
            {fileSize ? `${fileSize} • Pronto para download` : 'Pronto para download'}
          </p>
        </div>
        <motion.button
          onClick={onDownload}
          className={`ml-4 px-6 py-3 rounded-lg transition-colors flex items-center gap-2 ${
            isDark
              ? 'bg-[#4a4a4a] text-white hover:bg-[#5a5a5a]'
              : 'bg-[#1a1a1a] text-white hover:bg-[#2a2a2a]'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Download className="w-5 h-5" />
          Baixar
        </motion.button>
      </div>
    </motion.div>
  );
}
