import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Link as LinkIcon,
  Moon,
  Sun,
  Video,
  Images,
  RefreshCcw,
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
    </div>
  );
}
