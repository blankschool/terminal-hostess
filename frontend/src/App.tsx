import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Link as LinkIcon,
  Moon,
  Sun,
  Video,
  Images,
  RefreshCcw,
  FileAudio,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type PreviewState =
  | { kind: "none" }
  | { kind: "image"; url: string }
  | { kind: "video"; url: string }
  | { kind: "gallery"; urls: string[] };

type Tool = "yt-dlp" | "gallery-dl";
type Format = "mp4" | "webm" | "best";
type AudioFormat = "mp3" | "m4a" | "wav";

const STORAGE_KEYS = {
  base: "bridge:api-base",
  apiKey: "bridge:api-key",
  url: "bridge:last-url",
  tool: "bridge:last-tool",
  format: "bridge:last-format",
  theme: "bridge:theme",
};

const DEFAULT_API_KEY = import.meta.env.VITE_API_KEY || "";

async function readError(response: Response) {
  const ct = response.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      const data = await response.json();
      return data.detail || JSON.stringify(data);
    }
    return await response.text();
  } catch {
    return `Erro ${response.status}`;
  }
}

function useTheme() {
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.theme) || "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    const isLight = theme === "light";
    root.classList.toggle("theme-light", isLight);
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  const toggle = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));
  return { theme, toggle };
}

export default function App() {
  const [baseUrl, setBaseUrl] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.base) || window.location.origin;
  });
  const [apiKey] = useState(() => DEFAULT_API_KEY);
  const [targetUrl, setTargetUrl] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.url) || "";
  });
  const [tool, setTool] = useState<Tool>(() => {
    return (localStorage.getItem(STORAGE_KEYS.tool) as Tool) || "yt-dlp";
  });
  const [format, setFormat] = useState<Format>(() => {
    return (localStorage.getItem(STORAGE_KEYS.format) as Format) || "mp4";
  });
  const [quality, setQuality] = useState("best");
  const [preview, setPreview] = useState<PreviewState>({ kind: "none" });
  const [jsonResult, setJsonResult] = useState<any>({ status: "aguardando" });
  const [meta, setMeta] = useState<string[]>(["Sem chamadas ainda."]);
  const [galleryLinks, setGalleryLinks] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>("Pronto");
  const [statusTone, setStatusTone] = useState<"ok" | "warn" | "error" | "info">(
    "info"
  );
  const [audioUrl, setAudioUrl] = useState(() => targetUrl || "");
  const [audioFormat, setAudioFormat] = useState<AudioFormat>("mp3");
  const [audioResult, setAudioResult] = useState<{ url: string; meta: string } | null>(
    null
  );
  const [audioStatus, setAudioStatus] = useState("Pronto");
  const [transcribeUrl, setTranscribeUrl] = useState(() => targetUrl || "");
  const [transcribeFormat, setTranscribeFormat] = useState<AudioFormat>("mp3");
  const [transcribeLang, setTranscribeLang] = useState("pt");
  const [transcript, setTranscript] = useState("");
  const [transcribeStatus, setTranscribeStatus] = useState("Pronto");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageText, setImageText] = useState("");
  const [imageStatus, setImageStatus] = useState("Pronto");
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.base, baseUrl);
  }, [baseUrl]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.url, targetUrl);
  }, [targetUrl]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.tool, tool);
  }, [tool]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.format, format);
  }, [format]);
  useEffect(() => {
    if (targetUrl && !audioUrl) setAudioUrl(targetUrl);
    if (targetUrl && !transcribeUrl) setTranscribeUrl(targetUrl);
  }, [targetUrl, audioUrl, transcribeUrl]);
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const isGallery = tool === "gallery-dl";

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({
        url: targetUrl,
        tool,
        format,
      });
      const res = await fetch(
        `${baseUrl.replace(/\/$/, "")}/download/binary?${params.toString()}`,
        {
          method: "POST",
          headers: {
            "X-API-Key": apiKey,
          },
        }
      );
      if (!res.ok) {
        const errText = await readError(res);
        throw new Error(errText);
      }
      const ct = res.headers.get("content-type") || "application/octet-stream";
      const buffer = await res.arrayBuffer();
      const blob = new Blob([buffer], { type: ct });
      const fileUrl = URL.createObjectURL(blob);
      const fileSize = res.headers.get("x-file-size");
      const toolUsed = res.headers.get("x-tool-used") || tool;
      const formatUsed = res.headers.get("x-format") || format;

      return {
        blob,
        url: fileUrl,
        contentType: ct,
        meta: { fileSize, toolUsed, formatUsed, sizeBytes: buffer.byteLength },
      };
    },
    onSuccess: (payload) => {
      const isImage = payload.contentType.startsWith("image/");
      const isVideo = payload.contentType.startsWith("video/");
      setPreview(
        isImage
          ? { kind: "image", url: payload.url }
          : { kind: "video", url: payload.url }
      );
      setStatus("Arquivo pronto", "ok");
      setGalleryLinks([]);
      setJsonResult({
        success: true,
        message: "Arquivo pronto",
        headers: payload.meta,
      });
      setMeta([
        `Ferramenta: ${payload.meta.toolUsed}`,
        `Formato: ${payload.meta.formatUsed}`,
        `Tamanho: ${payload.meta.fileSize || `${payload.meta.sizeBytes} bytes`}`,
      ]);
    },
    onError: (err: Error) => {
      setPreview({ kind: "none" });
      setStatus(`Falha: ${err.message}`, "error");
      setJsonResult({ error: err.message });
      setGalleryLinks([]);
    },
  });

  const galleryMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `${baseUrl.replace(/\/$/, "")}/download/gallery/urls`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          body: JSON.stringify({
            url: targetUrl,
            tool,
            format,
            quality,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.detail ||
          (Array.isArray(data) && data[0]?.msg) ||
          JSON.stringify(data) ||
          `Erro ${res.status}`;
        throw new Error(msg);
      }
      return data;
    },
    onSuccess: (data) => {
      const urls: string[] = data.direct_urls || [];
      setGalleryLinks(urls);
      setPreview(urls.length ? { kind: "gallery", urls } : { kind: "none" });
      setStatus(`Links obtidos (${urls.length})`, "ok");
      setJsonResult(data);
      setMeta([
        `Ferramenta: ${tool}`,
        `Total de links: ${urls.length}`,
        `URL base: ${targetUrl}`,
      ]);
    },
    onError: (err: Error) => {
      setStatus(`Falha: ${err.message}`, "error");
      setJsonResult({ error: err.message });
      setGalleryLinks([]);
      setPreview({ kind: "none" });
    },
  });

  const audioMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `${baseUrl.replace(/\/$/, "")}/audio/extract`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          body: JSON.stringify({
            url: audioUrl,
            format: audioFormat,
          }),
        }
      );
      if (!res.ok) {
        const errText = await readError(res);
        throw new Error(errText);
      }
      const ct = res.headers.get("content-type") || "audio/mpeg";
      const buffer = await res.arrayBuffer();
      const blob = new Blob([buffer], { type: ct });
      const url = URL.createObjectURL(blob);
      const meta = `Formato: ${res.headers.get("x-format") || audioFormat} · Tamanho: ${
        res.headers.get("x-file-size") || `${buffer.byteLength} bytes`
      }`;
      return { url, meta, contentType: ct };
    },
    onSuccess: (payload) => {
      setAudioResult({ url: payload.url, meta: payload.meta });
      setAudioStatus("Áudio pronto para download");
    },
    onError: (err: Error) => {
      setAudioStatus(`Falha: ${err.message}`);
      setAudioResult(null);
    },
  });

  const transcribeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `${baseUrl.replace(/\/$/, "")}/transcribe/video`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          body: JSON.stringify({
            url: transcribeUrl,
            format: transcribeFormat,
            language: transcribeLang || undefined,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.detail ||
          data?.message ||
          (Array.isArray(data) && data[0]?.msg) ||
          `Erro ${res.status}`;
        throw new Error(msg);
      }
      return data;
    },
    onSuccess: (data) => {
      setTranscript(data.transcript || data.text || "");
      setTranscribeStatus("Transcrição pronta");
    },
    onError: (err: Error) => {
      setTranscribeStatus(`Falha: ${err.message}`);
      setTranscript("");
    },
  });

  const imageMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      if (imagePrompt.trim()) {
        form.append("prompt", imagePrompt.trim());
      }
      const res = await fetch(
        `${baseUrl.replace(/\/$/, "")}/transcribe/image`,
        {
          method: "POST",
          headers: {
            "X-API-Key": apiKey,
          },
          body: form,
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.detail ||
          data?.message ||
          (Array.isArray(data) && data[0]?.msg) ||
          `Erro ${res.status}`;
        throw new Error(msg);
      }
      return data;
    },
    onSuccess: (data) => {
      setImageText(data.text || "");
      setImageStatus("Texto extraído");
    },
    onError: (err: Error) => {
      setImageStatus(`Falha: ${err.message}`);
      setImageText("");
    },
  });

  function handleDownload() {
    if (!targetUrl.trim()) {
      setStatus("Informe a URL", "warn");
      return;
    }
    if (isGallery) {
      galleryMutation.mutate();
    } else {
      downloadMutation.mutate();
    }
  }

  function setStatus(message: string, tone: "ok" | "warn" | "error" | "info") {
    setStatusMsg(message);
    setStatusTone(tone);
  }

  function handleAudioExtract() {
    if (!audioUrl.trim()) {
      setAudioStatus("Informe a URL");
      return;
    }
    setAudioStatus("Processando...");
    setAudioResult(null);
    audioMutation.mutate();
  }

  function handleTranscribeVideo() {
    if (!transcribeUrl.trim()) {
      setTranscribeStatus("Informe a URL");
      return;
    }
    setTranscribeStatus("Processando...");
    setTranscript("");
    transcribeMutation.mutate();
  }

  function handleImageFileChange(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    const file = fileList[0];
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleTranscribeImage() {
    if (!imageFile) {
      setImageStatus("Envie uma imagem");
      return;
    }
    setImageStatus("Processando...");
    setImageText("");
    imageMutation.mutate(imageFile);
  }

  const toneClasses = useMemo(
    () =>
      ({
        ok: "bg-primary/20 text-primary",
        warn: "bg-amber-200/40 text-amber-900 dark:text-amber-200",
        error: "bg-red-200/40 text-red-900 dark:text-red-100",
        info: "bg-secondary/60 text-muted-foreground",
      } as const),
    []
  );

  const isLoading = downloadMutation.isPending || galleryMutation.isPending;

  return (
    <div className="container py-6 flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            savedown
          </p>
          <h1 className="text-2xl font-bold leading-tight">Download em um passo</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Cole a URL, escolha vídeo ou galeria e clique em baixar.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="gap-2"
            title="Alternar tema"
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            {theme === "light" ? "Tema escuro" : "Tema claro"}
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="card-muted">
          <CardHeader>
            <CardTitle>Chamada</CardTitle>
            <CardDescription className="text-muted-foreground/80">
              Informe link, ferramenta e formato.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                URL do conteúdo
              </label>
              <div className="flex gap-2">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-secondary/60 text-muted-foreground border border-border">
                  <LinkIcon size={16} />
                </span>
                <input
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Ferramenta</label>
                <select
                  value={tool}
                  onChange={(e) => setTool(e.target.value as Tool)}
                  className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="yt-dlp">yt-dlp (vídeo)</option>
                  <option value="gallery-dl">gallery-dl (galeria)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Formato</label>
                <select
                  value={isGallery ? "best" : format}
                  onChange={(e) => setFormat(e.target.value as Format)}
                  disabled={isGallery}
                  className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                >
                  <option value="mp4">mp4</option>
                  <option value="webm">webm</option>
                  <option value="best">best</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Qualidade</label>
              <input
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                placeholder="best"
                className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                className="gap-2"
                onClick={handleDownload}
                disabled={isLoading}
              >
                {isGallery ? <Images size={16} /> : <Download size={16} />}
                {isGallery ? "Listar galeria" : "Baixar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Resposta e prévia</CardTitle>
                <CardDescription>
                  Veja o blob retornado, links e JSON da chamada.
                </CardDescription>
              </div>
              <div
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold",
                  toneClasses[statusTone]
                )}
              >
                {statusMsg}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="preview">
                <TabsList>
                  <TabsTrigger value="preview">
                    <Video size={16} className="mr-2" />
                    Prévia
                  </TabsTrigger>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                  <TabsTrigger value="links">Links</TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="space-y-3">
                  <div className="rounded-xl border border-border bg-secondary/40 p-3 min-h-[240px]">
                    {preview.kind === "image" && (
                      <img
                        src={preview.url}
                        alt="preview"
                        className="w-full max-h-[420px] object-contain rounded-lg"
                      />
                    )}
                    {preview.kind === "video" && (
                      <video
                        controls
                        className="w-full max-h-[420px] rounded-lg bg-black"
                        src={preview.url}
                      />
                    )}
                    {preview.kind === "gallery" && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {preview.urls.map((u, i) => (
                          <div
                            key={u + i}
                            className="rounded-lg border border-border bg-secondary/40 p-2 flex flex-col gap-2"
                          >
                            <img
                              src={u}
                              alt={`item-${i + 1}`}
                              className="w-full h-32 object-cover rounded-md"
                              loading="lazy"
                            />
                            <Button asChild variant="outline" size="sm">
                              <a href={u} download target="_blank" rel="noreferrer">
                                Download {i + 1}
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {preview.kind === "none" && (
                      <div className="h-32 flex items-center justify-center text-muted-foreground">
                        Sem preview ainda.
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="json">
                  <div className="rounded-xl border border-border bg-secondary/40 p-3 overflow-auto max-h-[320px] text-xs">
                    <pre>{JSON.stringify(jsonResult, null, 2)}</pre>
                  </div>
                </TabsContent>

                <TabsContent value="links">
                  <div className="space-y-3">
                    {galleryLinks.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Nenhum link retornado.
                      </p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {galleryLinks.map((u, idx) => (
                        <div
                          key={u + idx}
                          className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-2"
                        >
                          <span className="text-xs text-muted-foreground w-8">
                            #{idx + 1}
                          </span>
                          <a
                            href={u}
                            className="text-sm text-accent underline underline-offset-2 break-all"
                            target="_blank"
                            rel="noreferrer"
                            download
                          >
                            {u}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {meta.map((item) => (
                  <span
                    key={item}
                    className="px-3 py-1 rounded-full border border-border bg-secondary/40"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border border-primary/40">
        <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Áudio e transcrição</CardTitle>
            <CardDescription className="text-muted-foreground/90">
              Extraia áudio de vídeos, transcreva vídeo/áudio e transforme imagens em texto.
            </CardDescription>
          </div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            Usa a mesma base e API Key das chamadas principais.
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <section className="rounded-xl border border-border bg-secondary/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <FileAudio size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Extrair áudio de vídeo</p>
                  <p className="text-xs text-muted-foreground">
                    Baixa só o áudio via yt-dlp.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">URL</label>
                <input
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  spellCheck={false}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Formato do áudio</label>
                <select
                  value={audioFormat}
                  onChange={(e) => setAudioFormat(e.target.value as AudioFormat)}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="mp3">mp3</option>
                  <option value="m4a">m4a</option>
                  <option value="wav">wav</option>
                </select>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {audioMutation.isPending && (
                  <RefreshCcw size={14} className="animate-spin" />
                )}
                <span>{audioStatus}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                  onClick={handleAudioExtract}
                  disabled={audioMutation.isPending}
                >
                  <FileAudio size={16} />
                  Extrair áudio
                </Button>
                {audioResult && (
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <a href={audioResult.url} download>
                      Download
                    </a>
                  </Button>
                )}
              </div>
              {audioResult && (
                <p className="text-xs text-muted-foreground">{audioResult.meta}</p>
              )}
            </section>

            <section className="rounded-xl border border-border bg-secondary/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <FileText size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Transcrever vídeo</p>
                  <p className="text-xs text-muted-foreground">
                    Baixa o áudio e envia para Whisper.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">URL</label>
                <input
                  value={transcribeUrl}
                  onChange={(e) => setTranscribeUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  spellCheck={false}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Formato</label>
                  <select
                    value={transcribeFormat}
                    onChange={(e) =>
                      setTranscribeFormat(e.target.value as AudioFormat)
                    }
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="mp3">mp3</option>
                    <option value="m4a">m4a</option>
                    <option value="wav">wav</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Idioma (opcional)</label>
                  <input
                    value={transcribeLang}
                    onChange={(e) => setTranscribeLang(e.target.value)}
                    placeholder="pt"
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {transcribeMutation.isPending && (
                  <RefreshCcw size={14} className="animate-spin" />
                )}
                <span>{transcribeStatus}</span>
              </div>
              <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={handleTranscribeVideo}
                disabled={transcribeMutation.isPending}
              >
                <FileText size={16} />
                Transcrever vídeo
              </Button>
              <div className="rounded-lg border border-border bg-background/60 p-2 text-xs min-h-[80px] max-h-[200px] overflow-auto">
                {transcript ? (
                  <p className="whitespace-pre-wrap">{transcript}</p>
                ) : (
                  <p className="text-muted-foreground">Transcrição aparecerá aqui.</p>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-secondary/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <ImageIcon size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Transcrever imagem</p>
                  <p className="text-xs text-muted-foreground">
                    Extrai texto legível de fotos ou prints.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Imagem</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageFileChange(e.target.files)}
                  className="w-full text-sm"
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="rounded-lg border border-border max-h-32 object-contain mt-2"
                  />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Prompt (opcional)</label>
                <input
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Extraia todo o texto..."
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {imageMutation.isPending && (
                  <RefreshCcw size={14} className="animate-spin" />
                )}
                <span>{imageStatus}</span>
              </div>
              <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={handleTranscribeImage}
                disabled={imageMutation.isPending}
              >
                <ImageIcon size={16} />
                Transcrever imagem
              </Button>
              <div className="rounded-lg border border-border bg-background/60 p-2 text-xs min-h-[80px] max-h-[200px] overflow-auto">
                {imageText ? (
                  <p className="whitespace-pre-wrap">{imageText}</p>
                ) : (
                  <p className="text-muted-foreground">
                    O texto extraído será exibido aqui.
                  </p>
                )}
              </div>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
