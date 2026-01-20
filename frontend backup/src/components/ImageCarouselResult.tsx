import { Download, FileText, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface CarouselImage {
  url: string;
  transcription: string;
  filename: string;
}

interface ImageCarouselResultProps {
  images: CarouselImage[];
  onDownloadImage: (url: string, filename: string) => void;
  onDownloadAll: () => void;
  isDark: boolean;
}

export function ImageCarouselResult({
  images,
  onDownloadImage,
  onDownloadAll,
  isDark,
}: ImageCarouselResultProps) {
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
          <ImageIcon className={`w-5 h-5 ${isDark ? 'text-[#6a6a6a]' : 'text-[#999999]'}`} />
          <h3 className="text-lg font-semibold">
            Carrossel do Instagram ({images.length} {images.length === 1 ? 'imagem' : 'imagens'})
          </h3>
        </div>
        {images.length > 1 && (
          <motion.button
            onClick={onDownloadAll}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              isDark
                ? 'bg-[#4a4a4a] text-white hover:bg-[#5a5a5a]'
                : 'bg-[#1a1a1a] text-white hover:bg-[#2a2a2a]'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Baixar Todas
          </motion.button>
        )}
      </div>

      <div className="space-y-6">
        {images.map((image, idx) => (
          <motion.div
            key={idx}
            className={`p-4 ${
              isDark ? 'bg-[#0f0f0f] border-[#2a2a2a]' : 'bg-[#f5f5f5] border-[#e0e0e0]'
            } border rounded-lg space-y-3`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <img
                  src={image.url}
                  alt={`Imagem ${idx + 1}`}
                  className="w-full rounded-lg object-cover max-h-96"
                  loading="lazy"
                />
              </div>
            </div>

            {image.transcription && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className={`w-4 h-4 ${isDark ? 'text-[#6a6a6a]' : 'text-[#999999]'}`} />
                  <span className="text-sm font-medium">Texto extraído:</span>
                </div>
                <p
                  className={`text-sm ${
                    isDark ? 'text-[#a0a0a0]' : 'text-[#666666]'
                  } leading-relaxed whitespace-pre-wrap`}
                >
                  {image.transcription}
                </p>
              </div>
            )}

            <motion.button
              onClick={() => onDownloadImage(image.url, image.filename)}
              className={`w-full py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                isDark
                  ? 'bg-[#252525] hover:bg-[#2a2a2a]'
                  : 'bg-[#e0e0e0] hover:bg-[#d0d0d0]'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Download className="w-4 h-4" />
              Baixar Imagem {idx + 1}
            </motion.button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
