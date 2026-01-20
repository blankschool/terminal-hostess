/**
 * Utility functions for downloading media files
 */

/**
 * Triggers a browser download for a blob
 */
export const triggerBrowserDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Detects the platform from a URL
 */
export const detectPlatform = (url: string): 'instagram' | 'youtube' | 'tiktok' | 'twitter' | 'other' => {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('instagram.com')) return 'instagram';
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
  if (lowerUrl.includes('tiktok.com')) return 'tiktok';
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'twitter';
  
  return 'other';
};

/**
 * Checks if URL is an Instagram carousel/post (not reel/story)
 */
export const isCarouselUrl = (url: string): boolean => {
  return url.includes('instagram.com') && url.includes('/p/');
};

/**
 * Checks if URL is an Instagram reel
 */
export const isReelUrl = (url: string): boolean => {
  return url.includes('instagram.com') && url.includes('/reel/');
};

/**
 * Checks if URL is an Instagram story
 */
export const isStoryUrl = (url: string): boolean => {
  return url.includes('instagram.com') && url.includes('/stories/');
};

/**
 * Generates a filename from URL and platform
 */
export const generateFilename = (platform: string, index?: number): string => {
  const timestamp = Date.now();
  const suffix = index !== undefined ? `_${index + 1}` : '';
  return `${platform}_${timestamp}${suffix}`;
};

/**
 * Extracts filename from Content-Disposition header
 */
export const getFilenameFromResponse = (response: Response, fallback: string): string => {
  const disposition = response.headers.get('content-disposition');
  if (disposition) {
    const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match && match[1]) {
      return match[1].replace(/['"]/g, '');
    }
  }
  return fallback;
};

/**
 * Formats error message for display
 */
export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Ocorreu um erro desconhecido';
};

/**
 * Downloads a file from a URL directly (for Instagram direct URLs)
 */
export const downloadFromUrl = async (url: string, filename: string): Promise<void> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }
    const blob = await response.blob();
    triggerBrowserDownload(blob, filename);
  } catch (error) {
    throw new Error(`Download failed: ${formatErrorMessage(error)}`);
  }
};
