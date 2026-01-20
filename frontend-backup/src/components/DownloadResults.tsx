import { ExternalLink, Download, CheckSquare, Square, Trash2, Play, Image as ImageIcon, Copy, Check, FileText, FileDown, Music, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PlatformBadge } from "@/components/PlatformBadge";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import JSZip from "jszip";
import { apiFetch } from "@/lib/api";

interface MediaItem {
  index: number;
  is_video: boolean;
  is_audio?: boolean;
  media_url: string;
  thumbnail_url?: string; // URL da thumbnail para preview (especialmente TikTok)
  blob?: Blob; // Para dados binários do TikTok
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

interface DownloadResultsProps {
  results: DownloadResult[];
  onClearResults: () => void;
}

const fetchMediaBlob = async (media: MediaItem, isForPreview: boolean = false) => {
  if (media.blob) return media.blob;

  const targetUrl = media.media_url || media.thumbnail_url;
  if (!targetUrl) {
    throw new Error("Invalid media URL");
  }

  // Try direct fetch (may fail due to CORS; handled by caller)
  try {
    const resp = await fetch(targetUrl, { mode: "cors" });
    if (!resp.ok) throw new Error("Failed to fetch media");
    const blob = await resp.blob();
    if (blob.size === 0) throw new Error("Empty blob");
    return blob;
  } catch (err) {
    if (isForPreview) {
      throw err;
    }
    throw err;
  }
};

const downloadDirectly = async (url: string, filename: string, existingBlob?: Blob) => {
  try {
    // Se já temos o blob (dados binários do n8n), usar diretamente
    if (existingBlob) {
      console.log("Using existing blob for download, size:", existingBlob.size);
      const blobUrl = URL.createObjectURL(existingBlob);
      
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      toast.success("Baixado!", { duration: 2000 });
      return;
    }

    // Para blob URLs (criados no Index.tsx), baixar diretamente
    if (url.startsWith('blob:')) {
      console.log("Downloading from blob URL");
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Baixado!", { duration: 2000 });
      return;
    }

    // Redirecionar usuário para o download direto
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Iniciando download...", { duration: 2000 });
  } catch (error) {
    console.error("Download error:", error);
    toast.error("Erro ao baixar", { duration: 2000 });
    throw error;
  }
};

const isResultReady = (result: DownloadResult) => {
  return ["success", "completed", "partial-success"].includes(result.status) && result.mediaItems.length > 0;
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "queued":
      return "Na fila";
    case "processing":
      return "Processando";
    case "completed":
    case "success":
      return "Concluido";
    case "failed":
      return "Erro";
    case "expired":
      return "Expirado";
    case "partial-success":
      return "Parcial";
    default:
      return status;
  }
};

