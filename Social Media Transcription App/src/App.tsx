import { useState } from 'react';
import { Download, Image, Mic, Settings, Info, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SettingsPanel } from './components/SettingsPanel';
import { Footer } from './components/Footer';
import { VideoResult } from './components/VideoResult';
import { ImageCarouselResult } from './components/ImageCarouselResult';
import { AudioResult } from './components/AudioResult';
import { apiFetch } from './lib/api';
import {
  detectPlatform,
  isCarouselUrl,
  triggerBrowserDownload,
  generateFilename,
  getFilenameFromResponse,
  formatErrorMessage,
  downloadFromUrl,
} from './lib/download';

interface VideoResultData {
  type: 'video';
  filename: string;
  platform: string;
  blob: Blob;
}

interface ImageCarouselResultData {
  type: 'carousel';
  images: Array<{
    url: string;
    transcription: string;
    filename: string;
  }>;
}

interface AudioResultData {
  type: 'audio';
  transcription: string;
}

type ResultData = VideoResultData | ImageCarouselResultData | AudioResultData;

export default function App() {
  const [url, setUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [downloadType, setDownloadType] = useState<'video' | 'images' | 'audio'>('video');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const isDark = theme === 'dark';

  const handleDownloadVideo = async (url: string) => {
    const platform = detectPlatform(url);
    const isYoutube = platform === 'youtube';
    
    // Use streaming endpoint for YouTube, regular binary for others
    const endpoint = isYoutube
      ? `/download/binary-stream?url=${encodeURIComponent(url)}&format=mp4`
      : `/download/binary?url=${encodeURIComponent(url)}&tool=yt-dlp&format=mp4`;

    const response = await apiFetch(endpoint, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Erro ao baixar vídeo');
    }

    const blob = await response.blob();
    const filename = getFilenameFromResponse(response, `${platform}_${Date.now()}.mp4`);

    return { blob, filename, platform };
  };

  const handleDownloadCarousel = async (url: string) => {
    const response = await apiFetch('/transcribe/instagram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Erro ao processar carrossel');
    }

    const data = await response.json();
    
    if (!data.items || !Array.isArray(data.items)) {
      throw new Error('Resposta inválida da API');
    }

    // Get direct URLs for images
    const urlResponse = await apiFetch('/download/gallery/urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, tool: 'gallery-dl' }),
    });

    if (!urlResponse.ok) {
      throw new Error('Erro ao obter URLs das imagens');
    }

    const urlData = await urlResponse.json();
    const directUrls = urlData.direct_urls || [];

    // Filter only image URLs
    const imageUrls = directUrls.filter((url: string) => {
      const ext = url.split('.').pop()?.toLowerCase();
      return ext && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
    });

    // Match transcriptions with images
    const images = imageUrls.map((url: string, idx: number) => {
      const item = data.items.find((i: any) => i.index === idx + 1);
      const transcription = item?.text || '';
      const filename = url.split('/').pop() || `image_${idx + 1}.jpg`;
      
      return {
        url,
        transcription,
        filename,
      };
    });

    return images;
  };

  const handleTranscribeAudio = async (url: string) => {
    const response = await apiFetch('/transcribe/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, format: 'mp3' }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Erro ao transcrever áudio');
    }

    const data = await response.json();
    return data.transcript || 'Transcrição não disponível';
  };

  const handleDownload = async () => {
    if (!url) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const platform = detectPlatform(url);

      if (downloadType === 'video') {
        const { blob, filename, platform: detectedPlatform } = await handleDownloadVideo(url);
        setResult({
          type: 'video',
          filename,
          platform: detectedPlatform,
          blob,
        });
      } else if (downloadType === 'images') {
        // Check if it's an Instagram post/carousel
        if (!isCarouselUrl(url)) {
          throw new Error('Esta URL não é um post do Instagram. Use a opção "Vídeo" para reels ou stories.');
        }

        const images = await handleDownloadCarousel(url);
        
        if (images.length === 0) {
          throw new Error('Nenhuma imagem encontrada no carrossel');
        }

        setResult({
          type: 'carousel',
          images,
        });
      } else if (downloadType === 'audio') {
        const transcription = await handleTranscribeAudio(url);
        setResult({
          type: 'audio',
          transcription,
        });
      }
    } catch (err) {
      const errorMessage = formatErrorMessage(err);
      setError(errorMessage);
      console.error('Download error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoDownload = () => {
    if (result && result.type === 'video') {
      triggerBrowserDownload(result.blob, result.filename);
    }
  };

  const handleImageDownload = async (imageUrl: string, filename: string) => {
    try {
      await downloadFromUrl(imageUrl, filename);
    } catch (err) {
      setError(formatErrorMessage(err));
    }
  };

  const handleDownloadAllImages = async () => {
    if (result && result.type === 'carousel') {
      for (const image of result.images) {
        try {
          await downloadFromUrl(image.url, image.filename);
          // Add a small delay between downloads to avoid overwhelming the browser
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error('Error downloading image:', err);
        }
      }
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0f0f0f] text-white' : 'bg-white text-[#1a1a1a]'} flex flex-col transition-colors duration-300`}>
      {/* Header */}
      <header className={`border-b ${isDark ? 'border-[#2a2a2a]' : 'border-[#e0e0e0]'} py-6`}>
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-2">
              <motion.button
                onClick={toggleTheme}
                className={`p-2 ${isDark ? 'hover:bg-[#1a1a1a]' : 'hover:bg-[#e8e8e8]'} rounded-lg transition-colors`}
                aria-label="Alternar tema"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <AnimatePresence mode="wait">
                  {isDark ? (
                    <motion.div
                      key="sun"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Sun className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="moon"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Moon className="w-5 h-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
              <motion.button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 ${isDark ? 'hover:bg-[#1a1a1a]' : 'hover:bg-[#e8e8e8]'} rounded-lg transition-colors`}
                aria-label="Configurações"
                whileHover={{ scale: 1.05, rotate: 90 }}
                whileTap={{ scale: 0.95 }}
              >
                <Settings className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-3xl w-full space-y-8">
          {/* Intro Text */}
          <motion.div 
            className="text-center space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h2 className="text-4xl font-bold">Baixar e Transcrever</h2>
            <p className={`${isDark ? 'text-[#a0a0a0]' : 'text-[#666666]'} text-lg`}>
              Salve vídeos, imagens e transcreva áudios do Instagram, YouTube, TikTok e X
            </p>
          </motion.div>

          {/* Download Type Selector */}
          <motion.div 
            className="flex gap-3 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.button
              onClick={() => setDownloadType('video')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                downloadType === 'video'
                  ? isDark ? 'bg-[#4a4a4a] text-white' : 'bg-[#1a1a1a] text-white'
                  : isDark ? 'bg-[#1a1a1a] text-[#a0a0a0] hover:bg-[#252525]' : 'bg-[#e8e8e8] text-[#666666] hover:bg-[#d8d8d8]'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Download className="w-4 h-4" />
              Vídeo
            </motion.button>
            <motion.button
              onClick={() => setDownloadType('images')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                downloadType === 'images'
                  ? isDark ? 'bg-[#4a4a4a] text-white' : 'bg-[#1a1a1a] text-white'
                  : isDark ? 'bg-[#1a1a1a] text-[#a0a0a0] hover:bg-[#252525]' : 'bg-[#e8e8e8] text-[#666666] hover:bg-[#d8d8d8]'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Image className="w-4 h-4" />
              Imagens
            </motion.button>
            <motion.button
              onClick={() => setDownloadType('audio')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                downloadType === 'audio'
                  ? isDark ? 'bg-[#4a4a4a] text-white' : 'bg-[#1a1a1a] text-white'
                  : isDark ? 'bg-[#1a1a1a] text-[#a0a0a0] hover:bg-[#252525]' : 'bg-[#e8e8e8] text-[#666666] hover:bg-[#d8d8d8]'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Mic className="w-4 h-4" />
              Áudio
            </motion.button>
          </motion.div>

          {/* URL Input and Download Button */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="relative">
              <motion.input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Cole o link do Instagram, YouTube, TikTok ou X..."
                className={`w-full px-6 py-4 ${
                  isDark ? 'bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder-[#6a6a6a] focus:border-[#4a4a4a]' : 'bg-white border-[#d0d0d0] text-[#1a1a1a] placeholder-[#999999] focus:border-[#999999]'
                } border rounded-xl focus:outline-none transition-colors`}
                whileFocus={{ scale: 1.01 }}
                disabled={isLoading}
              />
            </div>

            <motion.button
              onClick={handleDownload}
              disabled={!url || isLoading}
              className={`w-full py-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                url && !isLoading
                  ? isDark ? 'bg-[#4a4a4a] text-white hover:bg-[#5a5a5a]' : 'bg-[#1a1a1a] text-white hover:bg-[#2a2a2a]'
                  : isDark ? 'bg-[#1a1a1a] text-[#4a4a4a] cursor-not-allowed' : 'bg-[#e0e0e0] text-[#999999] cursor-not-allowed'
              }`}
              whileHover={url && !isLoading ? { scale: 1.02 } : {}}
              whileTap={url && !isLoading ? { scale: 0.98 } : {}}
            >
              {isLoading ? (
                <>
                  <motion.div
                    className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  Processando...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  {downloadType === 'video' && 'Baixar Vídeo'}
                  {downloadType === 'images' && 'Baixar e Transcrever Imagens'}
                  {downloadType === 'audio' && 'Baixar e Transcrever Áudio'}
                </>
              )}
            </motion.button>
          </motion.div>

          {/* Error Display */}
          {error && (
            <motion.div
              className={`${
                isDark ? 'bg-red-900/20 border-red-900/50' : 'bg-red-100 border-red-300'
              } border rounded-xl p-4`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-800'}`}>{error}</p>
            </motion.div>
          )}

          {/* Results Display */}
          {result && result.type === 'video' && (
            <VideoResult
              filename={result.filename}
              platform={result.platform}
              onDownload={handleVideoDownload}
              isDark={isDark}
            />
          )}

          {result && result.type === 'carousel' && (
            <ImageCarouselResult
              images={result.images}
              onDownloadImage={handleImageDownload}
              onDownloadAll={handleDownloadAllImages}
              isDark={isDark}
            />
          )}

          {result && result.type === 'audio' && (
            <AudioResult transcription={result.transcription} isDark={isDark} />
          )}

          {/* Info Box */}
          <motion.div 
            className={`${isDark ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-[#e0e0e0]'} border rounded-xl p-4`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex gap-3">
              <Info className={`w-5 h-5 ${isDark ? 'text-[#6a6a6a]' : 'text-[#999999]'} flex-shrink-0 mt-0.5`} />
              <div className="space-y-2">
                <p className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#666666]'}`}>
                  <strong className={isDark ? 'text-white' : 'text-[#1a1a1a]'}>Plataformas suportadas:</strong> Instagram (posts, reels, stories, carrosséis), 
                  YouTube (vídeos, shorts), TikTok (vídeos), X/Twitter (vídeos, imagens)
                </p>
                <p className={`text-sm ${isDark ? 'text-[#a0a0a0]' : 'text-[#666666]'}`}>
                  <strong className={isDark ? 'text-white' : 'text-[#1a1a1a]'}>Recursos:</strong> Downloads diretos, transcrição de carrossel de imagens, 
                  transcrição de áudio, seleção de qualidade
                </p>
              </div>
            </div>
          </motion.div>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <SettingsPanel isDark={isDark} onClose={() => setShowSettings(false)} />
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <Footer isDark={isDark} />
    </div>
  );
}
