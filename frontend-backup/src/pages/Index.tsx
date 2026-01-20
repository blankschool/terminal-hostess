import { useState, useEffect } from "react";
import { UrlInput } from "@/components/UrlInput";
import { UrlQueue } from "@/components/UrlQueue";
import { ActionButtons } from "@/components/ActionButtons";
import { DownloadResults } from "@/components/DownloadResults";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { apiFetch } from "@/lib/api";
interface MediaItem {
  index: number;
  is_video: boolean;
  is_audio?: boolean;
  media_url: string;
  thumbnail_url?: string; // URL da thumbnail para preview
  blob?: Blob; // Para dados binários diretos
  filename?: string; // Nome sugerido do arquivo
  content?: string; // Texto extraído da imagem pela IA
  transcription?: string; // Transcrição de áudio
  storage_path?: string; // Caminho no Supabase Storage
  source_url?: string; // URL original usada no download
  format?: string; // Formato retornado pela API
}
interface DownloadResult {
  originalUrl: string;
  mediaItems: MediaItem[];
  status: string;
  jobId?: string;
  errorMessage?: string;
}
const EXTRACT_TEXT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-image-text`;

const cleanUrl = (url: string): string => {
  console.log("🧹 cleanUrl - URL original:", url);
  try {
    const urlObj = new URL(url);

    // YouTube: manter query parameters (especialmente ?v=VIDEO_ID)
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      console.log("🎬 YouTube detectado - mantendo query params:", url);
      return url;
    }

    // Instagram e TikTok: remover query parameters
    const cleaned = `${urlObj.origin}${urlObj.pathname}`;
    console.log("📸 Instagram/TikTok - removendo query params:", cleaned);
    return cleaned;
  } catch (error) {
    console.error("❌ Erro ao processar URL:", error);
    return url;
  }
};

const detectPlatform = (url: string) => {
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("tiktok.com") || url.includes("tiktokcdn")) return "tiktok";
  if (url.includes("facebook.com") || url.includes("fb.watch")) return "facebook";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  return "other";
};

const getExtensionFromUrl = (url: string) => {
  try {
    const clean = url.split("?")[0].split("#")[0];
    const parts = clean.split(".");
    if (parts.length > 1) {
      return parts[parts.length - 1].toLowerCase();
    }
  } catch (err) {
    console.warn("Não foi possível extrair extensão da URL:", err);
  }
  return "";
};

const inferMimeFromExt = (ext: string) => {
  const lower = ext.toLowerCase();
  if (["mp4", "m4v", "mov", "webm"].includes(lower)) return `video/${lower === "webm" ? "webm" : "mp4"}`;
  if (["mp3", "m4a", "aac"].includes(lower)) return "audio/mpeg";
  if (["jpg", "jpeg"].includes(lower)) return "image/jpeg";
  if (["png"].includes(lower)) return "image/png";
  if (["gif"].includes(lower)) return "image/gif";
  if (["webp"].includes(lower)) return "image/webp";
  return "application/octet-stream";
};

const normalizeDirectUrl = (url: string) => {
  const cleaned = (url || "").trim();
  return cleaned.startsWith("|") ? cleaned.replace(/^\|\s*/, "") : cleaned;
};

const isLikelyMediaUrl = (url: string) => {
  const ext = getExtensionFromUrl(url);

  let host = "";
  let path = "";
  try {
    const parsed = new URL(url);
    host = parsed.hostname.toLowerCase();
    path = parsed.pathname.toLowerCase();
  } catch {
    // ignorar parsing; usaremos apenas ext
  }

  // Block Instagram placeholder URLs like /reel/ID/1.mp4 or /p/ID/1.jpg
  if (host.includes("instagram.com") && !host.includes("cdninstagram") && !host.includes("fbcdn")) {
    // Check if path matches pattern /reel/{id}/{number}.{ext} or /p/{id}/{number}.{ext}
    if (path.match(/\/(reel|p|stories)\/[^/]+\/\d+\.(mp4|jpg|jpeg|png)/i)) {
      console.log(`🚫 Blocking Instagram placeholder URL: ${url}`);
      return false;
    }
  }

  const blocked = ["json", "txt", "html", "xml"];
  if (blocked.includes(ext)) return false;

  if (!ext) {
    // Para Instagram sem extensão, ignore links que apontam para domínio principal (provável HTML/JSON)
    if (host.includes("instagram.com") && !host.includes("cdninstagram") && !host.includes("fbcdn") && !host.includes("fna.fbcdn")) {
      return false;
    }
    return true; // sem extensão, mas não bloqueado: manter
  }

  const allowed = [
    "mp4",
    "webm",
    "mov",
    "m4v",
    "m3u8",
    "mpd",
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "mp3",
    "m4a",
    "aac",
  ];
  return allowed.includes(ext);
};

const Index = () => {
  const [urls, setUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadResults, setDownloadResults] = useState<DownloadResult[]>([]);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [downloadMode, setDownloadMode] = useState<"auto" | "audio">("auto");
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [currentProgress, setCurrentProgress] = useState<{ current: number; total: number } | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Cleanup object URLs when results change
  useEffect(() => {
    return () => {
      downloadResults.forEach((result) => {
        result.mediaItems.forEach((media) => {
          if (media.blob && media.media_url.startsWith("blob:")) {
            URL.revokeObjectURL(media.media_url);
          }
        });
      });
    };
  }, [downloadResults]);

  const handleAddUrl = (url: string) => {
    console.log("🔍 URL recebida no handleAddUrl:", url);
    console.log("✅ Adicionando URL ao state:", url);
    setUrls([...urls, url]);
    toast.success("Link adicionado à fila", { duration: 1000 });
  };
  const handleRemoveUrl = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index));
    toast.success("Link removido", { duration: 1000 });
  };
  const inferExtension = (contentType: string | null, format: string | null, isAudio: boolean) => {
    if (format) return `.${format}`;
    if (!contentType) return isAudio ? ".mp3" : ".mp4";
    if (contentType.includes("mp4")) return ".mp4";
    if (contentType.includes("webm")) return ".webm";
    if (contentType.includes("audio/")) return ".mp3";
    if (contentType.includes("image/png")) return ".png";
    if (contentType.includes("image/jpeg")) return ".jpg";
    if (contentType.includes("gif")) return ".gif";
    return isAudio ? ".mp3" : ".mp4";
  };

  const filenameFromHeaders = (response: Response, fallbackBase: string, extension: string) => {
    const disposition = response.headers.get("content-disposition");
    if (disposition) {
      const match = disposition.match(/filename="?([^\";]+)"?/i);
      if (match?.[1]) {
        return match[1];
      }
    }
    const safeBase = fallbackBase || "download";
    return safeBase.endsWith(extension) ? safeBase : `${safeBase}${extension}`;
  };

  const handleDownloadViaApi = async (
    targetUrls: string[],
    extractAudio: boolean,
    controller: AbortController,
  ) => {
    const results: DownloadResult[] = [];
    const MAX_PARALLEL = 3; // Process up to 3 URLs in parallel

    const fetchInstagramDirectUrls = async (url: string) => {
      const resp = await apiFetch("/download/gallery/urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, tool: "gallery-dl" }),
        signal: controller.signal,
      });
      if (!resp.ok) {
        throw new Error(await resp.text());
      }
      const data = await resp.json();
      return Array.isArray(data?.direct_urls) ? data.direct_urls as string[] : [];
    };

    const fetchTranscriptions = async (url: string) => {
      try {
        const resp = await apiFetch("/transcribe/instagram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
          signal: controller.signal,
        });
        if (!resp.ok) return [];
        const data = await resp.json();
        if (Array.isArray(data?.items)) {
          return data.items as any[];
        }
      } catch (err) {
        console.warn("Falha ao transcrever IG:", err);
      }
      return [];
    };

    const fetchYtDirectUrl = async (url: string) => {
      const resp = await apiFetch("/download/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, tool: "yt-dlp", format: "mp4" }),
        signal: controller.signal,
      });
      if (!resp.ok) {
        throw new Error(await resp.text());
      }
      const data = await resp.json();
      const urls = Array.isArray(data?.direct_urls) ? data.direct_urls as string[] : [];
      return urls.length ? urls[0] : data?.direct_url;
    };

    const downloadVideoBinary = async (url: string, platform: string) => {
      const binaryStartTime = Date.now();

      // Usar streaming endpoint para YouTube (reduz latência de 30s para <1s)
      const isYoutube = url.toLowerCase().includes("youtube.com") || url.toLowerCase().includes("youtu.be");
      const endpoint = isYoutube
        ? `/download/binary-stream?url=${encodeURIComponent(url)}&format=mp4`
        : `/download/binary?url=${encodeURIComponent(url)}&tool=yt-dlp&format=mp4`;

      console.log(`🚀 Using ${isYoutube ? 'STREAMING' : 'BUFFERED'} mode for ${platform}`);

      const resp = await apiFetch(endpoint, {
        method: "POST",
        signal: controller.signal,
      });
      const responseTime = Date.now() - binaryStartTime;
      console.log(`📡 Backend response received in ${responseTime}ms (${isYoutube ? 'streaming started' : 'file ready'})`);

      if (!resp.ok) {
        throw new Error(await resp.text());
      }
      const disposition = resp.headers.get("content-disposition") || "";
      const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
      const contentType = resp.headers.get("content-type") || "";
      const filename = match?.[1] || `${platform}_${Date.now()}.mp4`;

      const blobStartTime = Date.now();
      const blob = await resp.blob();
      const blobTime = Date.now() - blobStartTime;
      console.log(`💾 Blob downloaded in ${blobTime}ms (${(blob.size / 1024 / 1024).toFixed(2)}MB)`);

      const objectUrlStartTime = Date.now();
      const objectUrl = URL.createObjectURL(blob);
      const objectUrlTime = Date.now() - objectUrlStartTime;
      console.log(`🔗 ObjectURL created in ${objectUrlTime}ms`);

      const ext =
        getExtensionFromUrl(filename) ||
        (contentType.includes("webm") ? "webm" : "mp4");

      return { blob, objectUrl, filename, format: ext };
    };

    // Process URLs in parallel chunks
    const processUrl = async (cleanedUrl: string, index: number) => {
      if (controller.signal.aborted) {
        console.log("Download aborted before processing:", cleanedUrl);
        return null;
      }

      // Update progress
      setCurrentProgress({ current: index + 1, total: targetUrls.length });
      setLoadingMessage(`Processando ${index + 1} de ${targetUrls.length}...`);

      const urlStartTime = Date.now();

      try {
        const platform = detectPlatform(cleanedUrl);
        const isInstagramPost = platform === "instagram" && cleanedUrl.includes("/p/");
        const isInstagramReel = platform === "instagram" && cleanedUrl.includes("/reel/");
        const isInstagramStory = platform === "instagram" && cleanedUrl.includes("/stories/");

        console.log(`🔍 Debug: platform=${platform}, isReel=${isInstagramReel}, isPost=${isInstagramPost}, isStory=${isInstagramStory}, extractAudio=${extractAudio}`);

        // Use binary download for YouTube only
        if (platform === "youtube" && !extractAudio) {
          console.log(`✅ Using: YouTube binary download (yt-dlp)`);
          setLoadingMessage(`Baixando vídeo ${platform}...`);
          const binary = await downloadVideoBinary(cleanedUrl, platform);
          const elapsed = Date.now() - urlStartTime;
          console.log(`⏱️ Downloaded ${platform} in ${elapsed}ms`);
          return {
            originalUrl: cleanedUrl,
            mediaItems: [
              {
                index: 0,
                is_video: true,
                is_audio: false,
                media_url: binary.objectUrl,
                blob: binary.blob,
                filename: binary.filename,
                source_url: cleanedUrl,
                format: binary.format,
              },
            ],
            status: "success",
          };
        } else if (platform === "tiktok" && !extractAudio) {
          // TikTok - use yt-dlp binary directly (gallery-dl doesn't work well for TikTok)
          console.log(`✅ Using: TikTok binary download (yt-dlp)`);
          setLoadingMessage("Baixando vídeo do TikTok...");
          const binary = await downloadVideoBinary(cleanedUrl, platform);
          const elapsed = Date.now() - urlStartTime;
          console.log(`⏱️ Downloaded TikTok in ${elapsed}ms`);
          return {
            originalUrl: cleanedUrl,
            mediaItems: [
              {
                index: 0,
                is_video: true,
                is_audio: false,
                media_url: binary.objectUrl,
                blob: binary.blob,
                filename: binary.filename,
                source_url: cleanedUrl,
                format: binary.format,
              },
            ],
            status: "success",
          };
        } else if (platform === "instagram" && (isInstagramPost || isInstagramReel || isInstagramStory) && !extractAudio) {
          // Instagram - use gallery-dl for direct URLs (download mode)
          const contentType = isInstagramStory ? "story" : isInstagramReel ? "reel" : "post";
          console.log(`✅ Using: Instagram ${contentType} URLs (gallery-dl)`);
          setLoadingMessage(`Obtendo URLs do ${contentType}...`);

          const rawUrls = await fetchInstagramDirectUrls(cleanedUrl);
          console.log(`📦 Raw URLs from gallery-dl:`, rawUrls);

          const directUrls = rawUrls
            .map(normalizeDirectUrl)
            .filter(url => {
              if (!url) return false;
              const isValid = isLikelyMediaUrl(url);
              console.log(`🔍 Filtering URL: ${url.substring(0, 100)}... → ${isValid ? '✅' : '❌'}`);
              return isValid;
            });

          console.log(`✅ Filtered URLs (${directUrls.length}):`, directUrls);

          if (!directUrls.length) {
            throw new Error("Nenhuma URL direta retornada pelo gallery-dl");
          }

          let transcriptionItems: any[] = [];
          if (isInstagramPost) {
            setLoadingMessage(`Transcrevendo ${directUrls.length} imagens com IA...`);
            transcriptionItems = await fetchTranscriptions(cleanedUrl);
          }

          // Create a map of transcriptions by their original index
          const transcriptionMap = new Map();
          transcriptionItems.forEach(item => {
            if (item.index !== undefined) {
              transcriptionMap.set(item.index, item.text);
            }
          });

          const mediaItems: MediaItem[] = directUrls.map((directUrl, idx) => {
            const ext = getExtensionFromUrl(directUrl);
            const isVideo = ["mp4", "webm", "mov"].includes(ext);
            const isAudio = ["mp3", "m4a", "aac"].includes(ext);
            const filename = directUrl.split("/").pop() || `media_${idx + 1}`;

            // Match transcription by index (1-based from backend)
            const transcription = transcriptionMap.get(idx + 1) || "";

            return {
              index: idx,
              is_video: isVideo,
              is_audio: isAudio,
              media_url: directUrl,
              filename,
              source_url: cleanedUrl,
              format: ext || (isVideo ? "mp4" : isAudio ? "mp3" : "bin"),
              content: transcription,
            };
          });

          const elapsed = Date.now() - urlStartTime;
          console.log(`⏱️ Processed Instagram ${contentType} in ${elapsed}ms`);
          return {
            originalUrl: cleanedUrl,
            mediaItems,
            status: "success",
          };
        } else if (extractAudio) {
          // Audio transcription mode - use yt-dlp binary download + Whisper transcription
          console.log(`✅ Using: Audio transcription mode (yt-dlp + Whisper)`);
          setLoadingMessage("Extraindo áudio do vídeo...");
          const resp = await apiFetch("/transcribe/video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: cleanedUrl, format: "mp3" }),
            signal: controller.signal,
          });
          setLoadingMessage("Transcrevendo áudio com Whisper...");
          if (!resp.ok) {
            throw new Error(await resp.text());
          }
          const data = await resp.json();
          const transcript = data?.transcript || "Transcrição concluída.";
          const elapsed = Date.now() - urlStartTime;
          console.log(`⏱️ Transcribed audio in ${elapsed}ms`);
          return {
            originalUrl: cleanedUrl,
            mediaItems: [
              {
                index: 0,
                is_video: false,
                is_audio: true,
                media_url: "",
                filename: `audio_${Date.now()}.mp3`,
                source_url: cleanedUrl,
                transcription: transcript,
              },
            ],
            status: "success",
          };
        } else {
          // Generic video download for other platforms: try to download any video URL using yt-dlp
          console.log(`✅ Using: Generic video download (yt-dlp)`);
          setLoadingMessage("Baixando vídeo (genérico)...");
          const binary = await downloadVideoBinary(cleanedUrl, "generic");
          const elapsed = Date.now() - urlStartTime;
          console.log(`⏱️ Downloaded generic video in ${elapsed}ms`);
          return {
            originalUrl: cleanedUrl,
            mediaItems: [
              {
                index: 0,
                is_video: true,
                is_audio: false,
                media_url: binary.objectUrl,
                blob: binary.blob,
                filename: binary.filename,
                source_url: cleanedUrl,
                format: binary.format,
              },
            ],
            status: "success",
          };
        }
      } catch (error) {
        console.error(`Erro ao baixar ${cleanedUrl}:`, error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        const urlPlatform = detectPlatform(cleanedUrl);

        // Check for TikTok-specific errors
        if (urlPlatform === "tiktok" && (errorMsg.includes("503") || errorMsg.includes("bloqueou") || errorMsg.includes("blocked"))) {
          toast.error("TikTok bloqueado. Tente usar VPN (Bélgica, México, Holanda ou EUA)", { duration: 5000 });
          return {
            originalUrl: cleanedUrl,
            mediaItems: [],
            status: "error",
            errorMessage: "TikTok bloqueou o download. Isso pode ser um problema regional. Tente usar uma VPN conectada à Bélgica, México, Holanda ou EUA.",
          } as DownloadResult;
        }

        toast.error(`Erro ao baixar`, { duration: 1000 });
        return {
          originalUrl: cleanedUrl,
          mediaItems: [],
          status: "error",
          errorMessage: errorMsg,
        } as DownloadResult;
      }
    };

    // Process URLs in parallel chunks of MAX_PARALLEL
    for (let i = 0; i < targetUrls.length; i += MAX_PARALLEL) {
      const chunk = targetUrls.slice(i, i + MAX_PARALLEL);
      const chunkResults = await Promise.all(
        chunk.map((url, idx) => processUrl(url, i + idx))
      );
      results.push(...chunkResults.filter((r): r is DownloadResult => r !== null));
    }

    if (!results.length) {
      toast.error("Nenhum download concluído", { duration: 1000 });
    }

    return results;
  };

  const handleDownload = async (extractAudio: boolean = false) => {
    if (urls.length === 0) return;

    const controller = new AbortController();
    setAbortController(controller);
    setIsLoading(true);
    setDownloadResults([]);
    setStartTime(Date.now());

    try {
      const cleanedUrls = urls.map(cleanUrl);
      const apiResults = await handleDownloadViaApi(cleanedUrls, extractAudio, controller);
      setDownloadResults(apiResults);
      setUrls([]);
      const elapsed = Date.now() - (startTime || Date.now());
      toast.success(`Download concluído em ${(elapsed / 1000).toFixed(1)}s!`, { duration: 1000 });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Download cancelled by user");
        toast.info("Download cancelado", { duration: 1000 });
      } else {
        console.error("Error sending download request:", error);
        toast.error("Erro ao processar download", { duration: 1000 });
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
      setLoadingMessage("");
      setCurrentProgress(null);
      setStartTime(null);
    }
  };
  const handleStopDownload = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
  };
  const handleClear = () => {
    setUrls([]);
    setDownloadResults([]);
    toast.success("Lista limpa", { duration: 1000 });
  };
  const handleClearResults = () => {
    setDownloadResults([]);
    toast.success("Resultados limpos", { duration: 1000 });
  };
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Centered Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-2xl space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-8"
          >
            {/* Title and Supported Services */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-foreground">Blank Downloader</h1>
              <p className="text-sm text-muted-foreground">Instagram, carrossel, reels, stories e Tiktok</p>
            </div>

            <UrlInput onAddUrl={handleAddUrl} />

            {/* Option Buttons */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDownloadMode("auto")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  downloadMode === "auto"
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground hover:bg-accent/80"
                }`}
              >
                🎬 Baixar conteúdo
              </button>
              <button
                onClick={() => setDownloadMode("audio")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  downloadMode === "audio"
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground hover:bg-accent/80"
                }`}
              >
                🎵 Transcrever conteúdo
              </button>
            </div>

            <UrlQueue urls={urls} onRemoveUrl={handleRemoveUrl} />

            {urls.length > 0 && (
              <div className="flex justify-center">
                <Button
                  onClick={() => handleDownload(downloadMode === "audio")}
                  disabled={isLoading}
                  size="lg"
                  className="h-14 px-16 font-semibold rounded-2xl text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  <Download className="mr-3 h-6 w-6" />
                  Download
                </Button>
              </div>
            )}

            <ActionButtons
              hasUrls={urls.length > 0}
              onClear={handleClear}
              onStop={handleStopDownload}
              isLoading={isLoading}
            />
          </motion.div>

          <LoadingOverlay
            isVisible={isLoading}
            message={loadingMessage || (urls.length > 0 ? `Processando ${urls.length} link(s)...` : "Processando...")}
            progress={currentProgress}
            startTime={startTime}
          />

          <DownloadResults results={downloadResults} onClearResults={handleClearResults} />
        </div>
      </div>
    </div>
  );
};
export default Index;
