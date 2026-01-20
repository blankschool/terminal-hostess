const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const API_KEY = import.meta.env.VITE_API_KEY || "";

const ensureLeadingSlash = (path: string) => {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
};

export const apiBaseUrl = API_BASE_URL;
export const apiKey = API_KEY;

export const buildApiUrl = (path: string) => `${API_BASE_URL}${ensureLeadingSlash(path)}`;

export const apiFetch = (path: string, init: RequestInit = {}, timeoutMs?: number) => {
  const headers = new Headers(init.headers || {});
  if (API_KEY) {
    headers.set("X-API-Key", API_KEY);
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "*/*");
  }

  // Create AbortController for timeout
  const controller = new AbortController();
  const signal = init.signal || controller.signal;
  
  // Set timeout if specified (default: no timeout for downloads)
  let timeoutId: number | undefined;
  if (timeoutMs) {
    timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  }

  return fetch(buildApiUrl(path), {
    ...init,
    headers,
    signal,
  }).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
};
