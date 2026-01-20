import { FileText, Copy, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

interface AudioResultProps {
  transcription: string;
  isDark: boolean;
}

export function AudioResult({ transcription, isDark }: AudioResultProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcription);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownloadText = () => {
    const blob = new Blob([transcription], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcricao_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      className={`${
        isDark ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-[#e0e0e0]'
      } border rounded-xl p-6 space-y-4`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className={`w-5 h-5 ${isDark ? 'text-[#6a6a6a]' : 'text-[#999999]'}`} />
          <h3 className="text-lg font-semibold">Transcrição de Áudio</h3>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={handleCopy}
            className={`px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
              isDark
                ? 'bg-[#252525] hover:bg-[#2a2a2a]'
                : 'bg-[#e0e0e0] hover:bg-[#d0d0d0]'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copiado!' : 'Copiar'}
          </motion.button>
          <motion.button
            onClick={handleDownloadText}
            className={`px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
              isDark
                ? 'bg-[#4a4a4a] text-white hover:bg-[#5a5a5a]'
                : 'bg-[#1a1a1a] text-white hover:bg-[#2a2a2a]'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download className="w-4 h-4" />
            Baixar .txt
          </motion.button>
        </div>
      </div>

      <div
        className={`p-4 ${
          isDark ? 'bg-[#0f0f0f] border-[#2a2a2a]' : 'bg-[#f5f5f5] border-[#e0e0e0]'
        } border rounded-lg`}
      >
        <p
          className={`text-sm ${
            isDark ? 'text-[#a0a0a0]' : 'text-[#666666]'
          } leading-relaxed whitespace-pre-wrap`}
        >
          {transcription}
        </p>
      </div>
    </motion.div>
  );
}
