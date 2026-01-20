"""
Cobalt API Client
Wrapper for interacting with Cobalt API for media downloads
"""
import requests
import logging
from typing import Optional, Dict, Any, Literal
from pathlib import Path
import tempfile

logger = logging.getLogger(__name__)

QualityType = Literal["max", "4320", "2160", "1440", "1080", "720", "480", "360", "240", "144"]
AudioFormatType = Literal["best", "mp3", "ogg", "wav", "opus"]
VideoCodecType = Literal["h264", "av1", "vp9"]
AudioBitrateType = Literal["320", "256", "128", "96", "64"]


class CobaltAPIError(Exception):
    """Base exception for Cobalt API errors"""
    pass


class CobaltRateLimitError(CobaltAPIError):
    """Raised when rate limit is exceeded"""
    pass


class CobaltClient:
    """
    Client for interacting with Cobalt API
    
    Cobalt API Documentation: https://github.com/imputnet/cobalt/blob/current/docs/api.md
    """
    
    def __init__(
        self,
        api_url: str = "https://api.cobalt.tools",
        api_key: Optional[str] = None,
        timeout: int = 60
    ):
        """
        Initialize Cobalt API client
        
        Args:
            api_url: Base URL for Cobalt API
            api_key: Optional API key for authenticated requests
            timeout: Request timeout in seconds
        """
        self.api_url = api_url.rstrip('/')
        self.api_key = api_key
        self.timeout = timeout
        self.session = requests.Session()
        
        # Set default headers
        self.session.headers.update({
            "Accept": "application/json",
            "Content-Type": "application/json",
        })
        
        if self.api_key:
            self.session.headers["Authorization"] = f"Api-Key {self.api_key}"
    
    def download(
        self,
        url: str,
        quality: QualityType = "max",
        audio_only: bool = False,
        audio_format: AudioFormatType = "best",
        video_codec: Optional[VideoCodecType] = None,
        audio_bitrate: Optional[AudioBitrateType] = None,
        filename_style: Literal["classic", "basic", "pretty", "nerdy"] = "classic",
        disable_metadata: bool = False,
    ) -> Dict[str, Any]:
        """
        Download media from URL using Cobalt API (current version)
        
        Note: Public Cobalt API may be blocked by YouTube. Consider self-hosting.
        
        Args:
            url: Media URL to download
            quality: Video quality (max, 4320, 2160, 1440, 1080, 720, 480, 360, 240, 144)
            audio_only: Extract audio only
            audio_format: Audio format (best, mp3, ogg, wav, opus)
            video_codec: Preferred video codec (h264, av1, vp9)
            audio_bitrate: Audio bitrate in kbps (320, 256, 128, 96, 64)
            filename_style: Filename pattern style
            disable_metadata: Remove file metadata
        
        Returns:
            Dict containing:
                - status: "stream" | "redirect" | "picker" | "error"
                - url: Direct download URL (for redirect/stream)
                - urls: List of URLs (for picker)
                - filename: Suggested filename
                - error: Error message (if status is error)
        
        Raises:
            CobaltRateLimitError: If rate limit is exceeded
            CobaltAPIError: For other API errors
        """
        # Current API uses root endpoint, not /api/json
        endpoint = f"{self.api_url}/"
        
        # Updated payload format for current API
        payload = {
            "url": url,
            "videoQuality": quality,
            "filenameStyle": filename_style,  # Correct field name per Cobalt API docs
            "downloadMode": "auto",
        }
        
        # Add optional parameters
        if audio_only:
            payload["isAudioOnly"] = True
            payload["audioFormat"] = audio_format
        
        if video_codec:
            payload["videoCodec"] = video_codec
        
        if audio_bitrate:
            payload["audioBitrate"] = audio_bitrate
        
        if disable_metadata:
            payload["disableMetadata"] = True
        
        try:
            logger.info(f"Cobalt API request: {url} (quality={quality}, audio_only={audio_only})")
            response = self.session.post(
                endpoint,
                json=payload,
                timeout=self.timeout
            )
            
            # Handle rate limiting
            if response.status_code == 429:
                retry_after = response.headers.get("Retry-After", "unknown")
                error_msg = f"Rate limit exceeded. Retry after: {retry_after}"
                logger.warning(error_msg)
                raise CobaltRateLimitError(error_msg)
            
            # Handle other errors
            if response.status_code != 200:
                error_msg = f"Cobalt API error: {response.status_code} - {response.text}"
                logger.error(error_msg)
                raise CobaltAPIError(error_msg)
            
            data = response.json()
            
            # Log the response status
            status = data.get("status", "unknown")
            logger.info(f"Cobalt response status: {status}")
            
            # Handle error status from Cobalt
            if status == "error":
                error_text = data.get("text", "Unknown error from Cobalt API")
                logger.error(f"Cobalt returned error: {error_text}")
                raise CobaltAPIError(f"Cobalt error: {error_text}")
            
            return data
            
        except requests.exceptions.Timeout:
            error_msg = f"Cobalt API timeout after {self.timeout}s"
            logger.error(error_msg)
            raise CobaltAPIError(error_msg)
        
        except requests.exceptions.RequestException as e:
            error_msg = f"Cobalt API request failed: {str(e)}"
            logger.error(error_msg)
            raise CobaltAPIError(error_msg)
    
    def download_to_file(
        self,
        url: str,
        output_dir: Optional[Path] = None,
        **kwargs
    ) -> Path:
        """
        Download media and save to file
        
        Args:
            url: Media URL to download
            output_dir: Directory to save file (default: temp directory)
            **kwargs: Additional arguments passed to download()
        
        Returns:
            Path to downloaded file
        
        Raises:
            CobaltAPIError: If download fails
        """
        # Get download info from Cobalt
        result = self.download(url, **kwargs)
        
        status = result.get("status")
        
        # Handle different response types
        if status == "redirect":
            # Direct download URL provided
            download_url = result.get("url")
            if not download_url:
                raise CobaltAPIError("No download URL in redirect response")
            
            return self._download_from_url(download_url, output_dir)
        
        elif status == "stream":
            # Cobalt will stream the file
            download_url = result.get("url")
            if not download_url:
                raise CobaltAPIError("No stream URL in response")
            
            return self._download_from_url(download_url, output_dir)
        
        elif status == "picker":
            # Multiple options available (e.g., Twitter/X with multiple videos)
            urls = result.get("picker", [])
            if not urls:
                raise CobaltAPIError("No URLs in picker response")
            
            # Download the first one (you can extend this to handle multiple)
            first_item = urls[0]
            download_url = first_item.get("url")
            if not download_url:
                raise CobaltAPIError("No URL in picker item")
            
            return self._download_from_url(download_url, output_dir)
        
        else:
            raise CobaltAPIError(f"Unexpected Cobalt status: {status}")
    
    def _download_from_url(
        self,
        url: str,
        output_dir: Optional[Path] = None
    ) -> Path:
        """
        Download file from direct URL
        
        Args:
            url: Direct download URL
            output_dir: Directory to save file
        
        Returns:
            Path to downloaded file
        """
        if output_dir is None:
            output_dir = Path(tempfile.gettempdir()) / "cobalt_downloads"
        
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Download the file
        response = self.session.get(url, stream=True, timeout=self.timeout)
        response.raise_for_status()
        
        # Try to get filename from Content-Disposition header
        filename = None
        content_disposition = response.headers.get("Content-Disposition", "")
        if "filename=" in content_disposition:
            filename = content_disposition.split("filename=")[-1].strip('"')
        
        # Fallback filename
        if not filename:
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            # Guess extension from content-type
            content_type = response.headers.get("Content-Type", "")
            ext = "mp4"
            if "audio" in content_type:
                ext = "mp3"
            elif "webm" in content_type:
                ext = "webm"
            filename = f"download_{timestamp}.{ext}"
        
        output_path = output_dir / filename
        
        # Write file
        with open(output_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        logger.info(f"Downloaded file to: {output_path}")
        return output_path
    
    def get_direct_url(self, url: str, **kwargs) -> Optional[str]:
        """
        Get direct download URL without downloading
        
        Args:
            url: Media URL
            **kwargs: Additional arguments passed to download()
        
        Returns:
            Direct download URL or None if not available
        """
        try:
            result = self.download(url, **kwargs)
            status = result.get("status")
            
            if status in ("redirect", "stream"):
                return result.get("url")
            
            elif status == "picker":
                urls = result.get("picker", [])
                if urls:
                    return urls[0].get("url")
            
            return None
            
        except CobaltAPIError as e:
            logger.error(f"Failed to get direct URL: {e}")
            return None