export const DownloadResults = ({ results, onClearResults }: DownloadResultsProps) => {
  const [selectedItems, setSelectedItems] = useState<Record<number, Set<number>>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [transcribingAudio, setTranscribingAudio] = useState<Record<string, boolean>>({});
  const [localTranscriptions, setLocalTranscriptions] = useState<Record<string, string>>({});

  useEffect(() => {
    // Cleanup old preview URLs (apenas blobs)
    const oldUrls = previewUrls;
    Object.values(oldUrls).forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    
    const loadPreviews = async () => {
      const urls: Record<string, string> = {};
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (isResultReady(result)) {
          for (let j = 0; j < result.mediaItems.length; j++) {
            const media = result.mediaItems[j];
            // Use a unique key combining result index, media index, and URL
            const uniqueKey = `${i}-${j}-${media.media_url}`;
            try {
              // Se já é um blob URL (dados binários do n8n), usar diretamente
              if (media.media_url?.startsWith('blob:')) {
                urls[uniqueKey] = media.media_url;
              } 
              // Se temos o blob, criar URL dele
              else if (media.blob) {
                urls[uniqueKey] = URL.createObjectURL(media.blob);
              }
              // Para outras URLs (Instagram), fazer fetch do preview
              else {
                const blob = await fetchMediaBlob(media, true);
                urls[uniqueKey] = URL.createObjectURL(blob);
              }
            } catch (error) {
              console.error("Error loading preview:", error);
            }
          }
        }
      }
      
      setPreviewUrls(urls);
    };

    loadPreviews();

    return () => {
      Object.values(previewUrls).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [results]);

  if (results.length === 0) return null;

  const toggleItemSelection = (resultIndex: number, mediaIndex: number) => {
    setSelectedItems((prev) => {
      const newSelected = { ...prev };
      if (!newSelected[resultIndex]) {
        newSelected[resultIndex] = new Set();
      }
      const resultSet = new Set(newSelected[resultIndex]);
      if (resultSet.has(mediaIndex)) {
        resultSet.delete(mediaIndex);
      } else {
        resultSet.add(mediaIndex);
      }
      newSelected[resultIndex] = resultSet;
      return newSelected;
    });
  };
  
  const handleTranscribeAudio = async (media: MediaItem, resultIndex: number, mediaIndex: number) => {
    const key = `${resultIndex}-${mediaIndex}`;
    setTranscribingAudio(prev => ({ ...prev, [key]: true }));
    
    try {
      if (!media.source_url) {
        throw new Error("URL original não disponível para transcrição");
      }

      const response = await apiFetch("/transcribe/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: media.source_url, format: "mp3" }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Erro na transcrição");
      }

      const data = await response.json();

      if (data?.transcript) {
        setLocalTranscriptions(prev => ({ ...prev, [key]: data.transcript }));
        toast.success("Transcrição concluída", { duration: 2000 });
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error("Erro na transcrição", { duration: 2000 });
    } finally {
      setTranscribingAudio(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleCopyText = async (text: string, resultIndex: number, mediaIndex: number) => {
    try {
      await navigator.clipboard.writeText(text);
      const key = `${resultIndex}-${mediaIndex}`;
      setCopiedIndex(key);
      toast.success("Texto copiado!", { duration: 2000 });
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      toast.error("Erro ao copiar", { duration: 2000 });
    }
  };

  const handleCopyAllTexts = async (mediaItems: MediaItem[], resultIndex: number) => {
    // Filtrar apenas itens com conteúdo de texto
    const textsToExport = mediaItems
      .map((media, index) => ({
        index: index + 1,
        content: media.content
      }))
      .filter(item => item.content && item.content.trim() !== "");

    if (textsToExport.length === 0) {
      toast.error("Nenhum texto encontrado", { duration: 2000 });
      return;
    }

    // Formatar o conteúdo com numeração
    const textContent = textsToExport
      .map(item => `#${item.index}\n\n${item.content}`)
      .join("\n\n" + "=".repeat(80) + "\n\n");

    try {
      await navigator.clipboard.writeText(textContent);
      toast.success("Textos copiados!", { duration: 2000 });
    } catch (error) {
      toast.error("Erro ao copiar", { duration: 2000 });
    }
  };

  const handleExportTexts = (mediaItems: MediaItem[], resultIndex: number) => {
    // Filtrar apenas itens com conteúdo de texto
    const textsToExport = mediaItems
      .map((media, index) => ({
        index: index + 1,
        content: media.content
      }))
      .filter(item => item.content && item.content.trim() !== "");

    if (textsToExport.length === 0) {
      toast.error("Nenhum texto encontrado", { duration: 2000 });
      return;
    }

    // Formatar o conteúdo do arquivo TXT
    const textContent = textsToExport
      .map(item => `#${item.index}\n\n${item.content}\n\n${"=".repeat(80)}\n`)
      .join("\n");

    // Criar blob e fazer download
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `textos_extraidos_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Textos exportados!", { duration: 2000 });
  };
  
  const handleSingleDownload = async (media: MediaItem, resultIndex: number, mediaIndex: number) => {
    // Use original filename directly without dialog
    let filename = media.filename || `media_${mediaIndex + 1}`;

    // If filename doesn't have extension, add it
    if (!filename.includes('.')) {
      let extension = "jpg";
      if (media.blob) {
        if (media.blob.type.includes('audio')) {
          extension = "mp3";
        } else if (media.blob.type.includes('video') || media.is_video) {
          extension = "mp4";
        }
      } else if (media.is_video) {
        extension = "mp4";
      } else if (media.is_audio) {
        extension = "mp3";
      }
      filename = `${filename}.${extension}`;
    }

    try {
      await downloadDirectly(media.media_url, filename, media.blob);
    } catch (error) {
      // Error already handled in downloadDirectly
    }
  };

  const downloadAll = async (mediaItems: MediaItem[], resultIndex: number) => {
    // Se for apenas 1 arquivo, baixar diretamente sem ZIP
    if (mediaItems.length === 1) {
      const media = mediaItems[0];

      // Use original filename
      let filename = media.filename || `media_1`;

      // Add extension if not present
      if (!filename.includes('.')) {
        let extension = "jpg";
        if (media.blob) {
          if (media.blob.type.includes('audio')) {
            extension = "mp3";
          } else if (media.blob.type.includes('video') || media.is_video) {
            extension = "mp4";
          }
        } else if (media.is_video) {
          extension = "mp4";
        } else if (media.is_audio) {
          extension = "mp3";
        }
        filename = `${filename}.${extension}`;
      }

      try {
        await downloadDirectly(media.media_url, filename, media.blob);
        toast.success("Baixado!", { duration: 2000 });
      } catch (error) {
        toast.error("Erro ao baixar", { duration: 2000 });
      }
      return;
    }

    // Para múltiplos arquivos (carrossel), criar ZIP
    setDownloadProgress({ current: 0, total: mediaItems.length });
    toast.info("Criando ZIP...", { duration: 2000 });
    
    const zip = new JSZip();
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < mediaItems.length; i++) {
      const media = mediaItems[i];

      // Use original filename or fallback to numbered name
      let filename = media.filename || `media_${i + 1}`;

      // Add extension if not present
      if (!filename.includes('.')) {
        let extension = "jpg";
        if (media.blob) {
          if (media.blob.type.includes('audio')) {
            extension = "mp3";
          } else if (media.blob.type.includes('video') || media.is_video) {
            extension = "mp4";
          }
        } else if (media.is_video) {
          extension = "mp4";
        } else if (media.is_audio) {
          extension = "mp3";
        }
        filename = `${filename}.${extension}`;
      }

      try {
        const blob = await fetchMediaBlob(media);
        zip.file(filename, blob);
        successCount++;
        setDownloadProgress({ current: i + 1, total: mediaItems.length });
      } catch (error) {
        failCount++;
        console.error(`Failed to add ${filename} to ZIP:`, error);
      }
    }

    if (successCount > 0) {
      try {
        toast.info("Gerando ZIP...", { duration: 2000 });
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(zipBlob);
        
        const link = document.createElement("a");
        link.href = zipUrl;
        link.download = `instagram_carousel_${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(zipUrl);
        
        if (failCount === 0) {
          toast.success("ZIP criado!", { duration: 2000 });
        } else {
          toast.warning(`ZIP criado (${failCount} falharam)`, { duration: 2000 });
        }
      } catch (error) {
        console.error("Failed to create ZIP:", error);
        toast.error("Erro ao criar ZIP", { duration: 2000 });
      }
    } else {
      toast.error("Erro ao criar ZIP", { duration: 2000 });
    }

    setDownloadProgress(null);
  };

  const downloadSelected = async (mediaItems: MediaItem[], resultIndex: number) => {
    const selected = selectedItems[resultIndex] || new Set();
    const itemsToDownload = mediaItems.filter((_, idx) => selected.has(idx));
    
    if (itemsToDownload.length === 0) {
      toast.error("Selecione pelo menos um item", { duration: 2000 });
      return;
    }

    // Se for apenas 1 arquivo selecionado, baixar diretamente sem ZIP
    if (itemsToDownload.length === 1) {
      const media = itemsToDownload[0];
      const mediaIndex = mediaItems.indexOf(media);

      // Use original filename
      let filename = media.filename || `media_${mediaIndex + 1}`;

      // Add extension if not present
      if (!filename.includes('.')) {
        let extension = "jpg";
        if (media.blob) {
          if (media.blob.type.includes('audio')) {
            extension = "mp3";
          } else if (media.blob.type.includes('video') || media.is_video) {
            extension = "mp4";
          }
        } else if (media.is_video) {
          extension = "mp4";
        } else if (media.is_audio) {
          extension = "mp3";
        }
        filename = `${filename}.${extension}`;
      }

      try {
        await downloadDirectly(media.media_url, filename, media.blob);
        toast.success("Baixado!", { duration: 2000 });
      } catch (error) {
        toast.error("Erro ao baixar", { duration: 2000 });
      }
      return;
    }

    // Para múltiplos arquivos selecionados, criar ZIP
    setDownloadProgress({ current: 0, total: itemsToDownload.length });
    toast.info("Criando ZIP...", { duration: 2000 });
    
    const zip = new JSZip();
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < itemsToDownload.length; i++) {
      const media = itemsToDownload[i];
      const mediaIndex = mediaItems.indexOf(media);

      // Use original filename
      let filename = media.filename || `media_${mediaIndex + 1}`;

      // Add extension if not present
      if (!filename.includes('.')) {
        let extension = "jpg";
        if (media.blob) {
          if (media.blob.type.includes('audio')) {
            extension = "mp3";
          } else if (media.blob.type.includes('video') || media.is_video) {
            extension = "mp4";
          }
        } else if (media.is_video) {
          extension = "mp4";
        } else if (media.is_audio) {
          extension = "mp3";
        }
        filename = `${filename}.${extension}`;
      }

      try {
        const blob = await fetchMediaBlob(media);
        zip.file(filename, blob);
        successCount++;
        setDownloadProgress({ current: i + 1, total: itemsToDownload.length });
      } catch (error) {
        failCount++;
        console.error(`Failed to add ${filename} to ZIP:`, error);
      }
    }

    if (successCount > 0) {
      try {
        toast.info("Gerando ZIP...", { duration: 2000 });
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(zipBlob);
        
        const link = document.createElement("a");
        link.href = zipUrl;
        link.download = `instagram_selected_${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(zipUrl);
        
        if (failCount === 0) {
          toast.success("ZIP criado!", { duration: 2000 });
        } else {
          toast.warning(`ZIP criado (${failCount} falharam)`, { duration: 2000 });
        }
      } catch (error) {
        console.error("Failed to create ZIP:", error);
        toast.error("Erro ao criar ZIP", { duration: 2000 });
      }
    } else {
      toast.error("Erro ao criar ZIP", { duration: 2000 });
    }

    setDownloadProgress(null);
  };

  return (
    <div className="w-full space-y-6">
      {results.length > 0 && (
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-2xl">Resultados</h3>
          <Button
            onClick={onClearResults}
            variant="outline"
            size="sm"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Limpar
          </Button>
        </div>
      )}
      
      {downloadProgress && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 bg-card border border-border rounded-xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Baixando arquivos...</span>
            <span className="font-bold text-primary">{downloadProgress.current} / {downloadProgress.total}</span>
          </div>
          <Progress value={(downloadProgress.current / downloadProgress.total) * 100} className="h-2" />
        </motion.div>
      )}
      
      {results.map((result, resultIndex) => (
        <motion.div
          key={resultIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: resultIndex * 0.1 }}
          className="bg-card border border-border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all space-y-4"
        >
          {/* Header do Card */}
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-border">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <PlatformBadge url={result.originalUrl} />
              <a
                href={result.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-foreground hover:text-primary hover:underline truncate flex-1 font-medium"
                title={result.originalUrl}
              >
                {result.originalUrl}
              </a>
              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
            {isResultReady(result) && (
              <Badge variant="default" className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] flex-shrink-0">
                {result.mediaItems.length} {result.mediaItems.length === 1 ? "item" : "itens"}
              </Badge>
            )}
          </div>
          
          {isResultReady(result) ? (
            <div className="space-y-4">
              {/* Controles */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                {result.mediaItems.length > 1 && selectedItems[resultIndex]?.size > 0 && (
                  <span className="text-sm font-medium text-muted-foreground">
                    {selectedItems[resultIndex]?.size || 0} selecionado(s)
                  </span>
                )}
                <div className="flex gap-2 ml-auto flex-wrap">
                  {/* Botões de gerenciamento de texto */}
                  {result.mediaItems.some(media => media.content && media.content.trim() !== "") && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyAllTexts(result.mediaItems, resultIndex)}
                        className="font-medium rounded-2xl hover:bg-primary/10 transition-all"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copiar Textos
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExportTexts(result.mediaItems, resultIndex)}
                        className="font-medium rounded-2xl hover:bg-primary/10 transition-all"
                      >
                        <FileDown className="h-4 w-4 mr-1" />
                        Exportar Textos
                      </Button>
                    </>
                  )}
                  {result.mediaItems.length > 1 && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const allSelected = result.mediaItems.every((_, idx) => 
                            selectedItems[resultIndex]?.has(idx)
                          );
                          if (allSelected) {
                            setSelectedItems(prev => ({ ...prev, [resultIndex]: new Set() }));
                          } else {
                            setSelectedItems(prev => ({
                              ...prev,
                              [resultIndex]: new Set(result.mediaItems.map((_, idx) => idx))
                            }));
                          }
                        }}
                        className="font-medium rounded-2xl hover:bg-primary/10 transition-all"
                      >
                        {result.mediaItems.every((_, idx) => selectedItems[resultIndex]?.has(idx))
                          ? "Desmarcar Tudo"
                          : "Selecionar Tudo"}
                      </Button>
                      {selectedItems[resultIndex]?.size > 0 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => downloadSelected(result.mediaItems, resultIndex)}
                          className="font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Baixar Selecionados
                        </Button>
                      )}
                    </>
                  )}
                  <Button
                    size="sm"
                    onClick={() => downloadAll(result.mediaItems, resultIndex)}
                    className="font-semibold shadow-md hover:shadow-lg rounded-2xl transition-all"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Baixar {result.mediaItems.length > 1 ? "Tudo" : ""}
                  </Button>
                </div>
              </div>
              
              {/* Grid de Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.mediaItems.map((media, mediaIndex) => {
                  const isSelected = selectedItems[resultIndex]?.has(mediaIndex) || false;
                  const copyKey = `${resultIndex}-${mediaIndex}`;
                  const isCopied = copiedIndex === copyKey;
                  
                  return (
                    <motion.div
                      key={media.index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: mediaIndex * 0.05 }}
                      className="relative group bg-card rounded-2xl overflow-hidden border-2 border-border hover:border-primary/50 transition-all hover:shadow-xl"
                    >
                      {result.mediaItems.length > 1 && (
                        <div className="absolute top-3 left-3 z-10">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleItemSelection(resultIndex, mediaIndex)}
                            className="bg-background/90 border-2 shadow-md"
                          />
                        </div>
                      )}
                      
                      {/* Badge de numeração */}
                      <div className="absolute top-3 right-3 z-10">
                        <Badge 
                          variant="secondary" 
                          className="bg-primary text-primary-foreground backdrop-blur-sm font-bold text-sm px-3 py-1"
                        >
                          #{mediaIndex + 1}
                        </Badge>
                      </div>
                      
                      {/* Preview da Imagem/Vídeo/Áudio ou Ícone de Texto */}
                      {media.media_url ? (
                        <div className="relative bg-muted/50">
                           {media.is_audio ? (
                            <div className="aspect-square w-full flex flex-col items-center justify-center bg-background rounded-2xl p-6 gap-4">
                              <div className="flex items-center gap-3">
                                <Music className="h-8 w-8 text-foreground" />
                                <span className="text-sm font-medium text-foreground">Áudio</span>
                              </div>
                              { (previewUrls[`${resultIndex}-${mediaIndex}-${media.media_url}`] || media.media_url) && (
                                <audio
                                  src={previewUrls[`${resultIndex}-${mediaIndex}-${media.media_url}`] || media.media_url}
                                  controls
                                  className="w-full mt-2 rounded-lg"
                                />
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTranscribeAudio(media, resultIndex, mediaIndex)}
                                disabled={transcribingAudio[`${resultIndex}-${mediaIndex}`] || !!media.transcription || !!localTranscriptions[`${resultIndex}-${mediaIndex}`]}
                                className="mt-2"
                              >
                                {transcribingAudio[`${resultIndex}-${mediaIndex}`] ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Transcrevendo...
                                </>
                                ) : (media.transcription || localTranscriptions[`${resultIndex}-${mediaIndex}`]) ? (
                                  "Já transcrito"
                                ) : (
                                  "Transcrever Áudio"
                                )}
                              </Button>
                            </div>
                          ) : (previewUrls[`${resultIndex}-${mediaIndex}-${media.media_url}`] || media.media_url) ? (
                            media.is_video ? (
                              <div className="aspect-[9/16] max-h-[400px] w-full flex items-center justify-center bg-black rounded-t-2xl overflow-hidden">
                                <video
                                  src={previewUrls[`${resultIndex}-${mediaIndex}-${media.media_url}`] || media.media_url}
                                  className="w-full h-full object-contain"
                                  controls
                                  playsInline
                                />
                              </div>
                            ) : (
                              <div className="aspect-square w-full overflow-hidden">
                                <img
                                  src={previewUrls[`${resultIndex}-${mediaIndex}-${media.media_url}`] || media.media_url}
                                  alt={`Mídia ${mediaIndex + 1}`}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                              </div>
                            )
                          ) : (
                            <div className="aspect-square w-full flex items-center justify-center bg-muted animate-pulse">
                              <span className="text-xs text-muted-foreground font-medium">Carregando...</span>
                            </div>
                          )}
                        </div>
                      ) : media.content && (
                        <div className="aspect-square relative bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                          <div className="flex flex-col items-center gap-3 p-6">
                            <div className="bg-primary/20 rounded-full p-4">
                              <FileText className="h-8 w-8 text-primary" />
                            </div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Texto Extraído
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Seção de Texto Extraído */}
                      {media.content && (
                        <div className="p-4 bg-muted/30 border-t border-border">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                              Texto Extraído
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                              onClick={() => handleCopyText(media.content!, resultIndex, mediaIndex)}
                            >
                              {isCopied ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                              {media.content}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Seção de Transcrição de Áudio */}
                      {(media.transcription || localTranscriptions[`${resultIndex}-${mediaIndex}`]) && (
                        <div className="p-4 bg-muted/30 border-t border-border">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                              Transcrição
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                              onClick={() => {
                                const transcription = media.transcription || localTranscriptions[`${resultIndex}-${mediaIndex}`];
                                navigator.clipboard.writeText(transcription!);
                                toast.success("Transcrição copiada!", { duration: 2000 });
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                              {media.transcription || localTranscriptions[`${resultIndex}-${mediaIndex}`]}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Footer com botão de download */}
                      {media.media_url && (
                        <div className="p-4 bg-card flex items-center justify-center border-t border-border">
                          <Button
                            size="default"
                            className="w-full h-11 font-semibold rounded-xl shadow-md hover:shadow-lg transition-all gap-2"
                            onClick={() => handleSingleDownload(media, resultIndex, mediaIndex)}
                          >
                            <Download className="h-5 w-5" />
                            Baixar {media.is_audio ? "Áudio" : media.is_video ? "Vídeo" : "Imagem"}
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-4 text-center space-y-2">
              <Badge variant={result.status === "failed" ? "destructive" : "secondary"} className="font-semibold">
                {getStatusLabel(result.status)}
              </Badge>
              {result.errorMessage && (
                <p className="text-xs text-muted-foreground">{result.errorMessage}</p>
              )}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};
