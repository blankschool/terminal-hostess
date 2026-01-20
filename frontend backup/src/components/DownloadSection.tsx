import { Download, FileText, Image as ImageIcon, Music } from 'lucide-react';
import { motion } from 'motion/react';

interface DownloadSectionProps {
  isDark: boolean;
}

export function DownloadSection({ isDark }: DownloadSectionProps) {
  return (
    <motion.div 
      className={`${isDark ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-[#e0e0e0]'} border rounded-xl p-6 space-y-4`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h3 className="text-lg font-semibold">Pronto para Baixar</h3>
      
      {/* Video Download Example */}
      <div className="space-y-3">
        <motion.div 
          className={`flex items-center gap-4 p-4 ${isDark ? 'bg-[#0f0f0f] border-[#2a2a2a]' : 'bg-[#f5f5f5] border-[#e0e0e0]'} border rounded-lg`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.01 }}
        >
          <div className={`w-16 h-16 ${isDark ? 'bg-[#252525]' : 'bg-[#e8e8e8]'} rounded-lg flex items-center justify-center`}>
            <FileText className={`w-8 h-8 ${isDark ? 'text-[#4a4a4a]' : 'text-[#999999]'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">titulo_do_video_exemplo.mp4</p>
            <p className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#666666]'}`}>1080p • 45.2 MB</p>
          </div>
          <motion.button 
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              isDark ? 'bg-[#4a4a4a] text-white hover:bg-[#5a5a5a]' : 'bg-[#1a1a1a] text-white hover:bg-[#2a2a2a]'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download className="w-4 h-4" />
            Baixar
          </motion.button>
        </motion.div>

        {/* Audio/Transcription Example */}
        <motion.div 
          className={`flex items-center gap-4 p-4 ${isDark ? 'bg-[#0f0f0f] border-[#2a2a2a]' : 'bg-[#f5f5f5] border-[#e0e0e0]'} border rounded-lg`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          whileHover={{ scale: 1.01 }}
        >
          <div className={`w-16 h-16 ${isDark ? 'bg-[#252525]' : 'bg-[#e8e8e8]'} rounded-lg flex items-center justify-center`}>
            <Music className={`w-8 h-8 ${isDark ? 'text-[#4a4a4a]' : 'text-[#999999]'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">faixa_de_audio.mp3</p>
            <p className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#666666]'}`}>MP3 • 4.8 MB</p>
          </div>
          <motion.button 
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              isDark ? 'bg-[#4a4a4a] text-white hover:bg-[#5a5a5a]' : 'bg-[#1a1a1a] text-white hover:bg-[#2a2a2a]'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download className="w-4 h-4" />
            Baixar
          </motion.button>
        </motion.div>

        {/* Transcription Text Example */}
        <motion.div 
          className={`p-4 ${isDark ? 'bg-[#0f0f0f] border-[#2a2a2a]' : 'bg-[#f5f5f5] border-[#e0e0e0]'} border rounded-lg space-y-3`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className={`w-4 h-4 ${isDark ? 'text-[#6a6a6a]' : 'text-[#999999]'}`} />
              <span className="font-medium">Transcrição</span>
            </div>
            <motion.button 
              className={`text-sm ${isDark ? 'text-[#a0a0a0] hover:text-white' : 'text-[#666666] hover:text-[#1a1a1a]'} transition-colors`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Copiar
            </motion.button>
          </div>
          <p className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#666666]'} leading-relaxed`}>
            [O texto transcrito apareceria aqui após processar o conteúdo de áudio...]
          </p>
        </motion.div>

        {/* Image Carousel Example */}
        <motion.div 
          className="space-y-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#666666]'}`}>
            <ImageIcon className="w-4 h-4" />
            <span>Imagens do Carrossel (3)</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <motion.div 
                key={i} 
                className="relative group"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + (i * 0.05) }}
                whileHover={{ scale: 1.05 }}
              >
                <div className={`aspect-square ${isDark ? 'bg-[#252525]' : 'bg-[#e8e8e8]'} rounded-lg`}></div>
                <button className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <Download className="w-6 h-6 text-white" />
                </button>
              </motion.div>
            ))}
          </div>
          <motion.button 
            className={`w-full py-2 rounded-lg text-sm transition-colors ${
              isDark ? 'bg-[#252525] hover:bg-[#2a2a2a]' : 'bg-[#e0e0e0] hover:bg-[#d0d0d0]'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Baixar Todas as Imagens
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}